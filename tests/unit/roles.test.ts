import { describe, it, expect } from "vitest";
import {
    TO_ROLE_RANK,
    HALASZAT_ROLE_RANK,
    meetsToRole,
    meetsHalaszatRole,
    canManageTarget,
    canUpdateHibabejelentesStatus,
} from "@/lib/roles";

describe("szerepkör rangsorok", () => {
    it("a halászat-szintű rangsor növekvő: STAFF < ADMIN < OWNER", () => {
        expect(HALASZAT_ROLE_RANK.STAFF).toBeLessThan(HALASZAT_ROLE_RANK.ADMIN);
        expect(HALASZAT_ROLE_RANK.ADMIN).toBeLessThan(HALASZAT_ROLE_RANK.OWNER);
    });

    it("a tó-szintű rangsor növekvő: ANGLER < OR < STAFF < ADMIN < OWNER", () => {
        expect(TO_ROLE_RANK.ANGLER).toBeLessThan(TO_ROLE_RANK.OR);
        expect(TO_ROLE_RANK.OR).toBeLessThan(TO_ROLE_RANK.STAFF);
        expect(TO_ROLE_RANK.STAFF).toBeLessThan(TO_ROLE_RANK.ADMIN);
        expect(TO_ROLE_RANK.ADMIN).toBeLessThan(TO_ROLE_RANK.OWNER);
    });
});

describe("meetsHalaszatRole()", () => {
    it("magasabb vagy egyenlő szerepkör átmegy", () => {
        expect(meetsHalaszatRole("OWNER", "ADMIN")).toBe(true);
        expect(meetsHalaszatRole("ADMIN", "ADMIN")).toBe(true);
        expect(meetsHalaszatRole("STAFF", "STAFF")).toBe(true);
    });

    it("alacsonyabb szerepkör elbukik", () => {
        expect(meetsHalaszatRole("STAFF", "ADMIN")).toBe(false);
        expect(meetsHalaszatRole("ADMIN", "OWNER")).toBe(false);
    });
});

describe("meetsToRole()", () => {
    it("magasabb vagy egyenlő szerepkör átmegy", () => {
        expect(meetsToRole("OWNER", "ANGLER")).toBe(true);
        expect(meetsToRole("STAFF", "OR")).toBe(true);
        expect(meetsToRole("ANGLER", "ANGLER")).toBe(true);
    });

    it("alacsonyabb szerepkör elbukik", () => {
        expect(meetsToRole("ANGLER", "STAFF")).toBe(false);
        expect(meetsToRole("OR", "ADMIN")).toBe(false);
    });
});

describe("canManageTarget()", () => {
    it("OWNER célt senki nem kezelhet", () => {
        expect(canManageTarget("OWNER", "OWNER")).toBe(false);
        expect(canManageTarget("ADMIN", "OWNER")).toBe(false);
    });

    it("OWNER kezelheti az ADMIN-t és a STAFF-ot", () => {
        expect(canManageTarget("OWNER", "ADMIN")).toBe(true);
        expect(canManageTarget("OWNER", "STAFF")).toBe(true);
    });

    it("ADMIN csak STAFF-ot kezelhet, ADMIN-t nem", () => {
        expect(canManageTarget("ADMIN", "STAFF")).toBe(true);
        expect(canManageTarget("ADMIN", "ADMIN")).toBe(false);
    });

    it("STAFF senkit nem kezelhet", () => {
        expect(canManageTarget("STAFF", "STAFF")).toBe(false);
        expect(canManageTarget("STAFF", "ADMIN")).toBe(false);
    });
});

describe("canUpdateHibabejelentesStatus()", () => {
    describe("halászathoz kötött bejelentés (bugHalaszatId != null)", () => {
        it("ADMIN és OWNER módosíthat", () => {
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: "ADMIN", isReporter: false })).toBe(true);
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: "OWNER", isReporter: false })).toBe(true);
        });

        it("STAFF nem módosíthat, akkor sem, ha ő a bejelentő", () => {
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: "STAFF", isReporter: false })).toBe(false);
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: "STAFF", isReporter: true })).toBe(false);
        });

        it("nem-tag (viewerRole null) nem módosíthat — tenant-átlépés kizárva", () => {
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: null, isReporter: false })).toBe(false);
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: 1, viewerRole: null, isReporter: true })).toBe(false);
        });
    });

    describe("globális bejelentés (bugHalaszatId == null)", () => {
        it("csak az eredeti bejelentő módosíthat", () => {
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: null, viewerRole: null, isReporter: true })).toBe(true);
        });

        it("nem a bejelentő nem módosíthat, magas szerepkörrel sem", () => {
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: null, viewerRole: null, isReporter: false })).toBe(false);
            expect(canUpdateHibabejelentesStatus({ bugHalaszatId: null, viewerRole: "OWNER", isReporter: false })).toBe(false);
        });
    });
});
