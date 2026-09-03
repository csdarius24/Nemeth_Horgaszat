import { describe, it, expect } from "vitest";
import {
    normalizaltSzin, ervenyesSzin, ALAP_SZIN, FELADAT_SZINEK,
    feladatStatuszCimke, feladatPrioritasCimke, ervenyesStatusz, ervenyesPrioritas,
    nyitottStatusz, lejart, hatralevoNap, elkeszultAtValtozas,
    canManageFeladat, canStaffFrissitStatusz, staffAllithatStatusz,
} from "@/lib/feladatok/format";

describe("normalizaltSzin() — CSS-injection védelem", () => {
    it("elfogadja a preset színeket", () => {
        for (const c of FELADAT_SZINEK) expect(normalizaltSzin(c)).toBe(c);
    });
    it("elfogad tetszőleges #rrggbb hexet (kisbetűsítve)", () => {
        expect(normalizaltSzin("#ABCDEF")).toBe("#abcdef");
        expect(normalizaltSzin("  #123456  ")).toBe("#123456");
    });
    it("alapszínt ad érvénytelen/veszélyes bemenetre", () => {
        expect(normalizaltSzin("red; background: url(x)")).toBe(ALAP_SZIN);
        expect(normalizaltSzin("javascript:alert(1)")).toBe(ALAP_SZIN);
        expect(normalizaltSzin("#12")).toBe(ALAP_SZIN);
        expect(normalizaltSzin("rgb(1,2,3)")).toBe(ALAP_SZIN);
        expect(normalizaltSzin(null)).toBe(ALAP_SZIN);
        expect(normalizaltSzin(42)).toBe(ALAP_SZIN);
    });
    it("ervenyesSzin csak valódi színre igaz", () => {
        expect(ervenyesSzin("#2563eb")).toBe(true);
        expect(ervenyesSzin("#abcdef")).toBe(true);
        expect(ervenyesSzin("piros")).toBe(false);
        expect(ervenyesSzin("#xyzxyz")).toBe(false);
    });
});

describe("címkék + érvényesség", () => {
    it("státusz-címkék", () => {
        expect(feladatStatuszCimke("UJ")).toBe("Új");
        expect(feladatStatuszCimke("FOLYAMATBAN")).toBe("Folyamatban");
        expect(feladatStatuszCimke("KESZ")).toBe("Kész");
        expect(feladatStatuszCimke("ELHALASZTVA")).toBe("Elhalasztva");
        expect(feladatStatuszCimke("TOROLVE")).toBe("Törölve");
        expect(feladatStatuszCimke("X")).toBe("X");
    });
    it("prioritás-címkék", () => {
        expect(feladatPrioritasCimke("SURGOS")).toBe("Sürgős");
        expect(feladatPrioritasCimke("NORMAL")).toBe("Normál");
    });
    it("érvényesség-ellenőrzők", () => {
        expect(ervenyesStatusz("KESZ")).toBe(true);
        expect(ervenyesStatusz("NEM")).toBe(false);
        expect(ervenyesPrioritas("MAGAS")).toBe(true);
        expect(ervenyesPrioritas("EXTRA")).toBe(false);
    });
    it("nyitott státusz", () => {
        expect(nyitottStatusz("UJ")).toBe(true);
        expect(nyitottStatusz("FOLYAMATBAN")).toBe(true);
        expect(nyitottStatusz("ELHALASZTVA")).toBe(true);
        expect(nyitottStatusz("KESZ")).toBe(false);
        expect(nyitottStatusz("TOROLVE")).toBe(false);
    });
});

describe("lejart() / hatralevoNap()", () => {
    const most = new Date("2026-06-28T12:00:00Z");
    it("lejárt, ha nyitott és a határidő elmúlt", () => {
        expect(lejart("2026-06-27T12:00:00Z", "UJ", most)).toBe(true);
        expect(lejart("2026-06-29T12:00:00Z", "UJ", most)).toBe(false);
    });
    it("KESZ/TOROLVE sosem lejárt", () => {
        expect(lejart("2026-06-01T12:00:00Z", "KESZ", most)).toBe(false);
        expect(lejart("2026-06-01T12:00:00Z", "TOROLVE", most)).toBe(false);
    });
    it("nincs határidő → nem lejárt / null", () => {
        expect(lejart(null, "UJ", most)).toBe(false);
        expect(hatralevoNap(null, most)).toBeNull();
    });
    it("hátralévő napok előjele", () => {
        expect(hatralevoNap("2026-06-30T12:00:00Z", most)).toBe(2);
        expect(hatralevoNap("2026-06-26T12:00:00Z", most)).toBe(-2);
    });
});

describe("elkeszultAtValtozas()", () => {
    const most = new Date("2026-06-28T12:00:00Z");
    it("KESZ-re váltáskor beállít, ha még nincs", () => {
        expect(elkeszultAtValtozas("KESZ", null, most)).toBe(most);
    });
    it("KESZ-re váltáskor megtartja a meglévőt", () => {
        const regi = new Date("2026-06-01T00:00:00Z");
        expect(elkeszultAtValtozas("KESZ", regi, most)).toBe(regi);
    });
    it("KESZ-ről váltáskor törli", () => {
        expect(elkeszultAtValtozas("FOLYAMATBAN", new Date(), most)).toBeNull();
    });
    it("nem-KESZ és nincs elkészülés → ne módosítson (undefined)", () => {
        expect(elkeszultAtValtozas("FOLYAMATBAN", null, most)).toBeUndefined();
    });
});

describe("jogosultság", () => {
    it("ADMIN/OWNER kezelheti, STAFF nem (általános kezelés)", () => {
        expect(canManageFeladat("ADMIN")).toBe(true);
        expect(canManageFeladat("OWNER")).toBe(true);
        expect(canManageFeladat("STAFF")).toBe(false);
        expect(canManageFeladat(null)).toBe(false);
    });
    it("STAFF a saját feladata státuszát állíthatja", () => {
        expect(canStaffFrissitStatusz("STAFF", 7, 7)).toBe(true);   // saját
        expect(canStaffFrissitStatusz("STAFF", 8, 7)).toBe(false);  // másé
        expect(canStaffFrissitStatusz("STAFF", null, 7)).toBe(false); // kiosztatlan
        expect(canStaffFrissitStatusz("ADMIN", 999, 7)).toBe(true); // admin bármit
    });
    it("STAFF csak engedett státuszokat állíthat", () => {
        expect(staffAllithatStatusz("FOLYAMATBAN")).toBe(true);
        expect(staffAllithatStatusz("KESZ")).toBe(true);
        expect(staffAllithatStatusz("UJ")).toBe(true);
        expect(staffAllithatStatusz("TOROLVE")).toBe(false);
        expect(staffAllithatStatusz("ELHALASZTVA")).toBe(false);
    });
});
