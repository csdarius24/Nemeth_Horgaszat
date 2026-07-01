import { describe, it, expect } from "vitest";
import { ellenorizNemProduction } from "../integration/helpers/testDb";

// A production-guard tiszta függvényének unit-tesztje. Ez a biztonsági háló:
// garantálja, hogy az integrációs tesztek nem futhatnak a production DB ellen.

describe("ellenorizNemProduction() — production-guard", () => {
    it("dob, ha a host a production Hostinger szerver", () => {
        expect(() =>
            ellenorizNemProduction("mysql://u:p@srv1695.hstgr.io:3306/valami")
        ).toThrow(/BIZTONSÁGI LEÁLLÍTÁS/);
    });

    it("dob, ha a DB-név a production adatbázis", () => {
        expect(() =>
            ellenorizNemProduction("mysql://u:p@localhost:3306/u625819054_horgaszat_v1")
        ).toThrow(/BIZTONSÁGI LEÁLLÍTÁS/);
    });

    it("átengedi a biztonságos, lokális teszt-DB URL-t", () => {
        expect(() =>
            ellenorizNemProduction("mysql://root:root@127.0.0.1:3306/nemeth_horgaszat_test")
        ).not.toThrow();
    });

    it("átengedi a Docker/CI teszt-DB URL-t", () => {
        expect(() =>
            ellenorizNemProduction("mysql://test:test@mysql:3306/horgaszat_test")
        ).not.toThrow();
    });
});
