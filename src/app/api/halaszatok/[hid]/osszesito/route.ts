import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

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
    const days = Math.min(Math.max(szam(url.searchParams.get("days") ?? "30", 30), 1), 90);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // ── 1. Tavak (allomannyyal egyutt) ────────────────────────────────────────
    const toak = await prisma.to.findMany({
        where: { halaszatId },
        select: {
            azonosito: true,
            nev: true,
            tipus: true,
            aktiv: true,
            halAllomanyok: {
                where: { darab: { gt: 0 } },
                select: {
                    darab: true,
                    halfaj: { select: { nev: true } },
                },
            },
        },
        orderBy: { nev: "asc" },
    });

    const toIds = toak.map((t) => t.azonosito);

    // ── 2. Halallomany osszesitve (fajok szerint) ─────────────────────────────
    const fajMap: Record<string, number> = {};
    for (const to of toak) {
        for (const a of to.halAllomanyok) {
            fajMap[a.halfaj.nev] = (fajMap[a.halfaj.nev] ?? 0) + a.darab;
        }
    }
    const fajonkent = Object.entries(fajMap)
        .map(([nev, darab]) => ({ nev, darab }))
        .sort((a, b) => b.darab - a.darab);

    const osszDarab = fajonkent.reduce((s, f) => s + f.darab, 0);

    // ── 3. Etetes (elmult N nap) ──────────────────────────────────────────────
    const etetesAgg = toIds.length > 0
        ? await prisma.etetes.aggregate({
            where: { toId: { in: toIds }, datum: { gte: fromDate } },
            _sum: { mennyisegKg: true },
            _count: { azonosito: true },
        })
        : { _sum: { mennyisegKg: null }, _count: { azonosito: 0 } };

    // ── 4. Esemeny eloszlas ───────────────────────────────────────────────────
    const esemenyEloszlas = toIds.length > 0
        ? await prisma.naploEsemeny.groupBy({
            by: ["tipus"],
            where: { toId: { in: toIds } },
            _count: { azonosito: true },
        })
        : [];

    // ── 5. Aktivitas trend ────────────────────────────────────────────────────
    const aktivitasEsemenyek = toIds.length > 0
        ? await prisma.naploEsemeny.findMany({
            where: { toId: { in: toIds }, datum: { gte: fromDate } },
            orderBy: { datum: "asc" },
            select: { tipus: true, datum: true },
            take: 500,
        })
        : [];

    return NextResponse.json({
        toak: {
            ossz: toak.length,
            aktiv: toak.filter((t) => t.aktiv).length,
        },
        halallomany: {
            osszDarab,
            fajokSzama: fajonkent.length,
            fajonkent,
        },
        etetes: {
            napok: days,
            osszegKg: etetesAgg._sum.mennyisegKg ?? 0,
            darab: etetesAgg._count.azonosito ?? 0,
        },
        esemenyEloszlas: esemenyEloszlas.map((e) => ({
            tipus: e.tipus,
            darab: e._count.azonosito,
        })),
        aktivitasEsemenyek,
        // Per-to allomany bontashoz
        tavakAllomany: toak.map((t) => ({
            azonosito: t.azonosito,
            nev: t.nev,
            tipus: t.tipus,
            aktiv: t.aktiv,
            allomany: t.halAllomanyok.map((a) => ({
                halfajNev: a.halfaj.nev,
                darab: a.darab,
            })),
        })),
        days,
    });
}
