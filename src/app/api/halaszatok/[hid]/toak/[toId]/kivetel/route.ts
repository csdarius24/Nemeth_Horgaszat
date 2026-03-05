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

    // Kivét: ADMIN javasolt
    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);

    const halfajId = szam(body?.halfajId, 0);
    const darab = Math.floor(szam(body?.darab, 0));
    if (!halfajId) return jsonError("A halfajId kötelező.", 400);
    if (!darab || darab <= 0) return jsonError("A darab legyen pozitív egész.", 400);

    const datum = body?.datum ? new Date(body.datum) : new Date();
    if (Number.isNaN(datum.getTime())) return jsonError("Hibás dátum.", 400);

    const ok = typeof body?.ok === "string" ? body.ok.trim() : null;
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    try {
        const to = await assertToBelongsToTenant(toId, halaszatId);

        const result = await prisma.$transaction(async (tx) => {
            // 1) Forrás készlet
            const stock = await tx.halAllomany.findUnique({
                where: { toId_halfajId: { toId: to.azonosito, halfajId } },
                select: { azonosito: true, darab: true },
            });

            if (!stock) {
                throw Object.assign(new Error("A tóban nincs ilyen halfaj készlet."), { status: 400 });
            }
            if (stock.darab < darab) {
                throw Object.assign(
                    new Error(`Nincs elég készlet. Elérhető: ${stock.darab}, kért: ${darab}`),
                    { status: 400 }
                );
            }

            // 2) Kivetel rekord
            const kivetel = await tx.kivetel.create({
                data: {
                    toId: to.azonosito,
                    halfajId,
                    darab,
                    ok,
                    datum,
                    megjegyzes,
                },
                select: { azonosito: true },
            });

            // 3) Készlet csökkentés
            const ujDarab = stock.darab - darab;

            await tx.halAllomany.update({
                where: { azonosito: stock.azonosito },
                data: {
                    darab: ujDarab,
                    ...(ujDarab === 0 ? { minTomegKg: 0, maxTomegKg: 0 } : {}),
                },
            });

            // 4) Napló
            const halfaj = await tx.halfaj.findUnique({
                where: { azonosito: halfajId },
                select: { nev: true },
            });

            const leiras = [
                `Kivét`,
                `tó: ${to.nev}`,
                halfaj?.nev ? `faj: ${halfaj.nev}` : `halfajId: ${halfajId}`,
                `darab: ${darab}`,
                ok ? `ok: ${ok}` : null,
                megjegyzes ? `megj.: ${megjegyzes}` : null,
            ].filter(Boolean).join(" • ");

            await tx.naploEsemeny.create({
                data: {
                    tipus: "KIVETEL",
                    toId: to.azonosito,
                    halfajId,
                    darab,
                    datum,
                    leiras,
                },
            });

            return { ok: true, kivetelAzonosito: kivetel.azonosito };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt a kivét rögzítésekor.", err?.status ?? 500);
    }
}