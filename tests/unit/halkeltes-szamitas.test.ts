import { describe, it, expect } from "vitest";
import {
    kerekit,
    ikrasSorSzamitas,
    tejesSorSzamitas,
    ciklusOsszegzes,
    halkeltesStatuszCimke,
    ervenyesHalkeltesStatusz,
    ALAP_RAHAGYAS,
    type Protokoll,
} from "@/lib/halkeltes/szamitas";

const P: Protokoll = {
    ikrasEloadagMgPerKg: 0.3,
    ikrasDontoMgPerKg: 3,
    ikrasMlPerKg: 0.5,
    tejesMgPerKg: 1.5,
    tejesMlPerKg: 0.25,
    rahagyasSzorzo: 1.1,
};

describe("kerekit()", () => {
    it("adott tizedesre kerekít, float-drift nélkül", () => {
        expect(kerekit(0.1 + 0.2, 2)).toBe(0.3);
        expect(kerekit(1.23456, 3)).toBe(1.235);
        expect(kerekit(10, 2)).toBe(10);
    });
});

describe("ikrasSorSzamitas()", () => {
    it("kg × protokoll-értékek", () => {
        const r = ikrasSorSzamitas({ tomegKg: 10 }, P);
        expect(r.eloadagMg).toBe(3);   // 10 × 0.3
        expect(r.dontoMg).toBe(30);    // 10 × 3
        expect(r.ml).toBe(5);          // 10 × 0.5
    });

    it("hiányzó kg → minden null", () => {
        const r = ikrasSorSzamitas({ tomegKg: null }, P);
        expect(r.eloadagMg).toBeNull();
        expect(r.dontoMg).toBeNull();
        expect(r.ml).toBeNull();
    });

    it("hiányzó protokoll-érték → az adott mező null", () => {
        const r = ikrasSorSzamitas({ tomegKg: 10 }, { ...P, ikrasMlPerKg: null });
        expect(r.eloadagMg).toBe(3);
        expect(r.ml).toBeNull();
    });
});

describe("tejesSorSzamitas()", () => {
    it("kg × protokoll-értékek", () => {
        const r = tejesSorSzamitas({ tomegKg: 4 }, P);
        expect(r.mg).toBe(6);      // 4 × 1.5
        expect(r.ml).toBe(1);      // 4 × 0.25
    });

    it("hiányzó kg → null", () => {
        const r = tejesSorSzamitas({ tomegKg: null }, P);
        expect(r.mg).toBeNull();
        expect(r.ml).toBeNull();
    });
});

describe("ciklusOsszegzes()", () => {
    it("darabszám, kg- és adag-összegek + oltandó (×ráhagyás)", () => {
        const o = ciklusOsszegzes(
            [{ tomegKg: 10, ikraKg: 2 }, { tomegKg: 5, ikraKg: 1 }],  // 15 kg, 3 kg ikra
            [{ tomegKg: 4, tejMl: 3 }],                                // 4 kg, 3 ml tej
            P,
        );
        expect(o.ikrasDarab).toBe(2);
        expect(o.tejesDarab).toBe(1);
        expect(o.ikrasOsszKg).toBe(15);
        expect(o.tejesOsszKg).toBe(4);
        expect(o.ikraOsszKg).toBe(3);
        expect(o.tejOsszMl).toBe(3);
        // előadag: 15 × 0.3 = 4.5 ; döntő: 15 × 3 = 45 ; ml: 15 × 0.5 = 7.5
        expect(o.ikrasEloadagOsszMg).toBe(4.5);
        expect(o.ikrasDontoOsszMg).toBe(45);
        expect(o.ikrasOsszMl).toBe(7.5);
        // tejes: 4 × 1.5 = 6 mg ; 4 × 0.25 = 1 ml
        expect(o.tejesOsszMg).toBe(6);
        expect(o.tejesOsszMl).toBe(1);
        // oltandó = adag × 1.1
        expect(o.rahagyasSzorzo).toBe(1.1);
        expect(o.oltandoEloadagMg).toBe(kerekit(4.5 * 1.1, 3)); // 4.95
        expect(o.oltandoDontoMg).toBe(kerekit(45 * 1.1, 3));    // 49.5
    });

    it("hiányzó kg-ú sor beleszámít a darabszámba, de nem a kg-/adag-összegbe", () => {
        const o = ciklusOsszegzes(
            [{ tomegKg: 10, ikraKg: null }, { tomegKg: null, ikraKg: null }],
            [],
            P,
        );
        expect(o.ikrasDarab).toBe(2);
        expect(o.ikrasOsszKg).toBe(10);
        expect(o.ikrasEloadagOsszMg).toBe(3); // csak az első sor
    });

    it("üres ciklus → nullák, de a ráhagyás szorzó megmarad", () => {
        const o = ciklusOsszegzes([], [], P);
        expect(o.ikrasDarab).toBe(0);
        expect(o.ikrasOsszKg).toBe(0);
        expect(o.oltandoEloadagMg).toBe(0);
        expect(o.rahagyasSzorzo).toBe(1.1);
    });

    it("hiányzó ráhagyás szorzó → alapértelmezett 1.10", () => {
        const o = ciklusOsszegzes([{ tomegKg: 10 }], [], { ...P, rahagyasSzorzo: null });
        expect(o.rahagyasSzorzo).toBe(ALAP_RAHAGYAS);
        expect(o.oltandoEloadagMg).toBe(kerekit(3 * ALAP_RAHAGYAS, 3)); // 3.3
    });
});

describe("státusz helper", () => {
    it("címkék", () => {
        expect(halkeltesStatuszCimke("TERVEZET")).toBe("Tervezet");
        expect(halkeltesStatuszCimke("FOLYAMATBAN")).toBe("Folyamatban");
        expect(halkeltesStatuszCimke("LEZARVA")).toBe("Lezárva");
        expect(halkeltesStatuszCimke("ISMERETLEN")).toBe("ISMERETLEN");
    });

    it("érvényesség-ellenőrzés", () => {
        expect(ervenyesHalkeltesStatusz("TERVEZET")).toBe(true);
        expect(ervenyesHalkeltesStatusz("VALAMI")).toBe(false);
        expect(ervenyesHalkeltesStatusz(5)).toBe(false);
    });
});
