import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { assertToBelongsToTenant } from "@/lib/tenant/assertToBelongsToTenant";
import { becsultKg, osszevonTomeg } from "@/lib/allomany/tomeg";

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
    // Súlyalapú telepítésnél a ténylegesen megadott össztömeg (kg) — a naplóhoz.
    const osszTomegKgBe = body?.osszTomegKg == null || body.osszTomegKg === "" ? null : Number(body.osszTomegKg);
    const forras = typeof body?.forras === "string" ? body.forras.trim() || null : null;
    const megjegyzes =
        typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() || null : null;

    if (!halfajId) return jsonError("A halfajId kötelező.", 400);
    if (!darab || darab <= 0) return jsonError("A darab legyen pozitív.", 400);
    if (!Number.isFinite(minTomegKg) || !Number.isFinite(maxTomegKg) || minTomegKg < 0 || maxTomegKg < 0) {
        return jsonError("A tömeg nem lehet negatív.", 400);
    }
    if (minTomegKg > 0 && maxTomegKg > 0 && minTomegKg > maxTomegKg) {
        return jsonError("A minimum tömeg nem lehet nagyobb a maximumnál.", 400);
    }
    if (osszTomegKgBe != null && (!Number.isFinite(osszTomegKgBe) || osszTomegKgBe <= 0)) {
        return jsonError("Az össztömeg pozitív szám legyen.", 400);
    }

    const ujResz = { darab, minTomegKg, maxTomegKg };
    // A naplóba írt telepített tömeg: a megadott össztömeg, különben a tartományból becsült.
    const telepitettKg = osszTomegKgBe ?? becsultKg(ujResz);

    try {
        const to = await assertToBelongsToTenant(toId, halaszatId);

        // A halfaj is ehhez a halászathoz kell tartozzon (tenant-izoláció).
        const halfaj = await prisma.halfaj.findFirst({ where: { azonosito: halfajId, halaszatId }, select: { nev: true } });
        if (!halfaj) return jsonError("A halfaj nem ehhez a halászathoz tartozik.", 404);

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
                // A meglévő és az új rész tömegét súlyozottan vonjuk össze — korábban az
                // új tartomány felülírta az egész állományét (pl. ivadék a piaci hal mellé).
                const tomeg = osszevonTomeg(
                    { darab: existing.darab, minTomegKg: Number(existing.minTomegKg), maxTomegKg: Number(existing.maxTomegKg) },
                    ujResz
                );
                await tx.halAllomany.update({
                    where: { azonosito: existing.azonosito },
                    data: {
                        darab: existing.darab + darab,
                        ...tomeg,
                    },
                });
            }

            const telepites = await tx.telepites.create({
                data: {
                    toId: to.azonosito,
                    halfajId,
                    darab,
                    minTomegKg,
                    maxTomegKg,
                    forras,
                    megjegyzes,
                },
                select: { azonosito: true },
            });

            await tx.naploEsemeny.create({
                data: {
                    tipus: "TELEPITES",
                    toId: to.azonosito,
                    halaszatId,
                    halfajId,
                    darab,
                    mennyisegKg: telepitettKg,
                    cim: `Telepítés — ${to.nev}`,
                    leiras: [
                        `Telepítés: ${to.nev}`,
                        `${halfaj.nev}: ${darab.toLocaleString("hu-HU")} db`,
                        telepitettKg != null ? `${telepitettKg.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} kg${osszTomegKgBe == null ? " (becsült)" : ""}` : null,
                        minTomegKg > 0 && minTomegKg === maxTomegKg ? `átlagsúly: ${(minTomegKg * 1000).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} g` : null,
                        forras ? `forrás: ${forras}` : null,
                        megjegyzes ? `megj.: ${megjegyzes}` : null,
                    ].filter(Boolean).join(" • "),
                    // actor: ki rögzítette (sessionből, NEM a kérés törzséből)
                    felhasznaloId: auth.user.azonosito,
                    kapcsolodoEntitasTipus: "Telepites",
                    kapcsolodoEntitasId: telepites.azonosito,
                    reszletekJson: { minTomegKg, maxTomegKg, osszTomegKg: telepitettKg, forras },
                },
            });

            return { ok: true };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        const e = err as { message?: string; status?: number };
        return jsonError(e?.message ?? "Telepítés hiba.", e?.status ?? 500);
    }
}