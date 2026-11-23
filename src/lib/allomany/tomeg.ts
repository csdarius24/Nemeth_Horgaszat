// Tiszta (pure) logika a halállomány tömegéhez — adatbázis nélkül, unit-tesztelhető.
//  - súlyalapú telepítés: össztömeg (kg / mázsa / tonna) + átlagsúly (g / kg) → darab,
//  - két állományrész tömegének súlyozott összevonása (telepítés, áttelepítés).
//
// A `HalAllomany` egyedi tömeg-TARTOMÁNYT tárol (minTomegKg–maxTomegKg); a becsült
// össztömeg darab × (min + max) / 2. Az összevonás ezt a becslést őrzi meg.

export const OSSZTOMEG_EGYSEGEK = ["kg", "q", "t"] as const;
export type OsszTomegEgyseg = (typeof OSSZTOMEG_EGYSEGEK)[number];

export const ATLAG_EGYSEGEK = ["g", "kg"] as const;
export type AtlagEgyseg = (typeof ATLAG_EGYSEGEK)[number];

export const OSSZTOMEG_CIMKE: Record<OsszTomegEgyseg, string> = { kg: "kg", q: "mázsa", t: "tonna" };

const KG_SZORZO: Record<OsszTomegEgyseg | AtlagEgyseg, number> = { g: 0.001, kg: 1, q: 100, t: 1000 };

function szam(x: unknown): number | null {
    if (x == null || x === "") return null;
    const n = typeof x === "number" ? x : Number(String(x).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

/** Érték + egység → kg (null, ha érvénytelen vagy nem pozitív). */
export function kgBa(ertek: unknown, egyseg: OsszTomegEgyseg | AtlagEgyseg): number | null {
    const n = szam(ertek);
    if (n == null || n <= 0) return null;
    return n * KG_SZORZO[egyseg];
}

export type SulyalapuEredmeny =
    | { ok: true; darab: number; osszTomegKg: number; atlagTomegKg: number }
    | { ok: false; hiba: string };

/**
 * Súlyalapú telepítés: össztömeg ÷ átlagsúly = darab (egészre kerekítve).
 * Az átlagsúly a kerekítés után is a megadott marad; az össztömeg a megadott.
 */
export function darabSulybol(
    osszTomeg: unknown, osszEgyseg: OsszTomegEgyseg,
    atlagSuly: unknown, atlagEgyseg: AtlagEgyseg
): SulyalapuEredmeny {
    const osszKg = kgBa(osszTomeg, osszEgyseg);
    if (osszKg == null) return { ok: false, hiba: "Add meg a telepített hal össztömegét." };
    const atlagKg = kgBa(atlagSuly, atlagEgyseg);
    if (atlagKg == null) return { ok: false, hiba: "Add meg az átlagsúlyt." };
    if (atlagKg > osszKg) return { ok: false, hiba: "Az átlagsúly nem lehet nagyobb az össztömegnél." };

    const darab = Math.round(osszKg / atlagKg);
    if (darab < 1) return { ok: false, hiba: "A számolt darabszám kevesebb, mint 1." };
    if (darab > 100_000_000) return { ok: false, hiba: "A számolt darabszám irreálisan nagy — ellenőrizd a mértékegységeket." };

    return {
        ok: true,
        darab,
        osszTomegKg: Math.round(osszKg * 1000) / 1000,
        atlagTomegKg: Math.round(atlagKg * 1e5) / 1e5,
    };
}

export type AllomanyResz = { darab: number; minTomegKg: number; maxTomegKg: number };

const vanTomeg = (r: AllomanyResz) => r.darab > 0 && (r.minTomegKg > 0 || r.maxTomegKg > 0);
const kerek5 = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Két állományrész (pl. meglévő + újonnan telepített) egyedi tömeg-tartományának
 * összevonása: a min és a max a darabszámmal súlyozott átlag. Így a becsült
 * össztömeg (darab × (min+max)/2) pontosan a két rész becslésének összege marad.
 *
 * Ha csak az egyik résznek van tömegadata, annak a tartománya marad
 * (a tömeg nélküli rész nem húzza 0 felé az átlagot).
 */
export function osszevonTomeg(regi: AllomanyResz, uj: AllomanyResz): { minTomegKg: number; maxTomegKg: number } {
    const r = vanTomeg(regi);
    const u = vanTomeg(uj);
    if (r && u) {
        const ossz = regi.darab + uj.darab;
        return {
            minTomegKg: kerek5((regi.darab * regi.minTomegKg + uj.darab * uj.minTomegKg) / ossz),
            maxTomegKg: kerek5((regi.darab * regi.maxTomegKg + uj.darab * uj.maxTomegKg) / ossz),
        };
    }
    if (u) return { minTomegKg: uj.minTomegKg, maxTomegKg: uj.maxTomegKg };
    if (r) return { minTomegKg: regi.minTomegKg, maxTomegKg: regi.maxTomegKg };
    return { minTomegKg: 0, maxTomegKg: 0 };
}

/** Becsült össztömeg (kg) egy állományrészre; null, ha nincs tömegadat. */
export function becsultKg(r: AllomanyResz): number | null {
    if (!vanTomeg(r)) return null;
    return Math.round(r.darab * ((r.minTomegKg + r.maxTomegKg) / 2) * 1000) / 1000;
}
