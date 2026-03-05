import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { assertToBelongsToTenant } from "@/lib/tenant/assertToBelongsToTenant";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string; toId: string }> }
) {
    const params = await context.params;

    const halaszatId = szam(params.hid, 0);
    const toId = szam(params.toId, 0);

    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!toId) return jsonError("Hibás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);

    const halfajId = szam(body?.halfajId, 0);
    const darab = Math.floor(szam(body?.darab, 0));
    const minTomegKg = Number(body?.minTomegKg ?? 0);
    const maxTomegKg = Number(body?.maxTomegKg ?? 0);
    const forras = typeof body?.forras === "string" ? body.forras.trim() : null;
    const megjegyzes =
        typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    if (!halfajId) return jsonError("A halfajId kötelező.", 400);
    if (!darab || darab <= 0) return jsonError("A darab legyen pozitív.", 400);

    try {
        const to = await assertToBelongsToTenant(toId, halaszatId);

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.halAllomany.findUnique({
                where: { toId_halfajId: { toId: to.azonosito, halfajId } },
            });

            if (!existing) {
                await tx.halAllomany.create({
                    data: {
                        toId: to.azonosito,
                        halfajId,
                        darab,
                        minTomegKg,
                        maxTomegKg,
                    },
                });
            } else {
                const ujDarab = existing.darab + darab;

                await tx.halAllomany.update({
                    where: { azonosito: existing.azonosito },
                    data: {
                        darab: ujDarab,
                        minTomegKg,
                        maxTomegKg,
                    },
                });
            }

            await tx.telepites.create({
                data: {
                    toId: to.azonosito,
                    halfajId,
                    darab,
                    minTomegKg,
                    maxTomegKg,
                    forras,
                    megjegyzes,
                },
            });

            await tx.naploEsemeny.create({
                data: {
                    tipus: "TELEPITES",
                    toId: to.azonosito,
                    halfajId,
                    darab,
                    leiras: `Telepítés • darab: ${darab}`,
                },
            });

            return { ok: true };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return jsonError(err?.message ?? "Telepítés hiba.", err?.status ?? 500);
    }
}