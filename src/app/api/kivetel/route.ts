import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type KivetelKeres = {
    toAzonosito: number;
    halfajAzonosito?: number; // default: Ponty
    darab: number;
    ok?: string;
    megjegyzes?: string;
};

function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : alap;
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as KivetelKeres | null;

    const toAzonosito = szam(body?.toAzonosito, 0);
    const darab = szam(body?.darab, 0);

    const ok = typeof body?.ok === "string" ? body.ok.trim() : null;
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    if (!toAzonosito) {
        return NextResponse.json({ hiba: "A tó azonosító kötelező." }, { status: 400 });
    }
    if (!darab || darab < 1) {
        return NextResponse.json({ hiba: "A darab legalább 1 legyen." }, { status: 400 });
    }

    const halfajAzonositoKuldes = szam(body?.halfajAzonosito, 0);

    try {
        const eredmeny = await prisma.$transaction(async (tx) => {
            // tó létezik?
            const to = await tx.to.findUnique({ where: { azonosito: toAzonosito } });
            if (!to) throw new Error("Nincs ilyen tó.");

            // halfaj kiválasztás
            const halfaj = halfajAzonositoKuldes
                ? await tx.halfaj.findUnique({ where: { azonosito: halfajAzonositoKuldes } })
                : await tx.halfaj.findUnique({ where: { nev: "Ponty" } });

            if (!halfaj) throw new Error("Nincs ilyen halfaj (vagy hiányzik a Ponty).");

            // aktuális állomány megkeresése
            const allomany = await tx.halAllomany.findUnique({
                where: { toId_halfajId: { toId: to.azonosito, halfajId: halfaj.azonosito } },
            });

            if (!allomany || allomany.darab < darab) {
                const van = allomany?.darab ?? 0;
                throw new Error(`Nincs elég hal az állományban. Jelenleg: ${van} db.`);
            }

            // kivétel rögzítése
            const kivetel = await tx.kivetel.create({
                data: {
                    toId: to.azonosito,
                    halfajId: halfaj.azonosito,
                    darab,
                    ok,
                    megjegyzes,
                },
            });

            // állomány csökkentése
            await tx.halAllomany.update({
                where: { azonosito: allomany.azonosito },
                data: { darab: { decrement: darab } },
            });

            // napló
            const leirasReszek = [
                `Kivétel: ${to.nev} – ${halfaj.nev}`,
                `${darab} db`,
            ];

            if (ok) {
                leirasReszek.push(`ok: ${ok}`);
            }

            if (megjegyzes) {
                leirasReszek.push(`megj.: ${megjegyzes}`);
            }

            const leiras = leirasReszek.join(" • ");

            await tx.naploEsemeny.create({
                data: {
                    tipus: "KIVETEL",
                    toId: to.azonosito,
                    halfajId: halfaj.azonosito,
                    darab,
                    leiras,
                },
            });

            return { kivetelAzonosito: kivetel.azonosito, ok: true };
        });

        return NextResponse.json(eredmeny, { status: 201 });
    } catch (e) {
        const uzenet = e instanceof Error ? e.message : "Ismeretlen hiba";
        return NextResponse.json({ hiba: uzenet }, { status: 400 });
    }
}
