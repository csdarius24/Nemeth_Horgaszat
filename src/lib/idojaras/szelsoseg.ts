// Szabály-alapú „szélsőséges időjárás” jelzés az előrejelzésből.
//
// ŐSZINTESÉG: ez NEM a HungaroMet hivatalos figyelmeztetése (ahhoz nincs nyilvános
// API) — az előrejelzett értékekből számolt, tájékoztató jelzés. A küszöbök a
// halgazdálkodás szempontjait is tükrözik (pl. a kánikula oxigénhiány-kockázat).

import type { Nap } from "./metno";

export type SzelsosegKod = "HOSEG" | "FAGY" | "SZEL" | "CSAPADEK" | "ZIVATAR";
export type SzelsosegSzint = "kozepes" | "magas";

export type Szelsoseg = {
    kod: SzelsosegKod;
    szint: SzelsosegSzint;
    datum: string;
    cim: string;
    reszlet: string;
};

/** Küszöbök (egy helyen, hogy a UI is meg tudja mutatni). */
export const KUSZOBOK = {
    hosegC: 30,
    hosegMagasC: 35,
    fagyC: -5,
    fagyMagasC: -15,
    lokesKmh: 55,
    lokesMagasKmh: 80,
    // Ha nincs széllökés-adat (a MET Norway csak az északi régióra ad), az átlagos szélsebesség küszöbei.
    szelKmh: 40,
    szelMagasKmh: 60,
    csapadekMm: 20,
    csapadekMagasMm: 40,
    zivatarSzazalek: 30,
    zivatarMagasSzazalek: 60,
} as const;

const ZIVATAR_SZIMBOLUM = /thunder/;
const hu = (x: number) => x.toLocaleString("hu-HU", { maximumFractionDigits: 1 });

/** A napi előrejelzésből a szélsőséges helyzetek listája (dátum, majd súlyosság szerint). */
export function szelsosegek(napok: Nap[], k = KUSZOBOK): Szelsoseg[] {
    const ki: Szelsoseg[] = [];
    for (const n of napok) {
        if (n.maxC != null && n.maxC >= k.hosegC) {
            const magas = n.maxC >= k.hosegMagasC;
            ki.push({
                kod: "HOSEG", szint: magas ? "magas" : "kozepes", datum: n.datum,
                cim: magas ? "Erős hőség" : "Kánikula",
                reszlet: `Várható csúcshőmérséklet ${hu(n.maxC)} °C — a meleg víz kevesebb oxigént tárol, figyeld a halak viselkedését.`,
            });
        }
        if (n.minC != null && n.minC <= k.fagyC) {
            const magas = n.minC <= k.fagyMagasC;
            ki.push({
                kod: "FAGY", szint: magas ? "magas" : "kozepes", datum: n.datum,
                cim: magas ? "Erős fagy" : "Fagy",
                reszlet: `Várható minimum ${hu(n.minC)} °C — jégképződés, a lékek és a telelők ellenőrzése javasolt.`,
            });
        }
        if (n.maxLokesKmh != null) {
            if (n.maxLokesKmh >= k.lokesKmh) {
                const magas = n.maxLokesKmh >= k.lokesMagasKmh;
                ki.push({
                    kod: "SZEL", szint: magas ? "magas" : "kozepes", datum: n.datum,
                    cim: magas ? "Viharos szél" : "Erős szél",
                    reszlet: `Széllökések akár ${n.maxLokesKmh} km/h sebességgel.`,
                });
            }
        } else if (n.maxSzelKmh != null && n.maxSzelKmh >= k.szelKmh) {
            const magas = n.maxSzelKmh >= k.szelMagasKmh;
            ki.push({
                kod: "SZEL", szint: magas ? "magas" : "kozepes", datum: n.datum,
                cim: magas ? "Viharos szél" : "Erős szél",
                reszlet: `Átlagos szélsebesség akár ${n.maxSzelKmh} km/h (a lökések ennél erősebbek lehetnek).`,
            });
        }
        if (n.csapadekMm >= k.csapadekMm) {
            const magas = n.csapadekMm >= k.csapadekMagasMm;
            ki.push({
                kod: "CSAPADEK", szint: magas ? "magas" : "kozepes", datum: n.datum,
                cim: magas ? "Felhőszakadás" : "Sok csapadék",
                reszlet: `Várható csapadék ${hu(n.csapadekMm)} mm — figyeld a vízszintet és a túlfolyókat.`,
            });
        }
        const zivatarSzimb = n.szimbolum != null && ZIVATAR_SZIMBOLUM.test(n.szimbolum);
        const zivatarValsz = n.zivatarValoszinusegSzazalek ?? 0;
        if (zivatarSzimb || zivatarValsz >= k.zivatarSzazalek) {
            const magas = zivatarValsz >= k.zivatarMagasSzazalek;
            ki.push({
                kod: "ZIVATAR", szint: magas ? "magas" : "kozepes", datum: n.datum,
                cim: "Zivatar",
                reszlet: zivatarValsz > 0
                    ? `Zivatar valószínűsége ${Math.round(zivatarValsz)}%.`
                    : "Zivatar várható.",
            });
        }
    }
    return ki.sort((a, b) => a.datum.localeCompare(b.datum) || (a.szint === b.szint ? 0 : a.szint === "magas" ? -1 : 1));
}
