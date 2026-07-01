// Integrációs (DB-backed) jogosultsági workflow teszt: tenant-izoláció és
// szerepkör-kapuzás. A `requireHalaszatRole` guard authentikáció UTÁNI,
// DB-függő döntéslogikáját fedi (tagság-lookup + rangsor), a VALÓDI
// `meetsHalaszatRole` helperrel.
//
// HATÓKÖR-KORLÁT (őszinte): a HTTP-státusz leképezés (nincs session → 401,
// elutasítva → 403/404) a guardban/route-ban van, és Next cookie-kontextust
// igényel — ennek endpoint-szintű (HTTP) tesztje a dokumentált KÖVETKEZŐ lépés.
//
// BIZTONSÁG: kizárólag TEST_DATABASE_URL/DATABASE_URL_TEST ellen fut. Teszt-DB
// hiányában a blokk KIHAGYVA.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient, HalaszatSzerepkor } from "@prisma/client";
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
} from "./helpers/factories";
// A VALÓDI rangsor-logika, amit a guard is használ.
import { meetsHalaszatRole } from "@/lib/roles";

if (!INTEGRACIOS_DB_ELERHETO) {
    console.warn(`[integration] authorization KIHAGYVA — ${KIHAGYAS_OKA}`);
}

type HozzaferesDontes =
    | { ok: true; role: HalaszatSzerepkor }
    | { ok: false; status: 403 };

/**
 * A `requireHalaszatRole` DB-függő döntésének hű mása (a getAuthUser UTÁN):
 * aktív tagság-lookup + rangsor-ellenőrzés a valódi `meetsHalaszatRole`-lal.
 * Megjegyzés: a 401 (nincs session) a guardban, cookie alapján dől el — itt nem
 * modellezzük (endpoint-szintű következő lépés).
 */
async function dontesHalaszatHozzaferes(
    prisma: PrismaClient,
    halaszatId: number,
    felhasznaloId: number,
    minRole: HalaszatSzerepkor
): Promise<HozzaferesDontes> {
    const tagsag = await prisma.halaszatTagsag.findUnique({
        where: { halaszatId_felhasznaloId: { halaszatId, felhasznaloId } },
        select: { szerepkor: true, aktiv: true },
    });
    if (!tagsag || !tagsag.aktiv) return { ok: false, status: 403 };
    if (!meetsHalaszatRole(tagsag.szerepkor, minRole)) return { ok: false, status: 403 };
    return { ok: true, role: tagsag.szerepkor };
}

describe.skipIf(!INTEGRACIOS_DB_ELERHETO)("Integráció: jogosultsági workflow (DB-backed)", () => {
    let prisma: PrismaClient;
    const takaritas = new Takaritas();
    const prefix = egyediPrefix();

    beforeAll(async () => {
        prisma = getTestPrisma();
        ellenorizNemProduction(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? "");
        await prisma.$queryRaw`SELECT 1`;
    });

    afterAll(async () => {
        await takaritas.fuss(prisma);
        await disconnectTestPrisma();
    });

    it("B1) másik halászat tagja NEM fér hozzá az idegen halászathoz (→ 403)", async () => {
        const halaszatA = await letrehozHalaszat(prisma, `${prefix}_a`, takaritas);
        const halaszatB = await letrehozHalaszat(prisma, `${prefix}_b`, takaritas);
        const userA = await letrehozFelhasznalo(prisma, `${prefix}_a`, takaritas);
        await letrehozTagsag(prisma, halaszatA.azonosito, userA.azonosito, "STAFF");

        // userA tagja A-nak, de NEM tagja B-nek
        const sajat = await dontesHalaszatHozzaferes(prisma, halaszatA.azonosito, userA.azonosito, "STAFF");
        expect(sajat.ok).toBe(true);

        const idegen = await dontesHalaszatHozzaferes(prisma, halaszatB.azonosito, userA.azonosito, "STAFF");
        expect(idegen.ok).toBe(false);
        if (!idegen.ok) expect(idegen.status).toBe(403);
    });

    it("B2) STAFF NEM végezhet ADMIN-only műveletet a saját halászatában (→ 403)", async () => {
        const halaszat = await letrehozHalaszat(prisma, `${prefix}_c`, takaritas);
        const user = await letrehozFelhasznalo(prisma, `${prefix}_c`, takaritas);
        await letrehozTagsag(prisma, halaszat.azonosito, user.azonosito, "STAFF");

        // STAFF olvashat (STAFF minRole), de nem hozhat létre takarmányt (ADMIN minRole)
        const olvas = await dontesHalaszatHozzaferes(prisma, halaszat.azonosito, user.azonosito, "STAFF");
        expect(olvas.ok).toBe(true);

        const adminMuvelet = await dontesHalaszatHozzaferes(prisma, halaszat.azonosito, user.azonosito, "ADMIN");
        expect(adminMuvelet.ok).toBe(false);
        if (!adminMuvelet.ok) expect(adminMuvelet.status).toBe(403);
    });

    it("B3) inaktivált tagság elutasítva (→ 403)", async () => {
        const halaszat = await letrehozHalaszat(prisma, `${prefix}_d`, takaritas);
        const user = await letrehozFelhasznalo(prisma, `${prefix}_d`, takaritas);
        const tagsag = await letrehozTagsag(prisma, halaszat.azonosito, user.azonosito, "ADMIN");

        // aktívként ADMIN-művelet megengedett
        const elotte = await dontesHalaszatHozzaferes(prisma, halaszat.azonosito, user.azonosito, "ADMIN");
        expect(elotte.ok).toBe(true);

        // inaktiválás után tiltva
        await prisma.halaszatTagsag.update({ where: { azonosito: tagsag.azonosito }, data: { aktiv: false } });
        const utana = await dontesHalaszatHozzaferes(prisma, halaszat.azonosito, user.azonosito, "ADMIN");
        expect(utana.ok).toBe(false);
        if (!utana.ok) expect(utana.status).toBe(403);
    });
});
