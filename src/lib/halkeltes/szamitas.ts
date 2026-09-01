// Tiszta (pure) számító logika a halkeltetési ciklushoz — adatbázis nélkül,
// unit-tesztelhető.
//
// ELV: NINCS beégetett biológiai "igazság". Minden adag a KONFIGURÁLHATÓ
// protokoll-értékekből (mg/kg, ml/kg) származik; a ciklus a protokoll értékeit
// snapshotként tárolja, így a számítás determinisztikus és visszakereshető.
//
// Ha egy hal tömege (kg) hiányzik, a hozzá tartozó számított értékek `null`-ok
// (nem 0) — így a UI/összegzés különbséget tud tenni "0" és "nincs adat" között.

export const NINCS_ADAT = "nincs adat";

/** Kerekítés adott tizedesre, float-drift nélkül. */
export function kerekit(n: number, tizedes = 2): number {
    const p = 10 ** tizedes;
    return Math.round((n + Number.EPSILON) * p) / p;
}

function szorzat(kg: number | null | undefined, egysegPerKg: number | null | undefined): number | null {
    const k = Number(kg);
    const e = Number(egysegPerKg);
    if (!Number.isFinite(k) || kg == null) return null;
    if (!Number.isFinite(e) || egysegPerKg == null) return null;
    return kerekit(k * e, 3);
}

// ── Protokoll (konfigurálható értékek) ───────────────────────────────────────

export type Protokoll = {
    ikrasEloadagMgPerKg: number | null;
    ikrasDontoMgPerKg: number | null;
    ikrasMlPerKg: number | null;
    tejesMgPerKg: number | null;
    tejesMlPerKg: number | null;
    /** Ráhagyás szorzó a "Oltandó (*1,1)" tartalékhoz. Alap 1.10. */
    rahagyasSzorzo: number | null;
};

export const ALAP_RAHAGYAS = 1.10;

// ── Egy ikrás (nőstény) sor számított adagjai ────────────────────────────────

export type IkrasSorBemenet = {
    tomegKg: number | null;
};

export type IkrasSorSzamitas = {
    /** Előadag mg = kg × ikrasEloadagMgPerKg. `null`, ha nincs kg vagy nincs érték. */
    eloadagMg: number | null;
    /** Döntőadag mg = kg × ikrasDontoMgPerKg. */
    dontoMg: number | null;
    /** ml = kg × ikrasMlPerKg. */
    ml: number | null;
};

export function ikrasSorSzamitas(sor: IkrasSorBemenet, p: Protokoll): IkrasSorSzamitas {
    return {
        eloadagMg: szorzat(sor.tomegKg, p.ikrasEloadagMgPerKg),
        dontoMg: szorzat(sor.tomegKg, p.ikrasDontoMgPerKg),
        ml: szorzat(sor.tomegKg, p.ikrasMlPerKg),
    };
}

// ── Egy tejes (hím) sor számított adagjai ────────────────────────────────────

export type TejesSorBemenet = {
    tomegKg: number | null;
};

export type TejesSorSzamitas = {
    /** mg = kg × tejesMgPerKg. */
    mg: number | null;
    /** ml = kg × tejesMlPerKg. */
    ml: number | null;
};

export function tejesSorSzamitas(sor: TejesSorBemenet, p: Protokoll): TejesSorSzamitas {
    return {
        mg: szorzat(sor.tomegKg, p.tejesMgPerKg),
        ml: szorzat(sor.tomegKg, p.tejesMlPerKg),
    };
}

// ── Ciklus-összegzés ─────────────────────────────────────────────────────────

export type CiklusSorBemenet = {
    tomegKg?: number | null;
    ikraKg?: number | null;
    tejMl?: number | null;
};

export type CiklusOsszegzes = {
    ikrasDarab: number;
    tejesDarab: number;
    ikrasOsszKg: number;
    tejesOsszKg: number;
    ikraOsszKg: number;
    tejOsszMl: number;
    // Számított adag-összegek (a protokoll alapján)
    ikrasEloadagOsszMg: number;
    ikrasDontoOsszMg: number;
    ikrasOsszMl: number;
    tejesOsszMg: number;
    tejesOsszMl: number;
    // "Oltandó (*ráhagyás)" tartalék az ikrás adagra (előadag + döntőadag)
    rahagyasSzorzo: number;
    oltandoEloadagMg: number;
    oltandoDontoMg: number;
};

function osszeg(ertek: number | null): number {
    return ertek == null || !Number.isFinite(ertek) ? 0 : ertek;
}

/**
 * Egy ciklus teljes összegzése az ikrás + tejes sorokból és a protokollból.
 * A hiányzó kg-ú sorok a darabszámba beleszámítanak, de a kg-/adag-összegekbe 0-val.
 * A "Oltandó" a teljes ikrás adag × ráhagyás-szorzó (alap 1,10).
 */
export function ciklusOsszegzes(
    ikrasSorok: CiklusSorBemenet[],
    tejesSorok: CiklusSorBemenet[],
    p: Protokoll
): CiklusOsszegzes {
    let ikrasOsszKg = 0;
    let ikraOsszKg = 0;
    let ikrasEloadagOsszMg = 0;
    let ikrasDontoOsszMg = 0;
    let ikrasOsszMl = 0;

    for (const sor of ikrasSorok) {
        const kg = Number(sor.tomegKg);
        if (Number.isFinite(kg) && sor.tomegKg != null) ikrasOsszKg += kg;
        const ikra = Number(sor.ikraKg);
        if (Number.isFinite(ikra) && sor.ikraKg != null) ikraOsszKg += ikra;

        const sz = ikrasSorSzamitas({ tomegKg: sor.tomegKg ?? null }, p);
        ikrasEloadagOsszMg += osszeg(sz.eloadagMg);
        ikrasDontoOsszMg += osszeg(sz.dontoMg);
        ikrasOsszMl += osszeg(sz.ml);
    }

    let tejesOsszKg = 0;
    let tejOsszMl = 0;
    let tejesOsszMg = 0;
    let tejesOsszMl = 0;

    for (const sor of tejesSorok) {
        const kg = Number(sor.tomegKg);
        if (Number.isFinite(kg) && sor.tomegKg != null) tejesOsszKg += kg;
        const tej = Number(sor.tejMl);
        if (Number.isFinite(tej) && sor.tejMl != null) tejOsszMl += tej;

        const sz = tejesSorSzamitas({ tomegKg: sor.tomegKg ?? null }, p);
        tejesOsszMg += osszeg(sz.mg);
        tejesOsszMl += osszeg(sz.ml);
    }

    const rahagyas = Number.isFinite(Number(p.rahagyasSzorzo)) && p.rahagyasSzorzo != null
        ? Number(p.rahagyasSzorzo)
        : ALAP_RAHAGYAS;

    return {
        ikrasDarab: ikrasSorok.length,
        tejesDarab: tejesSorok.length,
        ikrasOsszKg: kerekit(ikrasOsszKg, 2),
        tejesOsszKg: kerekit(tejesOsszKg, 2),
        ikraOsszKg: kerekit(ikraOsszKg, 2),
        tejOsszMl: kerekit(tejOsszMl, 2),
        ikrasEloadagOsszMg: kerekit(ikrasEloadagOsszMg, 3),
        ikrasDontoOsszMg: kerekit(ikrasDontoOsszMg, 3),
        ikrasOsszMl: kerekit(ikrasOsszMl, 3),
        tejesOsszMg: kerekit(tejesOsszMg, 3),
        tejesOsszMl: kerekit(tejesOsszMl, 3),
        rahagyasSzorzo: kerekit(rahagyas, 2),
        oltandoEloadagMg: kerekit(ikrasEloadagOsszMg * rahagyas, 3),
        oltandoDontoMg: kerekit(ikrasDontoOsszMg * rahagyas, 3),
    };
}

// ── Státusz-címke ────────────────────────────────────────────────────────────

export const HALKELTES_STATUSZ_CIMKE: Record<string, string> = {
    TERVEZET: "Tervezet",
    FOLYAMATBAN: "Folyamatban",
    LEZARVA: "Lezárva",
};

export function halkeltesStatuszCimke(statusz: string): string {
    return HALKELTES_STATUSZ_CIMKE[statusz] ?? statusz;
}

export function ervenyesHalkeltesStatusz(s: unknown): s is keyof typeof HALKELTES_STATUSZ_CIMKE {
    return typeof s === "string" && s in HALKELTES_STATUSZ_CIMKE;
}
