// Tiszta (pure) logika a tóegység vízkapacitásához és eltartóképességéhez.
// Adatbázis nélkül számol → unit-tesztelhető.
//
// - Vízkapacitás: m³-ben tárolt alapadat (`To.vizkapacitasM3`).
// - Eltartóképesség: a tó maximális TERVEZETT halállománya kg-ban
//   (`To.kapacitasKg`). Ez külön adat a tényleges (becsült) állománytól.

/** E fölött (de max. 100%-ig) a kihasználtság már "közelít" a maximumhoz. */
export const KAPACITAS_KOZELI_SZAZALEK = 90;

export type KapacitasSzint = "rendben" | "kozel" | "tullepve";

export type KapacitasKihasznaltsag = {
    /** Kihasználtság százalékban (1 tizedesre kerekítve). */
    szazalek: number;
    /** Szabad kapacitás kg-ban (negatív, ha túllépés van). */
    szabadKg: number;
    szint: KapacitasSzint;
};

function pozitivSzam(x: unknown): number | null {
    if (x == null || x === "") return null;
    const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** kg → tonna (3 tizedes). */
export function kgToTonna(kg: number): number {
    return Math.round((kg / 1000) * 1000) / 1000;
}

/** tonna → kg (2 tizedes). */
export function tonnaToKg(t: number): number {
    return Math.round(t * 1000 * 100) / 100;
}

export type TomegEgyseg = "kg" | "t";

/**
 * Felhasználói bevitel (kg vagy tonna) → kg. Érvénytelen / nem pozitív → null.
 * A tizedesvessző is elfogadott.
 */
export function bevitelKgBan(ertek: unknown, egyseg: TomegEgyseg): number | null {
    const n = pozitivSzam(ertek);
    if (n == null) return null;
    return egyseg === "t" ? tonnaToKg(n) : Math.round(n * 100) / 100;
}

/**
 * A jelenlegi állomány a maximális eltartóképesség hány százaléka.
 * `null`, ha nincs megadva eltartóképesség vagy nincs becsült állomány.
 */
export function szamitKapacitasKihasznaltsag(
    allomanyKg: number | null | undefined,
    eltartokepessegKg: number | null | undefined
): KapacitasKihasznaltsag | null {
    const kap = pozitivSzam(eltartokepessegKg);
    if (kap == null) return null;
    if (allomanyKg == null) return null;
    const kg = Number(allomanyKg);
    if (!Number.isFinite(kg) || kg < 0) return null;

    const szazalek = Math.round((kg / kap) * 1000) / 10;
    const szabadKg = Math.round((kap - kg) * 100) / 100;
    const szint: KapacitasSzint =
        szazalek > 100 ? "tullepve" : szazalek >= KAPACITAS_KOZELI_SZAZALEK ? "kozel" : "rendben";

    return { szazalek, szabadKg, szint };
}

/**
 * Halgazdaság teljes vízkapacitása (m³) — a megadott értékek összege.
 * `megadva`: hány tóegységnél van adat (a hiányzókat nem becsüljük).
 */
export function osszVizkapacitas(
    ertekek: Array<number | null | undefined>
): { osszM3: number; megadva: number; hianyzik: number } {
    let ossz = 0;
    let megadva = 0;
    let hianyzik = 0;
    for (const e of ertekek) {
        const n = pozitivSzam(e);
        if (n == null) {
            hianyzik++;
        } else {
            ossz += n;
            megadva++;
        }
    }
    return { osszM3: Math.round(ossz * 100) / 100, megadva, hianyzik };
}

/** Rövid, ember által olvasható tömeg: 15 000 kg (15 t). */
export function tomegKgEsTonna(kg: number): string {
    const kgStr = kg.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
    const tStr = kgToTonna(kg).toLocaleString("hu-HU", { maximumFractionDigits: 3 });
    return `${kgStr} kg (${tStr} t)`;
}
