import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EtetesKeres = {
    toAzonosito: number;
    mennyisegKg: number;
    tipus?: string;
    megjegyzes?: string;
};

function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : alap;
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as EtetesKeres | null;

    const toAzonosito = szam(body?.toAzonosito, 0);
    const mennyisegKg = szam(body?.mennyisegKg, 0);

    const tipus = typeof body?.tipus === "string" ? body.tipus.trim() : null;
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() : null;

    if (!toAzonosito) {
        return NextResponse.json({ hiba: "A tó azonosító kötelező." }, { status: 400 });
    }
    if (!mennyisegKg || mennyisegKg <= 0) {
        return NextResponse.json({ hiba: "A mennyiség (kg) legyen > 0." }, { status: 400 });
    }

    try {
        const eredmeny = await prisma.$transaction(async (tx) => {
            const to = await tx.to.findUnique({ where: { azonosito: toAzonosito } });
            if (!to) throw new Error("Nincs ilyen tó.");

            const etetes = await tx.etetes.create({
                data: {
                    toId: to.azonosito,
                    mennyisegKg: mennyisegKg.toFixed(2),
                    tipus,
                    megjegyzes,
                },
            });

            const leirasReszek = [
                `Etetés: ${to.nev}`,
                `${mennyisegKg.toFixed(2)} kg`,
            ];

            if (tipus) {
                leirasReszek.push(`táp: ${tipus}`);
            }

            if (megjegyzes) {
                leirasReszek.push(`megj.: ${megjegyzes}`);
            }

            const leiras = leirasReszek.join(" • ");

            await tx.naploEsemeny.create({
                data: {
                    tipus: "ETETES",
                    toId: to.azonosito,
                    mennyisegKg: mennyisegKg.toFixed(2),
                    leiras,
                },
            });

            return { etetesAzonosito: etetes.azonosito, ok: true };
        });

        return NextResponse.json(eredmeny, { status: 201 });
    } catch (e) {
        const uzenet = e instanceof Error ? e.message : "Ismeretlen hiba";
        return NextResponse.json({ hiba: uzenet }, { status: 400 });
    }
}
