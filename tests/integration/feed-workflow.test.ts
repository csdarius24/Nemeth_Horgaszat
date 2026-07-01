// Integrációs (DB-backed) workflow teszt: takarmány-bevétel → etetés takarmánnyal
// → készlet csökken → TakarmanyMozgas(FELHASZNALVA) jön létre az Etetes-hez
// kötve → NaploEsemeny(ETETES) jön létre. Plusz: visszafelé kompatibilitás
// (etetés takarmanyId nélkül nem változtatja a készletet).
//
// BIZTONSÁG: kizárólag TEST_DATABASE_URL/DATABASE_URL_TEST ellen fut, production
// ellen SOHA (lásd helpers/testDb.ts). Teszt-DB hiányában a blokk KIHAGYVA.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
    INTEGRACIOS_DB_ELERHETO,
    KIHAGYAS_OKA,
    getTestPrisma,
    disconnectTestPrisma,
    ellenorizNemProduction,
    egyediPrefix,
} from "./helpers/testDb";
import {
    Takaritas,
    letrehozHalaszat,
    letrehozFelhasznalo,
    letrehozTagsag,
    letrehozTo,
    letrehozTakarmany,
} from "./helpers/factories";
// A VALÓDI üzleti döntéslogika (ugyanaz, amit az etetes route használ).
import { szamitTakarmanyFelhasznalas } from "@/lib/takarmany/keszlet";

if (!INTEGRACIOS_DB_ELERHETO) {
    // Látható, őszinte jelzés a futásban, hogy miért nincs eredmény.
    console.warn(`[integration] feed-workflow KIHAGYVA — ${KIHAGYAS_OKA}`);
}

/**
 * Etetés takarmány-levonással — az `etetes` route dokumentált tranzakciójának
 * hű mása (a route a forrás; az endpoint-szintű HTTP/cookie-wiring tesztje a
 * dokumentált következő lépés). A készletszámítás a VALÓDI helperrel történik.
 */
async function etetesTakarmannyal(
    prisma: PrismaClient,
    p: { toId: number; halaszatId: number; takarmanyId: number; mennyisegKg: number; jelenlegiKeszlet: number; felhasznaloId?: number }
) {
    const szamitas = szamitTakarmanyFelhasznalas(p.jelenlegiKeszlet, p.mennyisegKg);
    if (!szamitas.ok) throw new Error(`készlet-hiba: ${szamitas.hiba}`);
    const ujKeszlet = szamitas.ujKeszlet;

    return prisma.$transaction(async (tx) => {
        const etetes = await tx.etetes.create({
            data: { toId: p.toId, mennyisegKg: p.mennyisegKg, datum: new Date(), takarmanyId: p.takarmanyId },
            select: { azonosito: true, takarmanyId: true },
        });
        const mozgas = await tx.takarmanyMozgas.create({
            data: {
                takarmanyId: p.takarmanyId, halaszatId: p.halaszatId, tipus: "FELHASZNALVA",
                mennyiseg: p.mennyisegKg, datum: new Date(), toId: p.toId, etetesId: etetes.azonosito,
                // actor: ki etetett (mint az etetes route)
                felhasznaloId: p.felhasznaloId ?? null,
            },
            select: { azonosito: true, tipus: true, toId: true, etetesId: true, felhasznaloId: true },
        });
        await tx.takarmany.update({ where: { azonosito: p.takarmanyId }, data: { keszlet: ujKeszlet } });
        const naplo = await tx.naploEsemeny.create({
            data: {
                tipus: "ETETES", toId: p.toId, mennyisegKg: p.mennyisegKg, datum: new Date(), leiras: "itest etetés",
                felhasznaloId: p.felhasznaloId ?? null,
            },
            select: { azonosito: true, tipus: true, toId: true, felhasznaloId: true },
        });
        return { etetes, mozgas, naplo, ujKeszlet };
    });
}

describe.skipIf(!INTEGRACIOS_DB_ELERHETO)("Integráció: takarmány-etetés workflow (DB-backed)", () => {
    let prisma: PrismaClient;
    const takaritas = new Takaritas();
    const prefix = egyediPrefix();

    beforeAll(async () => {
        prisma = getTestPrisma();
        ellenorizNemProduction(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? "");
        await prisma.$queryRaw`SELECT 1`; // kapcsolat-ellenőrzés
    });

    afterAll(async () => {
        await takaritas.fuss(prisma);
        await disconnectTestPrisma();
    });

    it("A) bevétel → etetés takarmánnyal → készlet csökken, mozgás+napló jön létre", async () => {
        const halaszat = await letrehozHalaszat(prisma, prefix, takaritas);
        const user = await letrehozFelhasznalo(prisma, prefix, takaritas);
        await letrehozTagsag(prisma, halaszat.azonosito, user.azonosito, "STAFF");
        const to = await letrehozTo(prisma, halaszat.azonosito, prefix);
        const takarmany = await letrehozTakarmany(prisma, halaszat.azonosito, prefix, 0);

        // takarmány-bevétel: +100 (mint a mozgasok route BEVETEL ága)
        await prisma.$transaction([
            prisma.takarmanyMozgas.create({
                data: { takarmanyId: takarmany.azonosito, halaszatId: halaszat.azonosito, tipus: "BEVETEL", mennyiseg: 100, datum: new Date() },
            }),
            prisma.takarmany.update({ where: { azonosito: takarmany.azonosito }, data: { keszlet: 100 } }),
        ]);

        // etetés 30 kg-mal, takarmányhoz kötve, actor = user
        const eredmeny = await etetesTakarmannyal(prisma, {
            toId: to.azonosito, halaszatId: halaszat.azonosito, takarmanyId: takarmany.azonosito,
            mennyisegKg: 30, jelenlegiKeszlet: 100, felhasznaloId: user.azonosito,
        });

        // készlet 100 → 70
        const frissTakarmany = await prisma.takarmany.findUnique({
            where: { azonosito: takarmany.azonosito }, select: { keszlet: true },
        });
        expect(Number(frissTakarmany?.keszlet)).toBe(70);
        expect(eredmeny.ujKeszlet).toBe(70);

        // FELHASZNALVA mozgás az etetéshez + tóhoz + actorhoz kötve
        const mozgas = await prisma.takarmanyMozgas.findUnique({
            where: { azonosito: eredmeny.mozgas.azonosito },
            select: { tipus: true, mennyiseg: true, etetesId: true, toId: true, takarmanyId: true, felhasznaloId: true },
        });
        expect(mozgas?.tipus).toBe("FELHASZNALVA");
        expect(Number(mozgas?.mennyiseg)).toBe(30);
        expect(mozgas?.etetesId).toBe(eredmeny.etetes.azonosito);
        expect(mozgas?.toId).toBe(to.azonosito);
        expect(mozgas?.takarmanyId).toBe(takarmany.azonosito);
        // actor: a mozgás rögzítője a session-user
        expect(mozgas?.felhasznaloId).toBe(user.azonosito);

        // NaploEsemeny(ETETES) létrejött a tóra, actorral
        const naplo = await prisma.naploEsemeny.findFirst({
            where: { toId: to.azonosito, tipus: "ETETES" }, select: { azonosito: true, tipus: true, felhasznaloId: true },
        });
        expect(naplo).not.toBeNull();
        expect(naplo?.tipus).toBe("ETETES");
        expect(naplo?.felhasznaloId).toBe(user.azonosito);

        // Etetes a takarmányhoz kötve
        const etetes = await prisma.etetes.findUnique({
            where: { azonosito: eredmeny.etetes.azonosito }, select: { takarmanyId: true },
        });
        expect(etetes?.takarmanyId).toBe(takarmany.azonosito);
    });

    it("C) visszafelé kompatibilitás: etetés takarmanyId nélkül nem változtat készletet", async () => {
        const halaszat = await letrehozHalaszat(prisma, `${prefix}_bc`, takaritas);
        const to = await letrehozTo(prisma, halaszat.azonosito, `${prefix}_bc`);
        const takarmany = await letrehozTakarmany(prisma, halaszat.azonosito, `${prefix}_bc`, 50);

        // etetés takarmány nélkül: csak Etetes + NaploEsemeny (mint a route fallback ága)
        const etetes = await prisma.$transaction(async (tx) => {
            const e = await tx.etetes.create({
                data: { toId: to.azonosito, mennyisegKg: 12.5, datum: new Date() },
                select: { azonosito: true, takarmanyId: true },
            });
            await tx.naploEsemeny.create({
                data: { tipus: "ETETES", toId: to.azonosito, mennyisegKg: 12.5, datum: new Date(), leiras: "itest etetés (takarmány nélkül)" },
            });
            return e;
        });

        // a takarmány készlete VÁLTOZATLAN
        const frissTakarmany = await prisma.takarmany.findUnique({
            where: { azonosito: takarmany.azonosito }, select: { keszlet: true },
        });
        expect(Number(frissTakarmany?.keszlet)).toBe(50);

        // az etetés NINCS takarmányhoz kötve, és nem keletkezett FELHASZNALVA mozgás rá
        expect(etetes.takarmanyId).toBeNull();
        const mozgasokSzama = await prisma.takarmanyMozgas.count({ where: { etetesId: etetes.azonosito } });
        expect(mozgasokSzama).toBe(0);
    });
});
