import { describe, expect, it } from "vitest";
import {
    bevitelKgBan,
    kgToTonna,
    osszVizkapacitas,
    szamitKapacitasKihasznaltsag,
    tonnaToKg,
} from "@/lib/toak/kapacitas";

describe("kg ↔ tonna átváltás", () => {
    it("kg → t", () => {
        expect(kgToTonna(15000)).toBe(15);
        expect(kgToTonna(1234)).toBe(1.234);
    });
    it("t → kg", () => {
        expect(tonnaToKg(15)).toBe(15000);
        expect(tonnaToKg(0.5)).toBe(500);
    });
});

describe("bevitelKgBan", () => {
    it("kg bevitel változatlan", () => expect(bevitelKgBan("15000", "kg")).toBe(15000));
    it("tonna bevitel átváltódik", () => expect(bevitelKgBan("15", "t")).toBe(15000));
    it("tizedesvessző elfogadott", () => expect(bevitelKgBan("1,5", "t")).toBe(1500));
    it("üres / nulla / negatív / szöveg → null", () => {
        expect(bevitelKgBan("", "kg")).toBeNull();
        expect(bevitelKgBan("0", "kg")).toBeNull();
        expect(bevitelKgBan("-5", "t")).toBeNull();
        expect(bevitelKgBan("abc", "kg")).toBeNull();
    });
});

describe("szamitKapacitasKihasznaltsag", () => {
    it("ügyfél-példa: 12 t / 15 t = 80%, 3 t szabad", () => {
        expect(szamitKapacitasKihasznaltsag(12000, 15000)).toEqual({
            szazalek: 80,
            szabadKg: 3000,
            szint: "rendben",
        });
    });
    it("90%-tól közelít", () => {
        expect(szamitKapacitasKihasznaltsag(13500, 15000)?.szint).toBe("kozel");
        expect(szamitKapacitasKihasznaltsag(15000, 15000)?.szint).toBe("kozel");
    });
    it("100% fölött túllépés, negatív szabad kapacitás", () => {
        const k = szamitKapacitasKihasznaltsag(16500, 15000);
        expect(k?.szint).toBe("tullepve");
        expect(k?.szabadKg).toBe(-1500);
        expect(k?.szazalek).toBe(110);
    });
    it("üres tó: 0%", () => {
        expect(szamitKapacitasKihasznaltsag(0, 15000)?.szazalek).toBe(0);
    });
    it("nincs eltartóképesség vagy állomány-becslés → null", () => {
        expect(szamitKapacitasKihasznaltsag(1000, null)).toBeNull();
        expect(szamitKapacitasKihasznaltsag(1000, 0)).toBeNull();
        expect(szamitKapacitasKihasznaltsag(null, 15000)).toBeNull();
    });
});

describe("osszVizkapacitas", () => {
    it("összegzi a megadottakat, számolja a hiányzókat", () => {
        expect(osszVizkapacitas([1000, 2500.5, null, undefined, 0])).toEqual({
            osszM3: 3500.5,
            megadva: 2,
            hianyzik: 3,
        });
    });
    it("üres lista", () => {
        expect(osszVizkapacitas([])).toEqual({ osszM3: 0, megadva: 0, hianyzik: 0 });
    });
});

import { kapacitasRiasztasok } from "@/lib/dashboard/riasztasok";

describe("kapacitasRiasztasok", () => {
    const to = (azonosito: number, allomany: number | null, kap: number | null, aktiv = true) => ({
        azonosito,
        nev: `Tó ${azonosito}`,
        aktiv,
        kihasznaltsag: szamitKapacitasKihasznaltsag(allomany, kap),
    });

    it("túllépés → magas, közel → közepes, rendben → nincs", () => {
        const r = kapacitasRiasztasok([to(1, 16000, 15000), to(2, 14000, 15000), to(3, 12000, 15000)]);
        expect(r.map((x) => [x.kod, x.sulyossag, x.eroforrasId])).toEqual([
            ["KAPACITAS_TULLEPVE", "magas", 1],
            ["KAPACITAS_KOZEL", "kozepes", 2],
        ]);
    });
    it("inaktív tó vagy hiányzó eltartóképesség → nincs riasztás", () => {
        expect(kapacitasRiasztasok([to(1, 16000, 15000, false), to(2, 16000, null)])).toEqual([]);
    });
});

import { becsultAllomanyKg } from "@/lib/toak/attekintes";

describe("ivadék tömeg (kis tizedesek)", () => {
    it("10 000 db × 4–6 g ivadék ≈ 50 kg, nem kerekedik 0-ra", () => {
        const b = becsultAllomanyKg([{ halfajNev: "Ponty", darab: 10000, minTomegKg: 0.004, maxTomegKg: 0.006 }]);
        expect(b.kg).toBe(50);
        expect(szamitKapacitasKihasznaltsag(b.kg, 1000)?.szazalek).toBe(5);
    });
});
