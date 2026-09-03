import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    canManageFeladat,
    ervenyesStatusz,
    ervenyesPrioritas,
    normalizaltSzin,
    lejart,
    nyitottStatusz,
} from "@/lib/feladatok/format";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/**
 * GET /api/halaszatok/[hid]/feladatok — feladatok listája. STAFF+; tenant-izolált.
 * Query: statusz, felelosFelhasznaloId, toId, q, from, to (ISO), limit (alap 100, max 200).
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
    const q = (url.searchParams.get("q") ?? "").trim();
    const statuszParam = (url.searchParams.get("statusz") ?? "").trim();
    const felelosParam = szam(url.searchParams.get("felelosFelhasznaloId") ?? "0", 0);
    const toIdParam = szam(url.searchParams.get("toId") ?? "0", 0);
    const limit = Math.min(Math.max(szam(url.searchParams.get("limit") ?? "100", 100), 1), 200);

    if (statuszParam && !ervenyesStatusz(statuszParam)) return jsonError("Ervenytelen statusz.", 400);

    let tol: Date | null = null;
    let ig: Date | null = null;
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    if (fromParam) { const d = new Date(fromParam); if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen from.", 400); tol = d; }
    if (toParam) { const d = new Date(toParam); if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen to.", 400); ig = d; }

    const where = {
        halaszatId,
        ...(statuszParam ? { statusz: statuszParam as never } : {}),
        ...(felelosParam ? { felelosFelhasznaloId: felelosParam } : {}),
        ...(toIdParam ? { toId: toIdParam } : {}),
        ...(tol || ig ? { hatarido: { ...(tol ? { gte: tol } : {}), ...(ig ? { lt: ig } : {}) } } : {}),
        ...(q ? { OR: [{ cim: { contains: q } }, { leiras: { contains: q } }] } : {}),
    };

    const nyersek = await prisma.feladat.findMany({
        where,
        orderBy: [{ statusz: "asc" }, { hatarido: "asc" }, { letrehozva: "desc" }],
        take: limit,
        select: {
            azonosito: true, cim: true, leiras: true, statusz: true, prioritas: true,
            szin: true, hatarido: true, elkeszultAt: true, letrehozva: true,
            felelosFelhasznaloId: true,
            to: { select: { azonosito: true, nev: true } },
            felelosFelhasznalo: { select: { nev: true, email: true } },
            letrehozoFelhasznalo: { select: { nev: true, email: true } },
        },
    });

    const most = new Date();
    const feladatok = nyersek.map(({ to, felelosFelhasznalo, letrehozoFelhasznalo, ...f }) => ({
        id: f.azonosito,
        cim: f.cim,
        leiras: f.leiras,
        statusz: f.statusz,
        prioritas: f.prioritas,
        szin: f.szin,
        hatarido: f.hatarido?.toISOString() ?? null,
        elkeszultAt: f.elkeszultAt?.toISOString() ?? null,
        letrehozva: f.letrehozva.toISOString(),
        lejart: lejart(f.hatarido, f.statusz, most),
        toId: to?.azonosito ?? null,
        toNev: to?.nev ?? null,
        felelosFelhasznaloId: f.felelosFelhasznaloId,
        felelosNev: rogzitoMegjelenites(felelosFelhasznalo),
        letrehozoNev: rogzitoMegjelenites(letrehozoFelhasznalo),
    }));

    return NextResponse.json({
        feladatok,
        osszesen: feladatok.length,
        nyitottDb: feladatok.filter((f) => nyitottStatusz(f.statusz)).length,
        viewerRole: auth.role,
    });
}

/**
 * POST /api/halaszatok/[hid]/feladatok — új feladat + kiosztás.
 * ADMIN/OWNER. A létrehozó a sessionből; felelős/tó tenant-ellenőrzött.
 */
export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);
    if (!canManageFeladat(auth.role)) {
        return jsonError("Feladat letrehozasa ADMIN vagy OWNER jogosultsagot igenyel.", 403);
    }

    const body = await req.json().catch(() => null);
    const cim = typeof body?.cim === "string" ? body.cim.trim() : "";
    if (cim.length < 2) return jsonError("A feladat cime kotelezo (min. 2 karakter).", 400);
    if (cim.length > 200) return jsonError("A cim legfeljebb 200 karakter lehet.", 400);

    const leiras = typeof body?.leiras === "string" ? body.leiras.trim() || null : null;
    const szin = body?.szin != null ? normalizaltSzin(body.szin) : null;

    const statusz = ervenyesStatusz(body?.statusz) ? body.statusz : "UJ";
    const prioritas = ervenyesPrioritas(body?.prioritas) ? body.prioritas : "NORMAL";

    let hatarido: Date | null = null;
    if (body?.hatarido) {
        const d = new Date(body.hatarido);
        if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen hatarido.", 400);
        hatarido = d;
    }

    // Felelős — a halászat aktív tagja kell legyen
    const felelosId = body?.felelosFelhasznaloId != null ? szam(body.felelosFelhasznaloId, 0) : 0;
    if (felelosId) {
        const tag = await prisma.halaszatTagsag.findFirst({
            where: { halaszatId, felhasznaloId: felelosId, aktiv: true },
            select: { azonosito: true },
        });
        if (!tag) return jsonError("A felelos nem aktiv tagja ennek a halaszatnak.", 404);
    }

    // Tó — a halászathoz kell tartozzon
    const toId = body?.toId != null ? szam(body.toId, 0) : 0;
    if (toId) {
        const to = await prisma.to.findFirst({ where: { azonosito: toId, halaszatId }, select: { azonosito: true } });
        if (!to) return jsonError("A to nem ehhez a halaszathoz tartozik.", 404);
    }

    try {
        const feladat = await prisma.$transaction(async (tx) => {
            const f = await tx.feladat.create({
                data: {
                    halaszatId,
                    toId: toId || null,
                    cim, leiras, statusz, prioritas, szin, hatarido,
                    felelosFelhasznaloId: felelosId || null,
                    letrehozoFelhasznaloId: auth.user.azonosito,
                    elkeszultAt: statusz === "KESZ" ? new Date() : null,
                },
                select: { azonosito: true },
            });

            const felelosNev = felelosId
                ? rogzitoMegjelenites(await tx.felhasznalo.findUnique({ where: { azonosito: felelosId }, select: { nev: true, email: true } }))
                : null;

            await tx.naploEsemeny.create({
                data: {
                    tipus: "FELADAT",
                    toId: toId || null,
                    halaszatId,
                    datum: new Date(),
                    cim: `Feladat kiosztva — ${cim}`,
                    leiras: [
                        `Feladat: ${cim}`,
                        felelosNev ? `felelős: ${felelosNev}` : "nincs felelős",
                        hatarido ? `határidő: ${hatarido.toISOString().slice(0, 10)}` : null,
                    ].filter(Boolean).join(" • "),
                    felhasznaloId: auth.user.azonosito,
                    kapcsolodoEntitasTipus: "Feladat",
                    kapcsolodoEntitasId: f.azonosito,
                    reszletekJson: { prioritas, szin, felelosFelhasznaloId: felelosId || null },
                },
            });

            return f;
        });

        return NextResponse.json({ ok: true, feladat: { id: feladat.azonosito } }, { status: 201 });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba a feladat letrehozasakor.", err?.status ?? 500);
    }
}
