// Tiszta (pure) logika a Halászati naplóhoz — adatbázis nélkül, unit-tesztelhető.
//
// Tartalma:
//  - eseménytípus-címkék,
//  - napi/heti/havi időszak-határok (UTC, determinisztikus),
//  - ember-olvasható cím fallback,
//  - export-összegzés (típusonkénti darab + mennyiség-összegek),
//  - HTML-escape a nyomtatható exporthoz.

export const NINCS_ADAT = "nincs adat";

// ─── Eseménytípusok ──────────────────────────────────────────────────────────

/** Minden ismert eseménytípus címkéje. A ma ténylegesen keletkezők: TELEPITES,
 *  KIVETEL, ETETES, TAKARMANY_BEVETEL, TAKARMANY_FELHASZNALAS. A többi érték a
 *  jövőbeli modulokhoz van előkészítve (nem keletkezik hozzájuk esemény). */
export const ESEMENY_TIPUS_CIMKE: Record<string, string> = {
    TELEPITES: "Telepítés",
    KIVETEL: "Kivét",
    ETETES: "Etetés",
    ATTELEPITES: "Áttelepítés",
    TAKARMANY_BEVETEL: "Takarmány-bevétel",
    TAKARMANY_FELHASZNALAS: "Takarmány-felhasználás",
    TAKARMANY_KORREKCIO: "Takarmány-korrekció",
    VIZMINOSEG_MERES: "Vízminőség-mérés",
    ELHULLAS: "Elhullás",
    MADARKAR: "Madárkár",
    HALKELTES: "Halkeltetés",
    FELADAT: "Feladat",
    HIBABEJELENTES: "Hibabejelentés",
    RIASZTAS: "Riasztás",
    EGYEB: "Egyéb",
};

export function esemenyTipusCimke(tipus: string): string {
    return ESEMENY_TIPUS_CIMKE[tipus] ?? tipus;
}

/** A jelenleg ténylegesen keletkező típusok (szűrőkhöz, őszinte megjelenítéshez). */
export const AKTIV_ESEMENY_TIPUSOK = [
    "TELEPITES",
    "KIVETEL",
    "ETETES",
    "TAKARMANY_BEVETEL",
    "TAKARMANY_FELHASZNALAS",
] as const;

export function ervenyesEsemenyTipus(t: unknown): t is keyof typeof ESEMENY_TIPUS_CIMKE {
    return typeof t === "string" && t in ESEMENY_TIPUS_CIMKE;
}

// ─── Időszak-határok (UTC) ───────────────────────────────────────────────────

export type NaploPeriodus = "day" | "week" | "month";

export type IdoszakHatarok = {
    /** Kezdet (inkluzív). */
    tol: Date;
    /** Vég (exkluzív). */
    ig: Date;
};

/**
 * Napi / heti / havi időszak határai a megadott (YYYY-MM-DD) naphoz, UTC-ben.
 * - day:   [nap 00:00, +1 nap)
 * - week:  a napot tartalmazó, HÉTFŐVEL kezdődő hét [hétfő 00:00, +7 nap)
 * - month: [hónap elseje, következő hónap elseje)
 * Érvénytelen dátumra vagy ismeretlen periódusra `null`.
 */
export function periodusHatarok(periodus: string, datumStr: string): IdoszakHatarok | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datumStr)) return null;
    const alap = new Date(`${datumStr}T00:00:00.000Z`);
    if (Number.isNaN(alap.getTime())) return null;
    // A Date elfogad túlcsordulást (pl. 2026-02-31 → márc. 3.) — azt utasítsuk el.
    if (alap.toISOString().slice(0, 10) !== datumStr) return null;

    if (periodus === "day") {
        const ig = new Date(alap);
        ig.setUTCDate(ig.getUTCDate() + 1);
        return { tol: alap, ig };
    }

    if (periodus === "week") {
        // getUTCDay(): 0 = vasárnap … 6 = szombat; hétfő-kezdéshez toljuk vissza.
        const nap = alap.getUTCDay();
        const hetfoOffset = nap === 0 ? 6 : nap - 1;
        const tol = new Date(alap);
        tol.setUTCDate(tol.getUTCDate() - hetfoOffset);
        const ig = new Date(tol);
        ig.setUTCDate(ig.getUTCDate() + 7);
        return { tol, ig };
    }

    if (periodus === "month") {
        const tol = new Date(Date.UTC(alap.getUTCFullYear(), alap.getUTCMonth(), 1));
        const ig = new Date(Date.UTC(alap.getUTCFullYear(), alap.getUTCMonth() + 1, 1));
        return { tol, ig };
    }

    return null;
}

const PERIODUS_NEV: Record<NaploPeriodus, string> = {
    day: "Napi",
    week: "Heti",
    month: "Havi",
};

function utcNap(d: Date): string {
    return d.toISOString().slice(0, 10).replaceAll("-", ". ") + ".";
}

/** Pl. "Napi napló — 2026. 06. 27." vagy "Heti napló — 2026. 06. 22. – 2026. 06. 28." */
export function periodusCimke(periodus: NaploPeriodus, hatarok: IdoszakHatarok): string {
    const nev = PERIODUS_NEV[periodus] ?? "Időszaki";
    if (periodus === "day") return `${nev} napló — ${utcNap(hatarok.tol)}`;
    const utolsoNap = new Date(hatarok.ig);
    utolsoNap.setUTCDate(utolsoNap.getUTCDate() - 1);
    return `${nev} napló — ${utcNap(hatarok.tol)} – ${utcNap(utolsoNap)}`;
}

// ─── Cím fallback ────────────────────────────────────────────────────────────

export type CimBemenet = {
    tipus: string;
    cim?: string | null;
    toNev?: string | null;
    halfajNev?: string | null;
};

/**
 * Ember-olvasható cím: a tárolt `cim` az elsődleges; ha nincs (régi sorok),
 * a típus címkéjéből + tó-/fajnévből képezünk.
 */
export function esemenyCim(e: CimBemenet): string {
    const tarolt = e.cim?.trim();
    if (tarolt) return tarolt;
    const reszek = [esemenyTipusCimke(e.tipus)];
    if (e.toNev) reszek.push(e.toNev);
    if (e.halfajNev) reszek.push(e.halfajNev);
    return reszek.join(" — ");
}

// ─── Export-összegzés ────────────────────────────────────────────────────────

export type OsszegzesBemenet = {
    tipus: string;
    darab?: number | null;
    mennyisegKg?: number | null;
};

export type NaploOsszegzes = {
    osszesEsemeny: number;
    /** Típusonkénti darabszám, előfordulás szerint csökkenő. */
    tipusonkent: Array<{ tipus: string; cimke: string; darab: number }>;
    etetesKg: number;
    telepitesDarab: number;
    kivetelDarab: number;
    takarmanyBevetelKg: number;
    takarmanyFelhasznalasKg: number;
};

/** Kerekítés 2 tizedesre, float-drift nélkül. */
function k2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function naploOsszegzes(esemenyek: OsszegzesBemenet[]): NaploOsszegzes {
    const tipusDarab = new Map<string, number>();
    let etetesKg = 0;
    let telepitesDarab = 0;
    let kivetelDarab = 0;
    let takarmanyBevetelKg = 0;
    let takarmanyFelhasznalasKg = 0;

    for (const e of esemenyek) {
        tipusDarab.set(e.tipus, (tipusDarab.get(e.tipus) ?? 0) + 1);
        const kg = Number(e.mennyisegKg ?? 0) || 0;
        const db = Number(e.darab ?? 0) || 0;

        if (e.tipus === "ETETES") etetesKg += kg;
        else if (e.tipus === "TELEPITES") telepitesDarab += db;
        else if (e.tipus === "KIVETEL") kivetelDarab += db;
        else if (e.tipus === "TAKARMANY_BEVETEL") takarmanyBevetelKg += kg;
        else if (e.tipus === "TAKARMANY_FELHASZNALAS") takarmanyFelhasznalasKg += kg;
    }

    return {
        osszesEsemeny: esemenyek.length,
        tipusonkent: [...tipusDarab.entries()]
            .map(([tipus, darab]) => ({ tipus, cimke: esemenyTipusCimke(tipus), darab }))
            .sort((a, b) => b.darab - a.darab),
        etetesKg: k2(etetesKg),
        telepitesDarab,
        kivetelDarab,
        takarmanyBevetelKg: k2(takarmanyBevetelKg),
        takarmanyFelhasznalasKg: k2(takarmanyFelhasznalasKg),
    };
}

// ─── HTML escape (nyomtatható exporthoz) ─────────────────────────────────────

export function htmlEscape(s: string | null | undefined): string {
    if (s == null) return "";
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
