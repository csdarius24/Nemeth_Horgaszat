import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    esemenyCim,
    esemenyTipusCimke,
    ervenyesEsemenyTipus,
    htmlEscape,
    naploOsszegzes,
    periodusCimke,
    periodusHatarok,
    type NaploPeriodus,
} from "@/lib/naplo/format";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

function fmtDatum(d: Date): string {
    return d.toLocaleString("hu-HU", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });
}

/**
 * GET /api/halaszatok/[hid]/naplo/export — Halászati napló dokumentum-export.
 *
 * Query: period=day|week|month (kötelező, alap: day), date=YYYY-MM-DD (alap: ma),
 *        toId?, tipus?, format=html (a közvetlen PDF még nincs — a HTML
 *        nyomtatóbarát, a böngésző "Nyomtatás → PDF mentés" útvonalával menthető).
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") ?? "html").toLowerCase();
    if (format !== "html") {
        return jsonError(
            "Kozvetlen PDF export meg nincs — hasznald a format=html nezetet, es a bongeszo Nyomtatas / PDF mentes funkciojat.",
            400
        );
    }

    const period = (url.searchParams.get("period") ?? "day") as NaploPeriodus;
    const dateParam = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const hatarok = periodusHatarok(period, dateParam);
    if (!hatarok) return jsonError("Ervenytelen period/date parameter.", 400);

    const toIdParam = szam(url.searchParams.get("toId") ?? "0", 0);
    const tipusParam = (url.searchParams.get("tipus") ?? "").trim();
    if (tipusParam && !ervenyesEsemenyTipus(tipusParam)) {
        return jsonError("Ervenytelen esemenytipus.", 400);
    }

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { nev: true },
    });
    if (!halaszat) return jsonError("A halaszat nem talalhato.", 404);

    const tenantScope = { OR: [{ halaszatId }, { to: { halaszatId } }] };
    const nyersek = await prisma.naploEsemeny.findMany({
        where: {
            AND: [
                tenantScope,
                { datum: { gte: hatarok.tol, lt: hatarok.ig } },
                ...(toIdParam ? [{ toId: toIdParam }] : []),
                ...(tipusParam ? [{ tipus: tipusParam as never }] : []),
            ],
        },
        orderBy: { datum: "asc" },
        take: 2000,
        select: {
            tipus: true, datum: true, cim: true, leiras: true,
            darab: true, mennyisegKg: true, ervenyes: true,
            ervenytelenitesOka: true,
            to: { select: { nev: true } },
            halfaj: { select: { nev: true } },
            felhasznalo: { select: { nev: true, email: true } },
            ervenytelenito: { select: { nev: true, email: true } },
            reszletekJson: true,
        },
    });

    const esemenyek = nyersek.map((e) => ({
        tipus: e.tipus,
        datum: e.datum,
        cim: esemenyCim({ tipus: e.tipus, cim: e.cim, toNev: e.to?.nev ?? null, halfajNev: e.halfaj?.nev ?? null }),
        leiras: e.leiras,
        darab: e.darab,
        mennyisegKg: e.mennyisegKg == null ? null : Number(e.mennyisegKg),
        toNev: e.to?.nev ?? null,
        halfajNev: e.halfaj?.nev ?? null,
        rogzitoNev: rogzitoMegjelenites(e.felhasznalo),
        ervenyes: e.ervenyes,
        ervenytelenitesOka: e.ervenytelenitesOka,
        ervenytelenitoNev: rogzitoMegjelenites(e.ervenytelenito),
        takarmanyNev: (e.reszletekJson as any)?.takarmanyNev ?? null,
    }));

    const osszegzes = naploOsszegzes(esemenyek);
    const generalta = rogzitoMegjelenites({ nev: auth.user.nev, email: auth.user.email }) ?? "ismeretlen";
    const most = new Date();

    const szurok: string[] = [];
    if (toIdParam) {
        const szuroTo = esemenyek.find((e) => e.toNev)?.toNev;
        szurok.push(`Vízegység: ${szuroTo ?? `#${toIdParam}`}`);
    }
    if (tipusParam) szurok.push(`Típus: ${esemenyTipusCimke(tipusParam)}`);
    if (szurok.length === 0) szurok.push("nincs (teljes napló)");

    const sorok = esemenyek.map((e) => `
        <tr${e.ervenyes ? "" : ' class="ervenytelen"'}>
            <td>${htmlEscape(fmtDatum(e.datum))}</td>
            <td><span class="badge">${htmlEscape(esemenyTipusCimke(e.tipus))}</span></td>
            <td>${htmlEscape(e.toNev ?? "—")}</td>
            <td>${htmlEscape(e.halfajNev ?? e.takarmanyNev ?? "—")}</td>
            <td class="num">${e.mennyisegKg != null ? htmlEscape(`${e.mennyisegKg} kg`) : e.darab != null ? htmlEscape(`${e.darab} db`) : "—"}</td>
            <td>${htmlEscape(e.rogzitoNev ?? "—")}</td>
            <td class="reszlet">${htmlEscape(e.leiras ?? "—")}${e.ervenyes ? "" : `<div class="ervtel-jelzes"><strong>ÉRVÉNYTELENÍTVE</strong>${e.ervenytelenitesOka ? ` — ${htmlEscape(e.ervenytelenitesOka)}` : ""}${e.ervenytelenitoNev ? ` (${htmlEscape(e.ervenytelenitoNev)})` : ""}</div>`}</td>
        </tr>`).join("");

    const osszegzesSorok = osszegzes.tipusonkent
        .map((t) => `<li>${htmlEscape(t.cimke)}: <strong>${t.darab} db</strong></li>`)
        .join("");

    const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<title>Halászati napló — ${htmlEscape(halaszat.nev)}</title>
<style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 4px; }
    .box { border: 1px solid #ccc; border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
    .box h2 { font-size: 15px; margin: 0 0 8px; }
    ul { margin: 6px 0; padding-left: 20px; }
    li { font-size: 13px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f0ede8; }
    td.num { text-align: right; white-space: nowrap; }
    td.reszlet { max-width: 320px; }
    .badge { border: 1px solid #999; border-radius: 4px; padding: 1px 6px; font-size: 11px; white-space: nowrap; }
    .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 18px; font-size: 14px;
                 background: #7a2a17; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .ures { color: #777; font-style: italic; margin: 24px 0; }
    tr.ervenytelen td { color: #888; text-decoration: line-through; background: #f7f7f7; }
    tr.ervenytelen .ervtel-jelzes { text-decoration: none; color: #a33; font-size: 11px; margin-top: 3px; }
    footer { margin-top: 24px; font-size: 11px; color: #777; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { .print-btn { display: none; } body { margin: 12px; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Nyomtatás / PDF mentés</button>

<h1>Halászati napló</h1>
<div class="meta"><strong>${htmlEscape(halaszat.nev)}</strong></div>
<div class="meta">${htmlEscape(periodusCimke(period, hatarok))}</div>
<div class="meta">Generálva: ${htmlEscape(fmtDatum(most))} (UTC) &bull; Generálta: ${htmlEscape(generalta)}</div>
<div class="meta">Szűrők: ${htmlEscape(szurok.join(" · "))}</div>

<div class="box">
    <h2>Összegzés (${osszegzes.osszesEsemeny} érvényes esemény)</h2>
    ${osszegzes.ervenytelenDarab > 0
        ? `<div class="meta"><strong>${osszegzes.ervenytelenDarab} érvénytelenített</strong> bejegyzés a listában szerepel (áthúzva), de az összegekbe NEM számít bele.</div>`
        : ""}
    <ul>${osszegzesSorok || "<li>Nincs esemény az időszakban.</li>"}</ul>
    <ul>
        <li>Etetés összesen: <strong>${osszegzes.etetesKg} kg</strong></li>
        <li>Telepítés összesen: <strong>${osszegzes.telepitesDarab} db</strong></li>
        <li>Kivét összesen: <strong>${osszegzes.kivetelDarab} db</strong></li>
        <li>Takarmány-bevétel: <strong>${osszegzes.takarmanyBevetelKg} kg</strong></li>
        <li>Takarmány-felhasználás: <strong>${osszegzes.takarmanyFelhasznalasKg} kg</strong></li>
    </ul>
</div>

${esemenyek.length === 0
        ? `<div class="ures">Az időszakban nincs naplózott esemény.</div>`
        : `<table>
    <thead>
        <tr><th>Időpont</th><th>Típus</th><th>Vízegység</th><th>Faj / takarmány</th><th>Mennyiség</th><th>Rögzítette</th><th>Részletek</th></tr>
    </thead>
    <tbody>${sorok}
    </tbody>
</table>`}

<footer>
    Németh Horgászat — halászati műveleti napló. A dokumentum a rögzített naplóeseményekből készült;
    a „Rögzítette" a bejelentkezett felhasználóból származik. A mennyiségi összegek kerekítettek.
    Az érvénytelenített bejegyzések áthúzva, indokkal szerepelnek, és nem számítanak bele az összegekbe
    (naplósor fizikailag nem törölhető).
</footer>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
