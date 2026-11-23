import { describe, expect, it } from "vitest";
import { becsultKg, darabSulybol, kgBa, osszevonTomeg } from "@/lib/allomany/tomeg";

describe("kgBa", () => {
    it("mértékegységek", () => {
        expect(kgBa("12", "q")).toBe(1200);
        expect(kgBa("1,5", "t")).toBe(1500);
        expect(kgBa(250, "g")).toBe(0.25);
        expect(kgBa("", "kg")).toBeNull();
        expect(kgBa(0, "kg")).toBeNull();
        expect(kgBa("abc", "kg")).toBeNull();
    });
});

describe("darabSulybol", () => {
    it("12 mázsa, 1,5 kg-os átlagsúly → 800 db", () => {
        expect(darabSulybol("12", "q", "1,5", "kg")).toEqual({ ok: true, darab: 800, osszTomegKg: 1200, atlagTomegKg: 1.5 });
    });
    it("50 kg ivadék, 5 g átlag → 10 000 db", () => {
        expect(darabSulybol(50, "kg", 5, "g")).toMatchObject({ ok: true, darab: 10000, atlagTomegKg: 0.005 });
    });
    it("2 tonna, 350 g → kerekítve 5714 db", () => {
        expect(darabSulybol(2, "t", 350, "g")).toMatchObject({ ok: true, darab: 5714 });
    });
    it("hiányzó / hibás adatok", () => {
        expect(darabSulybol("", "kg", 1, "kg").ok).toBe(false);
        expect(darabSulybol(10, "kg", "", "kg").ok).toBe(false);
        expect(darabSulybol(1, "kg", 2, "kg").ok).toBe(false); // átlag > össz
    });
});

describe("osszevonTomeg", () => {
    it("súlyozott átlag: a becsült össztömeg összeadódik", () => {
        const regi = { darab: 8000, minTomegKg: 1.4, maxTomegKg: 1.6 };
        const uj = { darab: 2000, minTomegKg: 0.004, maxTomegKg: 0.006 };
        const o = osszevonTomeg(regi, uj);
        const ossz = becsultKg({ darab: 10000, ...o })!;
        expect(ossz).toBeCloseTo(becsultKg(regi)! + becsultKg(uj)!, 3); // 12000 + 10 = 12010
        expect(ossz).toBeCloseTo(12010, 3);
    });
    it("ha csak az egyik résznek van tömege, az marad", () => {
        expect(osszevonTomeg({ darab: 100, minTomegKg: 0, maxTomegKg: 0 }, { darab: 50, minTomegKg: 1, maxTomegKg: 1 }))
            .toEqual({ minTomegKg: 1, maxTomegKg: 1 });
        expect(osszevonTomeg({ darab: 100, minTomegKg: 2, maxTomegKg: 3 }, { darab: 50, minTomegKg: 0, maxTomegKg: 0 }))
            .toEqual({ minTomegKg: 2, maxTomegKg: 3 });
    });
    it("üres meglévő állomány (0 db) → az új tartománya", () => {
        expect(osszevonTomeg({ darab: 0, minTomegKg: 5, maxTomegKg: 5 }, { darab: 10, minTomegKg: 1, maxTomegKg: 2 }))
            .toEqual({ minTomegKg: 1, maxTomegKg: 2 });
    });
    it("egyiknek sincs tömege → 0", () => {
        expect(osszevonTomeg({ darab: 1, minTomegKg: 0, maxTomegKg: 0 }, { darab: 1, minTomegKg: 0, maxTomegKg: 0 }))
            .toEqual({ minTomegKg: 0, maxTomegKg: 0 });
    });
});
