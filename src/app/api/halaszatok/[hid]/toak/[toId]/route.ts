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
    context: { params: Promise<{ hid: string; toId: string }> }
) {
    const params = await context.params;
    const halaszatId = szam(params.hid, 0);
    const toId = szam(params.toId, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!toId) return jsonError("Hibás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    try {
        const to = await assertToBelongsToTenant(toId, halaszatId);

        const allomanyok = await prisma.halAllomany.findMany({
            where: { toId: to.azonosito },
            orderBy: { halfajId: "asc" },
            select: {
                azonosito: true,
                darab: true,
                minTomegKg: true,
                maxTomegKg: true,
                halfaj: { select: { azonosito: true, nev: true } },
            },
        });

        return NextResponse.json({
            to,
            allomanyok,
        });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt a tó adatainak lekérésekor.", err?.status ?? 500);
    }
}