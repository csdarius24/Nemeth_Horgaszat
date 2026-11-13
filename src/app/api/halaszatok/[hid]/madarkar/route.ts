import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import { ellenorizMadarkar, modosithatjaMadarkar, naploLeiras, osszesitMadarkar } from "@/lib/madarkar/madarkar";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/**
 * GET /api/halaszatok/[hid]/madarkar — madárkár-események + összesítés. STAFF+.
 * Query: toId, from, to (ISO dátum), limit (alap 200, max 500).
 * Az összesítés a szűrésnek megfelelő eseményekre vonatkozik.
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const toId = szam(url.searchParams.get("toId") ?? "0", 0);
    const limit = Math.min(Math.max(szam(url.searchParams.get("limit") ?? "200", 200), 1), 500);

    let tol: Date | null = null;
    let ig: Date | null = null;
    for (const [nev, set] of [["from", (d: Date) => (tol = d)], ["to", (d: Date) => (ig = d)]] as const) {
        const v = url.searchParams.get(nev);
        if (!v) continue;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return jsonError(`Érvénytelen ${nev} paraméter.`);
        set(d);
    }

    const nyersek = await prisma.madarkarEsemeny.findMany({
        where: {
            halaszatId,
            ...(toId ? { toId } : {}),
            ...(tol || ig ? { datum: { ...(tol ? { gte: tol } : {}), ...(ig ? { lt: ig } : {}) } } : {}),
        },
        orderBy: [{ datum: "desc" }, { azonosito: "desc" }],
        take: limit,
        select: {
            azonosito: true, datum: true, madarfaj: true, egyedszam: true, halvesztesegKg: true,
            karFt: true, megjegyzes: true, rogzitoFelhasznaloId: true, letrehozva: true,
            to: { select: { azonosito: true, nev: true } },
            rogzito: { select: { nev: true, email: true } },
            fotok: { select: { azonosito: true, szelesseg: true, magassag: true }, orderBy: { azonosito: "asc" } },
        },
    });

    const esemenyek = nyersek.map((e) => ({
        id: e.azonosito,
        datum: e.datum.toISOString(),
        toId: e.to.azonosito,
        toNev: e.to.nev,
        madarfaj: e.madarfaj,
        egyedszam: e.egyedszam,
        halvesztesegKg: e.halvesztesegKg == null ? null : Number(e.halvesztesegKg),
        karFt: e.karFt,
        megjegyzes: e.megjegyzes,
        rogzitoNev: rogzitoMegjelenites(e.rogzito),
        letrehozva: e.letrehozva.toISOString(),
        fotok: e.fotok.map((f) => ({ id: f.azonosito, szelesseg: f.szelesseg, magassag: f.magassag })),
        modosithato: modosithatjaMadarkar(auth.role, e.rogzitoFelhasznaloId, auth.user.azonosito),
    }));

    return NextResponse.json({
        esemenyek,
        osszesites: osszesitMadarkar(esemenyek),
        viewerRole: auth.role,
    });
}

/**
 * POST /api/halaszatok/[hid]/madarkar — új madárkár-esemény. STAFF+ (bármely tag).
 * A rögzítő a sessionből; a tó tenant-ellenőrzött; naplóbejegyzés (MADARKAR) ugyanabban a tranzakcióban.
 * A fényképek külön kérésben: POST .../madarkar/[id]/fotok.
 */
export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);
    const r = ellenorizMadarkar(body);
    if (!r.ok) return jsonError(r.hiba);
    const a = r.adat;

    const to = await prisma.to.findFirst({ where: { azonosito: a.toId, halaszatId }, select: { azonosito: true, nev: true } });
    if (!to) return jsonError("A tóegység nem ehhez a halászathoz tartozik.", 404);

    const esemeny = await prisma.$transaction(async (tx) => {
        const e = await tx.madarkarEsemeny.create({
            data: {
                halaszatId,
                toId: a.toId,
                datum: a.datum,
                madarfaj: a.madarfaj,
                egyedszam: a.egyedszam,
                halvesztesegKg: a.halvesztesegKg,
                karFt: a.karFt,
                megjegyzes: a.megjegyzes,
                rogzitoFelhasznaloId: auth.user.azonosito,
            },
            select: { azonosito: true },
        });

        await tx.naploEsemeny.create({
            data: {
                tipus: "MADARKAR",
                toId: a.toId,
                halaszatId,
                datum: a.datum,
                mennyisegKg: a.halvesztesegKg,
                cim: `Madárkár — ${a.madarfaj}`,
                leiras: naploLeiras(a),
                felhasznaloId: auth.user.azonosito,
                kapcsolodoEntitasTipus: "MadarkarEsemeny",
                kapcsolodoEntitasId: e.azonosito,
                reszletekJson: { madarfaj: a.madarfaj, egyedszam: a.egyedszam, halvesztesegKg: a.halvesztesegKg, karFt: a.karFt },
            },
        });

        return e;
    });

    return NextResponse.json({ id: esemeny.azonosito }, { status: 201 });
}
