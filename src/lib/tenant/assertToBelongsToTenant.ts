import { db } from "@/lib/prisma";

export async function assertToBelongsToTenant(toId: number, halaszatId: number) {
    const to = await db.to.findFirst({
        where: { azonosito: toId, halaszatId },
        select: { azonosito: true, nev: true, tipus: true, halaszatId: true },
    });

    if (!to) {
        const err: any = new Error("A tó nem található a halászat alatt (vagy nincs hozzáférés).");
        err.status = 404;
        throw err;
    }

    return to;
}