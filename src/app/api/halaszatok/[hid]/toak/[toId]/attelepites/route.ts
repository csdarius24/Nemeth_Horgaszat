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
    const fromToId = szam(params.toId, 0);

    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!fromToId) return jsonError("Hibás forrás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);

    // 🔥 FONTOS: UI-ból "celToId" jön
    const celToId = szam(body?.celToId, 0);
    const halfajId = szam(body?.halfajId, 0);
    const darab = Math.floor(szam(body?.darab, 0));
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    if (!celToId) return jsonError("A cél tó (celToId) kötelező.", 400);
    if (celToId === fromToId) return jsonError("A cél tó nem lehet azonos a forrás tóval.", 400);
    if (!halfajId) return jsonError("A halfajId kötelező.", 400);
    if (!darab || darab <= 0) return jsonError("A darab legyen pozitív egész.", 400);

    try {
        // Tenant-check mindkét tóra
        const fromTo = await assertToBelongsToTenant(fromToId, halaszatId);
        const toTo = await assertToBelongsToTenant(celToId, halaszatId);

        const result = await prisma.$transaction(async (tx) => {
            // 1) Forrás készlet ellenőrzés
            const fromStock = await tx.halAllomany.findUnique({
                where: { toId_halfajId: { toId: fromTo.azonosito, halfajId } },
                select: { azonosito: true, darab: true },
            });

            if (!fromStock) {
                throw Object.assign(new Error("A forrás tóban nincs ilyen halfaj készlet."), { status: 400 });
            }
            if (fromStock.darab < darab) {
                throw Object.assign(
                    new Error(`Nincs elég készlet a forrás tóban. Elérhető: ${fromStock.darab}, kért: ${darab}`),
                    { status: 400 }
                );
            }

            // 2) Forrás csökkentés
            const ujForras = fromStock.darab - darab;
            await tx.halAllomany.update({
                where: { azonosito: fromStock.azonosito },
                data: {
                    darab: ujForras,
                    ...(ujForras === 0 ? { minTomegKg: 0, maxTomegKg: 0 } : {}),
                },
            });

            // 3) Cél növelés (upsert a unique [toId, halfajId] miatt)
            await tx.halAllomany.upsert({
                where: { toId_halfajId: { toId: toTo.azonosito, halfajId } },
                create: {
                    toId: toTo.azonosito,
                    halfajId,
                    darab,
                    minTomegKg: 0,
                    maxTomegKg: 0,
                },
                update: {
                    darab: { increment: darab },
                },
            });

            // 4) Napló: két esemény (forrás kivét + cél telepítés)
            const leirasForras = [
                `Áttelepítés (kivét)`,
                `tó: ${fromTo.nev}`,
                `darab: ${darab}`,
                `cél: ${toTo.nev}`,
                megjegyzes ? `megj.: ${megjegyzes}` : null,
            ].filter(Boolean).join(" • ");

            const leirasCel = [
                `Áttelepítés (telepítés)`,
                `tó: ${toTo.nev}`,
                `darab: ${darab}`,
                `forrás: ${fromTo.nev}`,
                megjegyzes ? `megj.: ${megjegyzes}` : null,
            ].filter(Boolean).join(" • ");

            await tx.naploEsemeny.create({
                data: {
                    tipus: "KIVETEL",
                    toId: fromTo.azonosito,
                    halfajId,
                    darab,
                    leiras: leirasForras,
                },
            });

            await tx.naploEsemeny.create({
                data: {
                    tipus: "TELEPITES",
                    toId: toTo.azonosito,
                    halfajId,
                    darab,
                    leiras: leirasCel,
                },
            });

            return { ok: true };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt az áttelepítés során.", err?.status ?? 500);
    }
}