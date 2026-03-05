import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { assertToBelongsToTenant } from "@/lib/tenant/assertToBelongsToTenant";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ hid: string; toId: string }> }
) {
    const { hid, toId } = await params;

    const halaszatId = szam(hid, 0);
    const toIdNum = szam(toId, 0);

    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!toIdNum) return jsonError("Hibás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const days = Math.min(Math.max(szam(url.searchParams.get("days") ?? "7", 7), 1), 90);
    const events = Math.min(Math.max(szam(url.searchParams.get("events") ?? "10", 10), 1), 50);

    try {
        const to = await assertToBelongsToTenant(toIdNum, halaszatId);

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        // 1) készlet snapshot
        const allomany = await prisma.halAllomany.findMany({
            where: { toId: to.azonosito },
            orderBy: [{ halfajId: "asc" }],
            select: {
                darab: true,
                minTomegKg: true,
                maxTomegKg: true,
                halfaj: { select: { azonosito: true, nev: true } },
            },
        });

        const osszDarab = allomany.reduce((acc, a) => acc + a.darab, 0);

        // 2) etetés összeg (elmúlt N nap)
        const etetesAgg = await prisma.etetes.aggregate({
            where: { toId: to.azonosito, datum: { gte: fromDate } },
            _sum: { mennyisegKg: true },
            _count: { azonosito: true },
        });

        // 3) timeline (utolsó X esemény)
        const timeline = await prisma.naploEsemeny.findMany({
            where: { toId: to.azonosito },
            orderBy: { datum: "desc" },
            take: events,
            select: {
                azonosito: true,
                tipus: true,
                datum: true,
                leiras: true,
                darab: true,
                mennyisegKg: true,
                halfaj: { select: { azonosito: true, nev: true } },
            },
        });

        return NextResponse.json({
            to: { azonosito: to.azonosito, nev: to.nev, tipus: to.tipus },
            summary: {
                osszDarab,
                etetes: {
                    napok: days,
                    osszegKg: etetesAgg._sum.mennyisegKg ?? 0,
                    darab: etetesAgg._count.azonosito ?? 0,
                },
            },
            allomany,
            timeline,
        });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt a summary lekérésekor.", err?.status ?? 500);
    }
}