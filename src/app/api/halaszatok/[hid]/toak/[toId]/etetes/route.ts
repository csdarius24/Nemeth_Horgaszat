import { NextResponse } from "next/server";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { db } from "@/lib/prisma";
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

    // nálatok a requireHalaszatRole visszatérési objektumos
    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);

    const mennyisegKg = szam(body?.mennyisegKg, 0);
    if (!mennyisegKg || mennyisegKg <= 0) return jsonError("A mennyiség (kg) legyen > 0.", 400);

    const datum = body?.datum ? new Date(body.datum) : new Date();
    if (Number.isNaN(datum.getTime())) return jsonError("Hibás dátum.", 400);

    const tipus = typeof body?.tipus === "string" ? body.tipus.trim() : null;
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    try {
        // tenant-check: a tó ehhez a halászathoz tartozik
        const to = await assertToBelongsToTenant(toId, halaszatId);

        const created = await db.$transaction(async (tx) => {
            const etetes = await tx.etetes.create({
                data: {
                    toId: to.azonosito,
                    mennyisegKg, // Decimal mező: number is OK Prisma-ban
                    tipus,
                    datum,
                    megjegyzes,
                },
                select: {
                    azonosito: true,
                    toId: true,
                    mennyisegKg: true,
                    tipus: true,
                    datum: true,
                    megjegyzes: true,
                },
            });

            await tx.naploEsemeny.create({
                data: {
                    tipus: "ETETES",
                    toId: to.azonosito,
                    mennyisegKg,
                    datum,
                    leiras: [
                        `Etetés: ${to.nev}`,
                        `${mennyisegKg} kg`,
                        tipus ? `típus: ${tipus}` : null,
                        megjegyzes ? `megj.: ${megjegyzes}` : null,
                    ].filter(Boolean).join(" • "),
                },
            });

            return etetes;
        });

        return NextResponse.json(created, { status: 201 });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt az etetés rögzítésekor.", err?.status ?? 500);
    }
}