import { describe, it, expect } from "vitest";
import {
    TO_ROLE_RANK,
    HALASZAT_ROLE_RANK,
    meetsToRole,
    meetsHalaszatRole,
    canManageTarget,
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
