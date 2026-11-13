import { describe, expect, it } from "vitest";
import { egtaj, feldolgozMetno, helyiDatum, msToKmh, type Nap } from "@/lib/idojaras/metno";
import { szelsosegek } from "@/lib/idojaras/szelsoseg";

// Szintetikus MET Norway "complete" válasz:
// 2026-07-01 08:00Z-től 24 óránkénti elem (next_1_hours), utána 6 óránkéntiek (next_6_hours).
// Nyáron Budapest = UTC+2, tehát 22:00Z már másnap (07-02) helyi idő szerint.
function valasz() {
    const ts: unknown[] = [];
    const start = Date.parse("2026-07-01T08:00:00Z");
    for (let i = 0; i < 24; i++) {
        const t = new Date(start + i * 3_600_000).toISOString();
        ts.push({
            time: t,
            data: {
                instant: { details: { air_temperature: 20 + i * 0.5, relative_humidity: 60, wind_speed: 5, wind_from_direction: 225, wind_speed_of_gust: 10, air_pressure_at_sea_level: 1013.4 } },
                next_1_hours: {
                    summary: { symbol_code: i === 4 ? "rainandthunder" : "partlycloudy_day" },
                    details: { precipitation_amount: 1, probability_of_precipitation: 40, probability_of_thunder: i === 4 ? 50 : 0 },
                },
            },
        });
    }
    // 6 órás blokkok 08:00Z-től (07-02), a 6 órás csapadék 6 mm.
    for (let j = 0; j < 4; j++) {
        const t = new Date(Date.parse("2026-07-02T08:00:00Z") + j * 6 * 3_600_000).toISOString();
        ts.push({
            time: t,
            data: {
                instant: { details: { air_temperature: 25, wind_speed: 3 } },
                next_6_hours: {
                    summary: { symbol_code: "clearsky_day" },
                    details: { precipitation_amount: 6, air_temperature_max: 33, air_temperature_min: 18, probability_of_precipitation: 10 },
                },
            },
        });
    }
    return { properties: { meta: { updated_at: "2026-07-01T07:30:00Z" }, timeseries: ts } };
}

const MOST = new Date("2026-07-01T08:20:00Z");

describe("feldolgozMetno", () => {
    it("aktuális értékek az első (folyamatban lévő) órából", () => {
        const e = feldolgozMetno(valasz(), MOST);
        expect(e.frissitve).toBe("2026-07-01T07:30:00Z");
        expect(e.aktualis).toMatchObject({
            homersekletC: 20,
            paratartalomSzazalek: 60,
            szelSebessegKmh: 18, // 5 m/s
            szelLokesKmh: 36, // 10 m/s
            szelIranyFok: 225,
            legnyomasHpa: 1013,
            csapadekMm: 1,
            szimbolum: "partlycloudy_day",
        });
    });

    it("múltbeli elemeket kihagyja", () => {
        const e = feldolgozMetno(valasz(), new Date("2026-07-01T12:10:00Z"));
        expect(e.aktualis?.ido).toBe("2026-07-01T12:00:00.000Z");
    });

    it("óránkénti lista: csak az 1 órás bontású elemek, limitálva", () => {
        expect(feldolgozMetno(valasz(), MOST, 12).orak).toHaveLength(12);
        expect(feldolgozMetno(valasz(), MOST, 100).orak).toHaveLength(24);
    });

    it("napi bontás helyi (budapesti) dátum szerint", () => {
        const { napok } = feldolgozMetno(valasz(), MOST);
        expect(napok.map((n) => n.datum)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
        // 07-01 helyi: 08Z–21Z = 14 óra × 1 mm
        expect(napok[0].csapadekMm).toBe(14);
        expect(napok[0].maxC).toBe(26.5);
        expect(napok[0].zivatarValoszinusegSzazalek).toBe(50);
    });

    it("a csapadék nem duplázódik az 1 és 6 órás bontás határán", () => {
        const { napok } = feldolgozMetno(valasz(), MOST);
        const ossz = napok.reduce((s, n) => s + n.csapadekMm, 0);
        // 24 × 1 mm (órás) + 4 × 6 mm (6 órás) = 48 mm
        expect(ossz).toBe(48);
    });

    it("a 6 órás min/max is beszámít", () => {
        const { napok } = feldolgozMetno(valasz(), MOST);
        expect(napok[1].maxC).toBe(33);
        expect(napok[1].minC).toBe(18);
    });

    it("a végén lévő csonka napot (időszak-összegzés nélkül) kihagyja", () => {
        const v = valasz();
        v.properties.timeseries.push({ time: "2026-07-04T08:00:00Z", data: { instant: { details: { air_temperature: 5 } } } });
        const { napok } = feldolgozMetno(v, MOST);
        expect(napok.map((n) => n.datum)).not.toContain("2026-07-04");
    });

    it("üres / hibás válasz → üres előrejelzés", () => {
        expect(feldolgozMetno(null, MOST)).toEqual({ frissitve: null, aktualis: null, orak: [], napok: [] });
        expect(feldolgozMetno({ properties: { timeseries: "x" } }, MOST).napok).toEqual([]);
    });
});

describe("segédek", () => {
    it("helyiDatum: UTC este 22:00 nyáron már másnap Budapesten", () => {
        expect(helyiDatum("2026-07-01T21:59:00Z")).toBe("2026-07-01");
        expect(helyiDatum("2026-07-01T22:00:00Z")).toBe("2026-07-02");
        // télen UTC+1
        expect(helyiDatum("2026-01-15T23:00:00Z")).toBe("2026-01-16");
    });
    it("msToKmh", () => {
        expect(msToKmh(10)).toBe(36);
        expect(msToKmh(null)).toBeNull();
    });
    it("egtaj", () => {
        expect(egtaj(0)).toBe("É");
        expect(egtaj(225)).toBe("DNy");
        expect(egtaj(350)).toBe("É");
        expect(egtaj(-90)).toBe("Ny");
        expect(egtaj(null)).toBeNull();
    });
});

describe("szelsosegek", () => {
    const nap = (r: Partial<Nap>): Nap => ({
        datum: "2026-07-01", minC: 15, maxC: 25, csapadekMm: 0, csapadekValoszinusegSzazalek: null,
        maxSzelKmh: 10, maxLokesKmh: 20, zivatarValoszinusegSzazalek: 0, szimbolum: "clearsky_day", ...r,
    });

    it("nyugodt időben nincs jelzés", () => {
        expect(szelsosegek([nap({})])).toEqual([]);
    });
    it("hőség: 30 °C-tól közepes, 35-től magas", () => {
        expect(szelsosegek([nap({ maxC: 31 })])[0]).toMatchObject({ kod: "HOSEG", szint: "kozepes" });
        expect(szelsosegek([nap({ maxC: 36 })])[0]).toMatchObject({ kod: "HOSEG", szint: "magas" });
    });
    it("fagy, szél, csapadék, zivatar", () => {
        const kodok = szelsosegek([
            nap({ minC: -6, maxLokesKmh: 85, csapadekMm: 42, zivatarValoszinusegSzazalek: 65 }),
        ]).map((s) => [s.kod, s.szint]);
        expect(kodok).toEqual(expect.arrayContaining([
            ["FAGY", "kozepes"], ["SZEL", "magas"], ["CSAPADEK", "magas"], ["ZIVATAR", "magas"],
        ]));
    });
    it("széllökés-adat nélkül az átlagos szélsebességből jelez (40 / 60 km/h)", () => {
        expect(szelsosegek([nap({ maxLokesKmh: null, maxSzelKmh: 39 })])).toEqual([]);
        expect(szelsosegek([nap({ maxLokesKmh: null, maxSzelKmh: 45 })])[0]).toMatchObject({ kod: "SZEL", szint: "kozepes" });
        expect(szelsosegek([nap({ maxLokesKmh: null, maxSzelKmh: 62 })])[0]).toMatchObject({ kod: "SZEL", szint: "magas" });
        // ha van lökés-adat, az dönt (45 km/h átlag, de csak 50 km/h lökés → nincs jelzés)
        expect(szelsosegek([nap({ maxLokesKmh: 50, maxSzelKmh: 45 })])).toEqual([]);
    });
    it("magyar tizedesvessző a szövegben", () => {
        expect(szelsosegek([nap({ csapadekMm: 22.2 })])[0].reszlet).toContain("22,2 mm");
    });
    it("zivatar szimbólum alapján is", () => {
        expect(szelsosegek([nap({ szimbolum: "heavyrainandthunder" })])[0]).toMatchObject({ kod: "ZIVATAR", szint: "kozepes" });
    });
    it("dátum szerint rendez, azon belül a magas előre", () => {
        const s = szelsosegek([
            nap({ datum: "2026-07-02", maxC: 31 }),
            nap({ datum: "2026-07-01", maxC: 31, maxLokesKmh: 90 }),
        ]);
        expect(s.map((x) => [x.datum, x.szint])).toEqual([
            ["2026-07-01", "magas"], ["2026-07-01", "kozepes"], ["2026-07-02", "kozepes"],
        ]);
    });
});

import { szimbolumInfo } from "@/lib/idojaras/szimbolum";

describe("szimbolumInfo", () => {
    it("alap kódok nappal / éjjel", () => {
        expect(szimbolumInfo("clearsky_day")).toEqual({ cimke: "Derült", ikon: "derult" });
        expect(szimbolumInfo("clearsky_night")).toEqual({ cimke: "Derült", ikon: "derult_ejjel" });
        expect(szimbolumInfo("partlycloudy_day")?.cimke).toBe("Részben felhős");
        expect(szimbolumInfo("cloudy")).toEqual({ cimke: "Borult", ikon: "borult" });
        expect(szimbolumInfo("fog")?.ikon).toBe("kod");
    });
    it("csapadékos kódok", () => {
        expect(szimbolumInfo("heavyrainandthunder")?.ikon).toBe("zivatar");
        expect(szimbolumInfo("lightrain")).toEqual({ cimke: "Gyenge eső", ikon: "szitalas" });
        expect(szimbolumInfo("heavyrain")?.cimke).toBe("Heves eső");
        expect(szimbolumInfo("rainshowers_day")?.cimke).toBe("Zápor");
        expect(szimbolumInfo("sleet")?.ikon).toBe("havaseso");
        expect(szimbolumInfo("heavysnow")?.cimke).toBe("Erős havazás");
    });
    it("ismeretlen / üres", () => {
        expect(szimbolumInfo("valami_uj")?.ikon).toBe("borult");
        expect(szimbolumInfo(null)).toBeNull();
    });
});
