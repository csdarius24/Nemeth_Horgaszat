// Tiszta (pure) logika a vízegység-áttekintéshez ("Tavak és telelők" kártyák).
// Adatbázis nélkül számol → unit-tesztelhető.
//
// ŐSZINTESÉG / HATÁROK:
// - Vízminőség-pontszám: NINCS vízminőség-modul → mindig `null` ("nincs adat").
// - Egészség-pontszám: NINCS tudományos halegészség-modell → `null` ("nincs adat").
//   Szándékosan nem gyártunk ál-pontszámot.
// - Az állomány kg-ban BECSÜLT érték: a `HalAllomany` darabszámból és a
//   tömegtartomány (min/max) középértékéből számolva. Ha nincs tömegadat → `null`.
// - A telítettség csak akkor számolható, ha a tóhoz megadták a `kapacitasKg`-ot.

export const NINCS_ADAT = "nincs adat";

/** Ennyi nap művelet nélkül már "figyelendő" a vízegység. */
export const FIGYELENDO_INAKTIV_NAP = 14;
/** Ez alatti takarmány-fedezet (nap) már "figyelendő". */
export const ALACSONY_FEDEZET_NAP = 7;
/** Legfeljebb ennyi napja volt művelet → friss (a "kiváló" feltétele). */
export const KIVALO_FRISS_NAP = 3;
/** Legalább ennyi napi fedezet kell a "kiváló"-hoz (ha egyáltalán számolható). */
export const KIVALO_FEDEZET_NAP = 14;

// ─── Típus-címkék ─────────────────────────────────────────────────────────────

export type ToTipusErtek = "TO" | "TELELO" | "IVADEKNEVELO" | "KELTETO_MEDENCE";

const TIPUS_CIMKE: Record<ToTipusErtek, string> = {
    TO: "Tó",
    TELELO: "Telelő",
    IVADEKNEVELO: "Ivadéknevelő",
    KELTETO_MEDENCE: "Keltető medence",
};

export function toTipusCimke(tipus: string): string {
    return TIPUS_CIMKE[tipus as ToTipusErtek] ?? tipus;
}

// ─── Állomány becslés (kg) ────────────────────────────────────────────────────

export type AllomanyTetel = {
    halfajNev: string;
    darab: number;
    /** Egyedi hal tömegtartományának alja (kg). */
    minTomegKg: number;
    /** Egyedi hal tömegtartományának teteje (kg). */
    maxTomegKg: number;
};

export type BecsultAllomany = {
    /** Becsült összsúly kg-ban, vagy null, ha egyetlen tételhez sincs tömegadat. */
    kg: number | null;
    /** Összes darabszám (tömegadattól függetlenül). */
    darab: number;
    /** Igaz, ha volt olyan tétel (darab > 0), amelyhez nem volt tömegadat. */
    reszleges: boolean;
};

/**
 * Becsült összsúly: SUM(darab × (minTomegKg + maxTomegKg) / 2).
 * Csak azokat a tételeket számolja, amelyeknél az átlagsúly > 0.
 */
export function becsultAllomanyKg(tetelek: AllomanyTetel[]): BecsultAllomany {
    let kg = 0;
    let darab = 0;
    let vanSulyadat = false;
    let hianyzoSuly = false;

    for (const t of tetelek) {
        const db = Number(t.darab) || 0;
        darab += db;
        if (db <= 0) continue;

        const min = Number(t.minTomegKg) || 0;
        const max = Number(t.maxTomegKg) || 0;
        const atlag = (min + max) / 2;

        if (atlag > 0) {
            kg += db * atlag;
            vanSulyadat = true;
        } else {
            hianyzoSuly = true;
        }
    }

    return {
        kg: vanSulyadat ? Math.round(kg * 100) / 100 : null,
        darab,
        reszleges: vanSulyadat && hianyzoSuly,
    };
}

// ─── Fő fajok ─────────────────────────────────────────────────────────────────

/**
 * A legnagyobb darabszámú fajok neve, darabszám szerint csökkenően.
 * Üres állománynál `null` (a UI ilyenkor "nincs adat"-ot mutat).
 */
export function foFajok(tetelek: AllomanyTetel[], max = 2): string | null {
    const relevans = tetelek.filter((t) => (Number(t.darab) || 0) > 0);
    if (relevans.length === 0) return null;

    const rendezett = [...relevans].sort((a, b) => (Number(b.darab) || 0) - (Number(a.darab) || 0));
    const nevek = rendezett.slice(0, Math.max(1, max)).map((t) => t.halfajNev);
    const tobbi = rendezett.length - nevek.length;

    return tobbi > 0 ? `${nevek.join(", ")} +${tobbi}` : nevek.join(", ");
}

// ─── Takarmány-fedezet ────────────────────────────────────────────────────────

/**
 * Hány napra elég a takarmánykészlet a jelenlegi átlagos napi fogyás mellett.
 * `null`, ha nincs mérhető fogyás (0 vagy érvénytelen) — ilyenkor "nincs adat".
 *
 * MEGJEGYZÉS: a takarmánykészlet **halászat-szintű** (megosztott), nem tavankénti.
 */
export function szamitTakarmanyFedezet(
    keszletKg: number | null | undefined,
    atlagNapiKg: number | null | undefined
): number | null {
    const keszlet = Number(keszletKg);
    const napi = Number(atlagNapiKg);
    if (!Number.isFinite(keszlet) || keszlet < 0) return null;
    if (!Number.isFinite(napi) || napi <= 0) return null;
    return Math.round((keszlet / napi) * 10) / 10;
}

// ─── Telítettség ──────────────────────────────────────────────────────────────

/**
 * Telítettség százalékban a megadott kapacitáshoz képest.
 * `null`, ha nincs becsült állomány vagy nincs beállítva kapacitás.
 */
export function szamitTelitettseg(
    becsultKg: number | null | undefined,
    kapacitasKg: number | null | undefined
): number | null {
    const kg = Number(becsultKg);
    const kap = Number(kapacitasKg);
    if (becsultKg == null || !Number.isFinite(kg)) return null;
    if (kapacitasKg == null || !Number.isFinite(kap) || kap <= 0) return null;
    return Math.round((kg / kap) * 100);
}

// ─── Állapot ──────────────────────────────────────────────────────────────────

export type Allapot = "kivalo" | "jo" | "figyelendo" | "nincs_adat";

const ALLAPOT_CIMKE: Record<Allapot, string> = {
    kivalo: "Kiváló",
    jo: "Jó",
    figyelendo: "Figyelendő",
    nincs_adat: "Nincs adat",
};

export function allapotCimke(a: Allapot): string {
    return ALLAPOT_CIMKE[a];
}

export type AllapotBemenet = {
    /** Van-e nyilvántartott halállomány (darab > 0). */
    vanAllomany: boolean;
    /** Hány napja volt az utolsó naplózott művelet; `null`, ha még soha. */
    utolsoEsemenyNapja: number | null;
    /** Takarmány-fedezet napokban; `null`, ha nem számolható. */
    fedezetNap: number | null;
};

/**
 * Állapot levezetése a MEGLÉVŐ adatokból. Vízminőségtől NEM függ.
 *
 * Szabályok (sorrendben):
 * 1. `nincs_adat` — nincs állomány ÉS még soha nem volt művelet (nincs mit értékelni).
 * 2. `figyelendo` — nincs állomány, VAGY ≥ {@link FIGYELENDO_INAKTIV_NAP} napja
 *    nincs művelet, VAGY a fedezet < {@link ALACSONY_FEDEZET_NAP} nap.
 * 3. `kivalo` — van állomány, ≤ {@link KIVALO_FRISS_NAP} napja volt művelet, és a
 *    fedezet vagy nem számolható, vagy ≥ {@link KIVALO_FEDEZET_NAP} nap.
 * 4. egyébként `jo`.
 */
export function szamitAllapot(b: AllapotBemenet): Allapot {
    const { vanAllomany, utolsoEsemenyNapja, fedezetNap } = b;

    if (!vanAllomany && utolsoEsemenyNapja == null) return "nincs_adat";

    const regotaInaktiv = utolsoEsemenyNapja != null && utolsoEsemenyNapja >= FIGYELENDO_INAKTIV_NAP;
    const alacsonyFedezet = fedezetNap != null && fedezetNap < ALACSONY_FEDEZET_NAP;
    if (!vanAllomany || regotaInaktiv || alacsonyFedezet) return "figyelendo";

    const friss = utolsoEsemenyNapja != null && utolsoEsemenyNapja <= KIVALO_FRISS_NAP;
    const bosegesFedezet = fedezetNap == null || fedezetNap >= KIVALO_FEDEZET_NAP;
    if (friss && bosegesFedezet) return "kivalo";

    return "jo";
}

// ─── Megjelenítési fallback ───────────────────────────────────────────────────

/**
 * Megjelenítendő szöveg: `null`/`undefined`/NaN esetén "nincs adat".
 * Opcionális formázóval (pl. mértékegység hozzáfűzése).
 */
export function ertekVagyNincsAdat(
    ertek: number | string | null | undefined,
    formaz?: (x: number) => string
): string {
    if (ertek == null || ertek === "") return NINCS_ADAT;
    if (typeof ertek === "number") {
        if (!Number.isFinite(ertek)) return NINCS_ADAT;
        return formaz ? formaz(ertek) : String(ertek);
    }
    return ertek;
}
