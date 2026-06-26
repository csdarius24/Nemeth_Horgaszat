import { describe, it, expect } from "vitest";
import { szamitTakarmanyFelhasznalas, ketTizedes } from "@/lib/takarmany/keszlet";

describe("ketTizedes()", () => {
    it("2 tizedesre kerekít", () => {
        expect(ketTizedes(10)).toBe(10);
        expect(ketTizedes(10.005)).toBe(10.01);
        expect(ketTizedes(1.234)).toBe(1.23);
    });

    it("float-driftet kiküszöböl", () => {
        expect(ketTizedes(0.1 + 0.2)).toBe(0.3);
    });
});

describe("szamitTakarmanyFelhasznalas()", () => {
    it("levonja a mennyiséget elegendő készletnél", () => {
        const r = szamitTakarmanyFelhasznalas(100, 30);
        expect(r).toEqual({ ok: true, ujKeszlet: 70 });
    });

    it("pontosan a teljes készlet levonható (0 marad)", () => {
        const r = szamitTakarmanyFelhasznalas(25, 25);
        expect(r).toEqual({ ok: true, ujKeszlet: 0 });
    });

    it("float-drift nélkül számol (0.3 - 0.1 = 0.2)", () => {
        const r = szamitTakarmanyFelhasznalas(0.3, 0.1);
        expect(r).toEqual({ ok: true, ujKeszlet: 0.2 });
    });

    it("elutasít, ha a készlet kevesebb, mint a levonandó", () => {
        const r = szamitTakarmanyFelhasznalas(10, 10.01);
        expect(r).toEqual({ ok: false, hiba: "nincs_eleg_keszlet" });
    });

    it("elutasít nulla vagy negatív mennyiséget", () => {
        expect(szamitTakarmanyFelhasznalas(100, 0)).toEqual({ ok: false, hiba: "ervenytelen_mennyiseg" });
        expect(szamitTakarmanyFelhasznalas(100, -5)).toEqual({ ok: false, hiba: "ervenytelen_mennyiseg" });
    });

    it("elutasít nem véges bemenetet", () => {
        expect(szamitTakarmanyFelhasznalas(100, NaN)).toEqual({ ok: false, hiba: "ervenytelen_mennyiseg" });
        expect(szamitTakarmanyFelhasznalas(NaN, 10)).toEqual({ ok: false, hiba: "ervenytelen_mennyiseg" });
        expect(szamitTakarmanyFelhasznalas(100, Infinity)).toEqual({ ok: false, hiba: "ervenytelen_mennyiseg" });
    });
});
