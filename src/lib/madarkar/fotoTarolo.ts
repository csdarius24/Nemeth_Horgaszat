// Madárkár-fényképek tárolása. EZ AZ EGYETLEN MODUL, amely tudja, hol vannak a
// képek (jelenleg: MySQL MEDIUMBLOB a `madarkar_fotok` táblában). Ha a képek
// száma/mérete indokolja, itt cserélhető Vercel Blobra vagy S3-ra — az API-k és
// a felület változatlanok maradnak.
//
// Minden lekérdezés tenant-szűrt (halaszatId), így más halászat képe nem érhető el.

import { prisma } from "@/lib/prisma";
import type { KepMime } from "./madarkar";

export type FotoMeta = { azonosito: number; szelesseg: number | null; magassag: number | null; meretBajt: number };

export async function mentFoto(
    esemenyId: number,
    adat: Uint8Array,
    mime: KepMime,
    meret: { szelesseg: number | null; magassag: number | null }
): Promise<FotoMeta> {
    return prisma.madarkarFoto.create({
        data: {
            esemenyId,
            mime,
            meretBajt: adat.byteLength,
            szelesseg: meret.szelesseg,
            magassag: meret.magassag,
            adat: Buffer.from(adat),
        },
        select: { azonosito: true, szelesseg: true, magassag: true, meretBajt: true },
    });
}

/** Kép tartalma — csak ha a kép az adott halászat eseményéhez tartozik. */
export async function olvasFoto(fotoId: number, halaszatId: number) {
    return prisma.madarkarFoto.findFirst({
        where: { azonosito: fotoId, esemeny: { halaszatId } },
        select: { mime: true, adat: true, letrehozva: true },
    });
}

/** A kép eseményének adatai (jogosultság-ellenőrzéshez), tenant-szűrten. */
export async function fotoEsemenye(fotoId: number, halaszatId: number) {
    const f = await prisma.madarkarFoto.findFirst({
        where: { azonosito: fotoId, esemeny: { halaszatId } },
        select: { esemeny: { select: { azonosito: true, rogzitoFelhasznaloId: true } } },
    });
    return f?.esemeny ?? null;
}

export async function torolFoto(fotoId: number) {
    await prisma.madarkarFoto.delete({ where: { azonosito: fotoId } });
}

export async function fotoDarab(esemenyId: number) {
    return prisma.madarkarFoto.count({ where: { esemenyId } });
}
