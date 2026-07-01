// Szintetikus adatgyártók az integrációs tesztekhez.
// Minden rekord egyedi (prefix + véletlen), és a `Takaritas` minden létrehozott
// gyökeret (Halaszat, Felhasznalo) törli a futás végén — production/dev rekordra
// SOSEM támaszkodunk, fix ID-t SOSEM feltételezünk.

import type { PrismaClient, HalaszatSzerepkor } from "@prisma/client";

export class Takaritas {
    private halaszatIds: number[] = [];
    private felhasznaloIds: number[] = [];

    halaszat(id: number) { this.halaszatIds.push(id); }
    felhasznalo(id: number) { this.felhasznaloIds.push(id); }

    /**
     * Törli a létrehozott szintetikus adatokat. A Halaszat törlése kaszkádol a
     * To → Etetes/NaploEsemeny, Takarmany → TakarmanyMozgas és HalaszatTagsag
     * rekordokra; a Felhasznalo külön törlendő.
     */
    async fuss(prisma: PrismaClient): Promise<void> {
        for (const id of this.halaszatIds) {
            await prisma.halaszat.deleteMany({ where: { azonosito: id } });
        }
        for (const id of this.felhasznaloIds) {
            await prisma.felhasznalo.deleteMany({ where: { azonosito: id } });
        }
        this.halaszatIds = [];
        this.felhasznaloIds = [];
    }
}

export async function letrehozHalaszat(prisma: PrismaClient, prefix: string, takaritas: Takaritas) {
    const h = await prisma.halaszat.create({
        data: { nev: `${prefix} halászat`, slug: `${prefix}-halaszat` },
        select: { azonosito: true, nev: true, slug: true },
    });
    takaritas.halaszat(h.azonosito);
    return h;
}

export async function letrehozFelhasznalo(prisma: PrismaClient, prefix: string, takaritas: Takaritas) {
    const u = await prisma.felhasznalo.create({
        // jelszoHash: szintetikus, NEM valódi jelszó-hash (nincs bejelentkezés a tesztben)
        data: { email: `${prefix}@itest.local`, nev: `${prefix} user`, jelszoHash: "x".repeat(60) },
        select: { azonosito: true, email: true },
    });
    takaritas.felhasznalo(u.azonosito);
    return u;
}

export async function letrehozTagsag(
    prisma: PrismaClient,
    halaszatId: number,
    felhasznaloId: number,
    szerepkor: HalaszatSzerepkor
) {
    return prisma.halaszatTagsag.create({
        data: { halaszatId, felhasznaloId, szerepkor, aktiv: true },
        select: { azonosito: true, szerepkor: true, aktiv: true },
    });
}

export async function letrehozTo(prisma: PrismaClient, halaszatId: number, prefix: string) {
    return prisma.to.create({
        data: { nev: `${prefix} tó`, halaszatId, tipus: "TO" },
        select: { azonosito: true, nev: true, halaszatId: true },
    });
}

export async function letrehozTakarmany(
    prisma: PrismaClient,
    halaszatId: number,
    prefix: string,
    kezdoKeszlet = 0
) {
    return prisma.takarmany.create({
        data: { halaszatId, nev: `${prefix} takarmány`, egyseg: "kg", keszlet: kezdoKeszlet, aktiv: true },
        select: { azonosito: true, nev: true, egyseg: true, keszlet: true },
    });
}
