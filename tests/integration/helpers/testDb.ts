// Biztonságos teszt-adatbázis kezelő az integrációs tesztekhez.
//
// SZIGORÚ SZABÁLYOK:
// 1. KIZÁRÓLAG a TEST_DATABASE_URL vagy DATABASE_URL_TEST környezeti változót
//    használjuk. A DATABASE_URL-t (.env / production) SOSEM olvassuk be itt.
// 2. Production-guard: ha a teszt-URL a productionre utaló hostot/DB-nevet
//    tartalmaz (srv1695.hstgr.io / u625819054_horgaszat_v1), AZONNAL leállunk.
// 3. Ha nincs teszt-URL beállítva, az integrációs tesztek biztonságosan
//    kihagyásra kerülnek (skip) — soha nem futnak production ellen.
//
// FONTOS: ez a modul NEM importálja a `@/lib/prisma` singletont (az a
// DATABASE_URL-re csatlakozna). Saját PrismaClientet hoz létre, explicit a
// teszt-URL-lel.

import { PrismaClient } from "@prisma/client";

const PRODUCTION_HOST = "srv1695.hstgr.io";
const PRODUCTION_DB = "u625819054_horgaszat_v1";

// Csak a dedikált teszt-változókat olvassuk — DATABASE_URL TILOS.
const TESZT_URL =
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? "";

export const INTEGRACIOS_DB_ELERHETO = TESZT_URL.trim().length > 0;

export const KIHAGYAS_OKA = INTEGRACIOS_DB_ELERHETO
    ? null
    : "Nincs TEST_DATABASE_URL / DATABASE_URL_TEST beállítva — az integrációs tesztek KIHAGYVA (a production DATABASE_URL-t szándékosan nem használjuk).";

/**
 * Leáll, ha a megadott URL a production adatbázisra utal.
 * Tiszta függvény — unit-tesztelhető is.
 */
export function ellenorizNemProduction(url: string): void {
    if (url.includes(PRODUCTION_HOST) || url.includes(PRODUCTION_DB)) {
        throw new Error(
            "BIZTONSÁGI LEÁLLÍTÁS: a teszt-adatbázis URL a productionre mutat " +
            `(${PRODUCTION_HOST} / ${PRODUCTION_DB}). Az integrációs tesztek NEM ` +
            "futhatnak a production adatbázis ellen. Állíts be külön, izolált " +
            "TEST_DATABASE_URL-t."
        );
    }
}

let kliens: PrismaClient | null = null;

/**
 * Visszaadja (és lazán létrehozza) a teszt PrismaClientet a teszt-URL-lel.
 * Csak akkor hívható, ha INTEGRACIOS_DB_ELERHETO igaz.
 */
export function getTestPrisma(): PrismaClient {
    if (!INTEGRACIOS_DB_ELERHETO) {
        throw new Error(KIHAGYAS_OKA ?? "Nincs teszt-adatbázis.");
    }
    // Dupla biztonság: minden hozzáférés előtt ellenőrizzük.
    ellenorizNemProduction(TESZT_URL);

    if (!kliens) {
        kliens = new PrismaClient({
            datasources: { db: { url: TESZT_URL } },
            log: [],
        });
    }
    return kliens;
}

export async function disconnectTestPrisma(): Promise<void> {
    if (kliens) {
        await kliens.$disconnect();
        kliens = null;
    }
}

/** Egyedi prefix egy teszt-futáshoz, hogy a szintetikus adat ütközésmentes legyen. */
export function egyediPrefix(): string {
    return `itest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
