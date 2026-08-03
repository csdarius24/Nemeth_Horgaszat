import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    takarmanyRiasztasok,
    toRiasztasok,
    rendezRiasztasok,
    ALACSONY_KESZLET_KUSZOB,
    INAKTIV_TO_NAPOK,
} from "@/lib/dashboard/riasztasok";

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

    // ── 6. Takarmanykeszlet (Dashboard 2.0) ───────────────────────────────────
    const takarmanyok = await prisma.takarmany.findMany({
        where: { halaszatId },
        select: { azonosito: true, nev: true, egyseg: true, keszlet: true, aktiv: true },
        orderBy: { nev: "asc" },
    });

    const takarmanyAllapot = takarmanyok.map((t) => ({
        azonosito: t.azonosito,
        nev: t.nev,
        egyseg: t.egyseg,
        keszlet: Number(t.keszlet),
        aktiv: t.aktiv,
    }));

    const aktivTakarmanyok = takarmanyAllapot.filter((t) => t.aktiv);
    const takarmanyOsszKeszlet = aktivTakarmanyok.reduce((s, t) => s + t.keszlet, 0);

    // ── 7. Etetes napi trend (kg/nap) ─────────────────────────────────────────
    const etetesSorok = toIds.length > 0
        ? await prisma.etetes.findMany({
            where: { toId: { in: toIds }, datum: { gte: fromDate } },
            orderBy: { datum: "asc" },
            select: { datum: true, mennyisegKg: true },
            take: 1000,
        })
        : [];

    const etetesNapMap = new Map<string, number>();
    for (const e of etetesSorok) {
        const kulcs = e.datum.toISOString().slice(0, 10); // YYYY-MM-DD
        etetesNapMap.set(kulcs, (etetesNapMap.get(kulcs) ?? 0) + Number(e.mennyisegKg));
    }
    const etetesTrend = [...etetesNapMap.entries()]
        .map(([nap, kg]) => ({ nap, kg: Math.round(kg * 100) / 100 }))
        .sort((a, b) => a.nap.localeCompare(b.nap));

    // ── 8. Utolso esemeny tavankent (inaktiv-to riasztashoz) ──────────────────
    const utolsoEsemenyek = toIds.length > 0
        ? await prisma.naploEsemeny.groupBy({
            by: ["toId"],
            where: { toId: { in: toIds } },
            _max: { datum: true },
        })
        : [];
    const utolsoMap = new Map<number, Date | null>(
        utolsoEsemenyek
            .filter((u): u is typeof u & { toId: number } => u.toId != null)
            .map((u) => [u.toId, u._max.datum ?? null])
    );

    // ── 9. Riasztasok (tiszta, szabaly-alapu helperrel) ───────────────────────
    const most = new Date();
    const riasztasok = rendezRiasztasok([
        ...takarmanyRiasztasok(takarmanyAllapot),
        ...toRiasztasok(
            toak.map((t) => ({
                azonosito: t.azonosito,
                nev: t.nev,
                aktiv: t.aktiv,
                osszDarab: t.halAllomanyok.reduce((s, a) => s + a.darab, 0),
                utolsoEsemeny: utolsoMap.get(t.azonosito) ?? null,
            })),
            most
        ),
    ]);

    // ── 10. Legutobbi tevekenysegek (actorral) ────────────────────────────────
    const nyersLegutobbi = toIds.length > 0
        ? await prisma.naploEsemeny.findMany({
            where: { toId: { in: toIds } },
            orderBy: { datum: "desc" },
            take: 8,
            select: {
                azonosito: true, tipus: true, datum: true, leiras: true,
                darab: true, mennyisegKg: true,
                to: { select: { azonosito: true, nev: true } },
                felhasznaloId: true,
                felhasznalo: { select: { nev: true, email: true } },
            },
        })
        : [];

    const legutobbiEsemenyek = nyersLegutobbi.map(({ felhasznalo, ...e }) => ({
        ...e,
        rogzitoNev: rogzitoMegjelenites(felhasznalo),
    }));

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
        // ── Dashboard 2.0 (additiv, backward-compatible) ──────────────────────
        takarmany: {
            ossz: takarmanyAllapot.length,
            aktiv: aktivTakarmanyok.length,
            osszKeszlet: Math.round(takarmanyOsszKeszlet * 100) / 100,
            tetelek: takarmanyAllapot,
        },
        etetesTrend,
        riasztasok,
        riasztasKuszobok: {
            alacsonyKeszlet: ALACSONY_KESZLET_KUSZOB,
            inaktivToNapok: INAKTIV_TO_NAPOK,
        },
        legutobbiEsemenyek,
        days,
    });
}
