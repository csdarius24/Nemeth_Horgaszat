import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TelepitesKeres = {
    toAzonosito: number;
    halfajAzonosito?: number; // ha nem jön, akkor pontyot választunk
    darab: number;
    minTomegKg?: number;
    maxTomegKg?: number;
    forras?: string;
    megjegyzes?: string;
};

function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : alap;
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as TelepitesKeres | null;

    const toAzonosito = szam(body?.toAzonosito, 0);
    const darab = szam(body?.darab, 0);

    const minTomegKg = szam(body?.minTomegKg, 0);
    const maxTomegKg = szam(body?.maxTomegKg, 0);

    const forras = typeof body?.forras === "string" ? body?.forras.trim() : null;
    const megjegyzes =
        typeof body?.megjegyzes === "string" ? body?.megjegyzes.trim() : null;

    if (!toAzonosito) {
        return NextResponse.json({ hiba: "A tó azonosító kötelező." }, { status: 400 });
    }
    if (!darab || darab < 1) {
        return NextResponse.json({ hiba: "A darab legalább 1 legyen." }, { status: 400 });
    }
    if (minTomegKg < 0 || maxTomegKg < 0) {
        return NextResponse.json({ hiba: "A tömeg nem lehet negatív." }, { status: 400 });
    }
    if (maxTomegKg > 0 && minTomegKg > maxTomegKg) {
        return NextResponse.json(
            { hiba: "A min. tömeg nem lehet nagyobb, mint a max. tömeg." },
            { status: 400 }
        );
    }

    // halfaj: ha nem küldöd, Ponty
    const halfajAzonositoKuldes = szam(body?.halfajAzonosito, 0);

    try {
        const eredmeny = await prisma.$transaction(async (tx) => {
            // 1) tó létezik?
            const to = await tx.to.findUnique({ where: { azonosito: toAzonosito } });
            if (!to) throw new Error("Nincs ilyen tó.");

            // 2) halfaj kiválasztás
            let halfaj = null;
            if (halfajAzonositoKuldes) {
                halfaj = await tx.halfaj.findUnique({
                    where: { azonosito: halfajAzonositoKuldes },
                });
            } else {
                halfaj = await tx.halfaj.findUnique({ where: { nev: "Ponty" } });
            }
            if (!halfaj) throw new Error("Nincs ilyen halfaj (vagy hiányzik a Ponty seed).");

            // 3) telepítés rögzítése
            const telepites = await tx.telepites.create({
                data: {
                    toId: to.azonosito,
                    halfajId: halfaj.azonosito,
                    darab,
                    minTomegKg: minTomegKg.toFixed(2),
                    maxTomegKg: maxTomegKg.toFixed(2),
                    forras,
                    megjegyzes,
                },
            });

            // 4) halállomány upsert (toId+halfajId unique)
            const allomany = await tx.halAllomany.upsert({
                where: {
                    toId_halfajId: { toId: to.azonosito, halfajId: halfaj.azonosito },
                },
                update: {
                    darab: { increment: darab },
                    // tömegtartomány frissítés logika:
                    // - ha eddig 0 volt, vegye fel az újat
                    // - különben min = min(eddigi, új), max = max(eddigi, új) ha van megadva
                    minTomegKg:
                        minTomegKg > 0
                            ? undefined // lentebb külön kezeljük, hogy Decimal jól menjen
                            : undefined,
                },
                create: {
                    toId: to.azonosito,
                    halfajId: halfaj.azonosito,
                    darab,
                    minTomegKg: minTomegKg.toFixed(2),
                    maxTomegKg: maxTomegKg.toFixed(2),
                },
            });

            // 4/b) tömeg frissítés külön (Prisma Decimal miatt tisztábban)
            // lekérjük újra az állományt és beállítjuk a tartományt
            const frissAllomany = await tx.halAllomany.findUnique({
                where: { azonosito: allomany.azonosito },
            });
            if (!frissAllomany) throw new Error("Halállomány frissítés hiba.");

            const regiMin = Number(frissAllomany.minTomegKg);
            const regiMax = Number(frissAllomany.maxTomegKg);

            const ujMin =
                minTomegKg > 0 ? (regiMin === 0 ? minTomegKg : Math.min(regiMin, minTomegKg)) : regiMin;

            const ujMax =
                maxTomegKg > 0 ? Math.max(regiMax, maxTomegKg) : regiMax;

            await tx.halAllomany.update({
                where: { azonosito: frissAllomany.azonosito },
                data: {
                    minTomegKg: ujMin.toFixed(2),
                    maxTomegKg: ujMax.toFixed(2),
                },
            });

            // 5) napló
            const leiras = `Telepítés: ${to.nev} – ${halfaj.nev}, ${darab} db, tömeg: ${minTomegKg || 0}-${maxTomegKg || 0} kg`;

            await tx.naploEsemeny.create({
                data: {
                    tipus: "TELEPITES",
                    toId: to.azonosito,
                    halfajId: halfaj.azonosito,
                    darab,
                    leiras,
                },
            });

            return { telepitesAzonosito: telepites.azonosito, ok: true };
        });

        return NextResponse.json(eredmeny, { status: 201 });
    } catch (e) {
        const uzenet = e instanceof Error ? e.message : "Ismeretlen hiba";
        return NextResponse.json({ hiba: uzenet }, { status: 400 });
    }
}
