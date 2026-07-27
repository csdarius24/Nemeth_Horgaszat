import { describe, it, expect } from "vitest";
import {
    becsultAllomanyKg,
    foFajok,
    szamitTakarmanyFedezet,
    szamitTelitettseg,
    szamitAllapot,
    ertekVagyNincsAdat,
    toTipusCimke,
    allapotCimke,
    NINCS_ADAT,
    type AllomanyTetel,
} from "@/lib/toak/attekintes";

const tetel = (p: Partial<AllomanyTetel> = {}): AllomanyTetel => ({
    halfajNev: "Ponty", darab: 100, minTomegKg: 1, maxTomegKg: 3, ...p,
});

describe("becsultAllomanyKg()", () => {
    it("darab × átlagsúly alapján becsül", () => {
        // 100 db × (1+3)/2 = 200 kg
        const r = becsultAllomanyKg([tetel()]);
        expect(r.kg).toBe(200);
        expect(r.darab).toBe(100);
        expect(r.reszleges).toBe(false);
    });

    it("több tételt összead", () => {
        const r = becsultAllomanyKg([
            tetel({ darab: 10, minTomegKg: 1, maxTomegKg: 1 }),   // 10
            tetel({ darab: 5, minTomegKg: 2, maxTomegKg: 4 }),    // 15
        ]);
        expect(r.kg).toBe(25);
        expect(r.darab).toBe(15);
    });

    it("null kg-ot ad, ha egyetlen tételhez sincs tömegadat", () => {
        const r = becsultAllomanyKg([tetel({ minTomegKg: 0, maxTomegKg: 0 })]);
        expect(r.kg).toBeNull();
        expect(r.darab).toBe(100);
    });

    it("reszleges=true, ha csak néhány tételnek van tömegadata", () => {
        const r = becsultAllomanyKg([
            tetel({ darab: 10, minTomegKg: 1, maxTomegKg: 1 }),
            tetel({ darab: 20, minTomegKg: 0, maxTomegKg: 0 }),
        ]);
        expect(r.kg).toBe(10);
        expect(r.darab).toBe(30);
        expect(r.reszleges).toBe(true);
    });

    it("üres listára null kg / 0 darab", () => {
        const r = becsultAllomanyKg([]);
        expect(r.kg).toBeNull();
        expect(r.darab).toBe(0);
    });
});

describe("foFajok()", () => {
    it("darabszám szerint csökkenően ad vissza", () => {
        const s = foFajok([
            tetel({ halfajNev: "Amur", darab: 20 }),
            tetel({ halfajNev: "Ponty", darab: 100 }),
        ], 2);
        expect(s).toBe("Ponty, Amur");
    });

    it("a limiten túli fajokat +N-ként jelzi", () => {
        const s = foFajok([
            tetel({ halfajNev: "Ponty", darab: 100 }),
            tetel({ halfajNev: "Amur", darab: 50 }),
            tetel({ halfajNev: "Busa", darab: 10 }),
        ], 2);
        expect(s).toBe("Ponty, Amur +1");
    });

    it("null, ha nincs állomány", () => {
        expect(foFajok([])).toBeNull();
        expect(foFajok([tetel({ darab: 0 })])).toBeNull();
    });
});

describe("szamitTakarmanyFedezet()", () => {
    it("készlet / napi fogyás", () => {
        expect(szamitTakarmanyFedezet(100, 10)).toBe(10);
    });

    it("egy tizedesre kerekít", () => {
        expect(szamitTakarmanyFedezet(100, 3)).toBe(33.3);
    });

    it("null, ha nincs mérhető fogyás", () => {
        expect(szamitTakarmanyFedezet(100, 0)).toBeNull();
        expect(szamitTakarmanyFedezet(100, null)).toBeNull();
    });

    it("null érvénytelen bemenetre", () => {
        expect(szamitTakarmanyFedezet(NaN, 10)).toBeNull();
        expect(szamitTakarmanyFedezet(-5, 10)).toBeNull();
    });
});

describe("szamitTelitettseg()", () => {
    it("százalékot számol a kapacitáshoz képest", () => {
        expect(szamitTelitettseg(500, 1000)).toBe(50);
    });

    it("null, ha nincs kapacitás megadva", () => {
        expect(szamitTelitettseg(500, null)).toBeNull();
        expect(szamitTelitettseg(500, 0)).toBeNull();
    });

    it("null, ha nincs becsült állomány", () => {
        expect(szamitTelitettseg(null, 1000)).toBeNull();
    });
});

describe("szamitAllapot()", () => {
    it("nincs_adat: se állomány, se művelet", () => {
        expect(szamitAllapot({ vanAllomany: false, utolsoEsemenyNapja: null, fedezetNap: null }))
            .toBe("nincs_adat");
    });

    it("figyelendo: nincs állomány (de volt művelet)", () => {
        expect(szamitAllapot({ vanAllomany: false, utolsoEsemenyNapja: 1, fedezetNap: null }))
            .toBe("figyelendo");
    });

    it("figyelendo: 14+ napja nincs művelet", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 20, fedezetNap: null }))
            .toBe("figyelendo");
    });

    it("figyelendo: alacsony takarmány-fedezet", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 1, fedezetNap: 3 }))
            .toBe("figyelendo");
    });

    it("kivalo: friss művelet + bőséges fedezet", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 1, fedezetNap: 30 }))
            .toBe("kivalo");
    });

    it("kivalo: friss művelet, fedezet nem számolható", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 0, fedezetNap: null }))
            .toBe("kivalo");
    });

    it("jo: van állomány, de a művelet nem friss (és nincs figyelmeztetés)", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 7, fedezetNap: 30 }))
            .toBe("jo");
    });

    it("jo: friss művelet, de közepes fedezet", () => {
        expect(szamitAllapot({ vanAllomany: true, utolsoEsemenyNapja: 1, fedezetNap: 10 }))
            .toBe("jo");
    });
});

describe("ertekVagyNincsAdat()", () => {
    it("null / undefined / üres esetén 'nincs adat'", () => {
        expect(ertekVagyNincsAdat(null)).toBe(NINCS_ADAT);
        expect(ertekVagyNincsAdat(undefined)).toBe(NINCS_ADAT);
        expect(ertekVagyNincsAdat("")).toBe(NINCS_ADAT);
        expect(ertekVagyNincsAdat(NaN)).toBe(NINCS_ADAT);
    });

    it("formázót alkalmaz számra", () => {
        expect(ertekVagyNincsAdat(2.5, (x) => `${x} ha`)).toBe("2.5 ha");
    });

    it("nullát is valós értékként kezel", () => {
        expect(ertekVagyNincsAdat(0, (x) => `${x} m`)).toBe("0 m");
    });
});

describe("cimkek", () => {
    it("tó típus címkék", () => {
        expect(toTipusCimke("TO")).toBe("Tó");
        expect(toTipusCimke("TELELO")).toBe("Telelő");
        expect(toTipusCimke("IVADEKNEVELO")).toBe("Ivadéknevelő");
        expect(toTipusCimke("KELTETO_MEDENCE")).toBe("Keltető medence");
    });

    it("ismeretlen típust változatlanul ad vissza", () => {
        expect(toTipusCimke("EGYEB")).toBe("EGYEB");
    });

    it("állapot címkék", () => {
        expect(allapotCimke("kivalo")).toBe("Kiváló");
        expect(allapotCimke("jo")).toBe("Jó");
        expect(allapotCimke("figyelendo")).toBe("Figyelendő");
        expect(allapotCimke("nincs_adat")).toBe("Nincs adat");
    });
});
