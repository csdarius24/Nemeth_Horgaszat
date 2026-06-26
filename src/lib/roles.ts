// Tiszta (pure) jogosultsági/rangsor logika — adatbázis és Next nélkül.
// Kiemelve a guards.ts-ből és a dolgozó-route-ból, hogy unit-tesztelhető legyen.
// A viselkedés azonos a korábbi inline logikával.
import type { Szerepkor, HalaszatSzerepkor } from "@prisma/client";

// Tó-szintű szerepkör rangsor (minRole logikához).
export const TO_ROLE_RANK: Record<Szerepkor, number> = {
    ANGLER: 1,
    OR: 2,
    STAFF: 3,
    ADMIN: 4,
    OWNER: 5,
};

// Halászat (tenant) szintű szerepkör rangsor.
export const HALASZAT_ROLE_RANK: Record<HalaszatSzerepkor, number> = {
    STAFF: 1,
    ADMIN: 2,
    OWNER: 3,
};

/** Igaz, ha a tó-szintű `role` eléri vagy meghaladja a `minRole` szintet. */
export function meetsToRole(role: Szerepkor, minRole: Szerepkor): boolean {
    return TO_ROLE_RANK[role] >= TO_ROLE_RANK[minRole];
}

/** Igaz, ha a halászat-szintű `role` eléri vagy meghaladja a `minRole` szintet. */
export function meetsHalaszatRole(role: HalaszatSzerepkor, minRole: HalaszatSzerepkor): boolean {
    return HALASZAT_ROLE_RANK[role] >= HALASZAT_ROLE_RANK[minRole];
}

/**
 * Megmondja, hogy `actorRole` kezelheti-e (módosíthatja/deaktiválhatja) a
 * `targetRole` szerepkörű dolgozót.
 * Szabályok: OWNER célt senki; OWNER STAFF+ADMIN-t; ADMIN csak STAFF-ot.
 */
export function canManageTarget(actorRole: HalaszatSzerepkor, targetRole: HalaszatSzerepkor): boolean {
    if (targetRole === "OWNER") return false;
    if (actorRole === "OWNER") return true;
    if (actorRole === "ADMIN") return targetRole === "STAFF";
    return false;
}

/**
 * Tiszta döntés: módosíthatja-e a hívó egy hibabejelentés státuszát.
 *
 * Szabályok:
 * - Ha a hibabejelentés **halászathoz kötött** (`bugHalaszatId != null`):
 *   a hívónak ADMIN vagy OWNER szerepkörűnek kell lennie **abban** a halászatban
 *   (`viewerRole` az adott halászatban érvényes szerepkör, vagy `null`, ha nem tag).
 * - Ha a hibabejelentés **globális** (`bugHalaszatId == null`):
 *   csak az **eredeti bejelentő** módosíthatja (`isReporter`).
 *
 * A `viewerRole` mindig a hibabejelentés saját halászatában érvényes szerepkör,
 * így a függvény tenant-átlépést nem enged (idegen halászatban szerzett ADMIN
 * nem ad jogot egy másik halászat bejelentéséhez).
 */
export function canUpdateHibabejelentesStatus(args: {
    bugHalaszatId: number | null;
    viewerRole: HalaszatSzerepkor | null;
    isReporter: boolean;
}): boolean {
    const { bugHalaszatId, viewerRole, isReporter } = args;
    if (bugHalaszatId != null) {
        return viewerRole != null && meetsHalaszatRole(viewerRole, "ADMIN");
    }
    return isReporter;
}
