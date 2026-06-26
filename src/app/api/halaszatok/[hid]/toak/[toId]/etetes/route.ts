import { NextResponse } from "next/server";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { db } from "@/lib/prisma";
import { assertToBelongsToTenant } from "@/lib/tenant/assertToBelongsToTenant";
import { szamitTakarmanyFelhasznalas } from "@/lib/takarmany/keszlet";

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

    // Opcionális: ha takarmanyId jön, automatikus készletlevonást is végzünk.
    // null/hiányzó esetén a viselkedés pontosan a régi (csak Etetes + NaploEsemeny).
    const takarmanyId = body?.takarmanyId != null ? szam(body.takarmanyId, 0) : 0;

    try {
        // tenant-check: a tó ehhez a halászathoz tartozik
        const to = await assertToBelongsToTenant(toId, halaszatId);

        // ── Visszafelé kompatibilis ág: nincs takarmány ────────────────────────
        if (!takarmanyId) {
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
        }

        // ── Takarmányhoz kötött ág: automatikus készletlevonás ─────────────────

        // a takarmány ugyanahhoz a halászathoz tartozzon (tenant-izoláció)
        const takarmany = await db.takarmany.findFirst({
            where: { azonosito: takarmanyId, halaszatId },
            select: { azonosito: true, nev: true, egyseg: true, keszlet: true },
        });
        if (!takarmany) return jsonError("A takarmány nem található ennél a halászatnál.", 404);

        // készlet-ellenőrzés tiszta helperrel (mennyisegKg = levont mennyiség)
        const szamitas = szamitTakarmanyFelhasznalas(Number(takarmany.keszlet), mennyisegKg);
        if (!szamitas.ok) {
            if (szamitas.hiba === "nincs_eleg_keszlet") {
                return jsonError(
                    `Nincs elég takarmánykészlet. Jelenlegi készlet: ${Number(takarmany.keszlet)} ${takarmany.egyseg}, igényelt: ${mennyisegKg}.`,
                    422
                );
            }
            return jsonError("Érvénytelen mennyiség a készletlevonáshoz.", 400);
        }
        const ujKeszlet = szamitas.ujKeszlet;

        const eredmeny = await db.$transaction(async (tx) => {
            const etetes = await tx.etetes.create({
                data: {
                    toId: to.azonosito,
                    mennyisegKg,
                    tipus,
                    datum,
                    megjegyzes,
                    takarmanyId: takarmany.azonosito,
                },
                select: {
                    azonosito: true,
                    toId: true,
                    mennyisegKg: true,
                    tipus: true,
                    datum: true,
                    megjegyzes: true,
                    takarmanyId: true,
                },
            });

            const mozgas = await tx.takarmanyMozgas.create({
                data: {
                    takarmanyId: takarmany.azonosito,
                    halaszatId,
                    tipus: "FELHASZNALVA",
                    mennyiseg: mennyisegKg,
                    datum,
                    megjegyzes: megjegyzes ?? `Etetés (${to.nev})`,
                    toId: to.azonosito,
                    etetesId: etetes.azonosito,
                },
                select: { azonosito: true },
            });

            await tx.takarmany.update({
                where: { azonosito: takarmany.azonosito },
                data: { keszlet: ujKeszlet },
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
                        `takarmány: ${takarmany.nev} (−${mennyisegKg} ${takarmany.egyseg}, maradt: ${ujKeszlet})`,
                        megjegyzes ? `megj.: ${megjegyzes}` : null,
                    ].filter(Boolean).join(" • "),
                },
            });

            return { etetes, mozgasId: mozgas.azonosito };
        });

        return NextResponse.json(
            {
                ...eredmeny.etetes,
                takarmanyId: takarmany.azonosito,
                takarmanyNev: takarmany.nev,
                ujKeszlet,
                takarmanyMozgasId: eredmeny.mozgasId,
            },
            { status: 201 }
        );
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt az etetés rögzítésekor.", err?.status ?? 500);
    }
}
