// Tiszta (pure) feldolgozás: MET Norway Locationforecast 2.0 „complete” válasz →
// az alkalmazás időjárás-modellje (aktuális + óránkénti + napi bontás).
// Hálózat nélkül → unit-tesztelhető. A lekérés: /api/halaszatok/[hid]/idojaras.
//
// Forrás: https://api.met.no/weatherapi/locationforecast/2.0/documentation
// Licenc: CC BY 4.0 (MET Norway) — a felületen forrásmegjelölés kötelező.
//
// A válasz idősora UTC-ben van: az első ~2,5 napra óránkénti (`next_1_hours`),
// utána 6 óránkénti (`next_6_hours`) bontásban, kb. 9–10 napig.

export const IDOZONA = "Europe/Budapest";

export type Aktualis = {
    ido: string;
    homersekletC: number | null;
    paratartalomSzazalek: number | null;
    szelSebessegKmh: number | null;
    szelLokesKmh: number | null;
    /** Honnan fúj (fok, 0 = északi szél). */
    szelIranyFok: number | null;
    legnyomasHpa: number | null;
    /** Következő 1 óra csapadéka (mm). */
    csapadekMm: number | null;
    szimbolum: string | null;
};

export type Ora = {
    ido: string;
    homersekletC: number | null;
    csapadekMm: number | null;
    csapadekValoszinusegSzazalek: number | null;
    szelSebessegKmh: number | null;
    szimbolum: string | null;
};

export type Nap = {
    /** Helyi dátum (YYYY-MM-DD, Europe/Budapest). */
    datum: string;
    minC: number | null;
    maxC: number | null;
    csapadekMm: number;
    csapadekValoszinusegSzazalek: number | null;
    maxSzelKmh: number | null;
    maxLokesKmh: number | null;
    zivatarValoszinusegSzazalek: number | null;
    szimbolum: string | null;
};

export type Elorejelzes = {
    frissitve: string | null;
    aktualis: Aktualis | null;
    orak: Ora[];
    napok: Nap[];
};

type Reszletek = Record<string, number | undefined>;
type Idoszak = { summary?: { symbol_code?: string }; details?: Reszletek };
type IdosorElem = {
    time: string;
    data?: {
        instant?: { details?: Reszletek };
        next_1_hours?: Idoszak;
        next_6_hours?: Idoszak;
        next_12_hours?: Idoszak;
    };
};

const szam = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
/** m/s → km/h, egészre kerekítve. */
export const msToKmh = (ms: number | null) => (ms == null ? null : Math.round(ms * 3.6));
const kerek1 = (x: number) => Math.round(x * 10) / 10;

const datumFormazo = new Intl.DateTimeFormat("en-CA", { timeZone: IDOZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const oraFormazo = new Intl.DateTimeFormat("en-GB", { timeZone: IDOZONA, hour: "2-digit", hourCycle: "h23" });

/** UTC időpont → helyi (Budapest) dátum, YYYY-MM-DD. */
export function helyiDatum(iso: string): string {
    return datumFormazo.format(new Date(iso));
}
function helyiOra(iso: string): number {
    return Number(oraFormazo.format(new Date(iso)));
}

const maxNull = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b));
const minNull = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.min(a, b));

/**
 * MET Norway válasz → előrejelzés.
 * @param most az aktuális időpont (teszteléshez felülírható); a múltbeli elemeket kihagyjuk
 * @param oraDb hány óránkénti elemet adjunk vissza
 */
export function feldolgozMetno(valasz: unknown, most: Date = new Date(), oraDb = 24): Elorejelzes {
    const props = (valasz as { properties?: { meta?: { updated_at?: string }; timeseries?: IdosorElem[] } })?.properties;
    const idosor = Array.isArray(props?.timeseries) ? props!.timeseries! : [];
    const frissitve = typeof props?.meta?.updated_at === "string" ? props.meta.updated_at : null;

    // Az aktuális óra elejétől számítunk (a folyamatban lévő órát még mutatjuk).
    const kuszob = Math.floor(most.getTime() / 3_600_000) * 3_600_000;
    const elemek = idosor
        .filter((e) => typeof e?.time === "string" && !Number.isNaN(Date.parse(e.time)) && Date.parse(e.time) >= kuszob)
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

    if (elemek.length === 0) return { frissitve, aktualis: null, orak: [], napok: [] };

    // ── Aktuális ──────────────────────────────────────────────────────────────
    const elso = elemek[0];
    const ei = elso.data?.instant?.details ?? {};
    const e1 = elso.data?.next_1_hours;
    const aktualis: Aktualis = {
        ido: elso.time,
        homersekletC: szam(ei.air_temperature),
        paratartalomSzazalek: szam(ei.relative_humidity) == null ? null : Math.round(ei.relative_humidity!),
        szelSebessegKmh: msToKmh(szam(ei.wind_speed)),
        szelLokesKmh: msToKmh(szam(ei.wind_speed_of_gust)),
        szelIranyFok: szam(ei.wind_from_direction) == null ? null : Math.round(ei.wind_from_direction!),
        legnyomasHpa: szam(ei.air_pressure_at_sea_level) == null ? null : Math.round(ei.air_pressure_at_sea_level!),
        csapadekMm: szam(e1?.details?.precipitation_amount),
        szimbolum: e1?.summary?.symbol_code ?? elso.data?.next_6_hours?.summary?.symbol_code ?? null,
    };

    // ── Óránkénti (csak ahol van 1 órás bontás) ───────────────────────────────
    const orak: Ora[] = elemek
        .filter((e) => e.data?.next_1_hours)
        .slice(0, oraDb)
        .map((e) => {
            const d = e.data!;
            return {
                ido: e.time,
                homersekletC: szam(d.instant?.details?.air_temperature),
                csapadekMm: szam(d.next_1_hours?.details?.precipitation_amount),
                csapadekValoszinusegSzazalek: szam(d.next_1_hours?.details?.probability_of_precipitation),
                szelSebessegKmh: msToKmh(szam(d.instant?.details?.wind_speed)),
                szimbolum: d.next_1_hours?.summary?.symbol_code ?? null,
            };
        });

    // ── Napi összesítés (helyi dátum szerint) ─────────────────────────────────
    const napMap = new Map<string, Nap & { _szimbolumTav: number }>();
    const nap = (datum: string) => {
        let n = napMap.get(datum);
        if (!n) {
            n = {
                datum, minC: null, maxC: null, csapadekMm: 0, csapadekValoszinusegSzazalek: null,
                maxSzelKmh: null, maxLokesKmh: null, zivatarValoszinusegSzazalek: null, szimbolum: null,
                _szimbolumTav: Infinity,
            };
            napMap.set(datum, n);
        }
        return n;
    };

    // A csapadék ne számolódjon kétszer: amíg egy korábbi időszak (1 vagy 6 óra) lefedi, kihagyjuk.
    let lefedveEddig = 0;

    for (const e of elemek) {
        const t = Date.parse(e.time);
        const d = e.data ?? {};
        const n = nap(helyiDatum(e.time));
        const inst = d.instant?.details ?? {};

        const hom = szam(inst.air_temperature);
        n.minC = minNull(n.minC, hom);
        n.maxC = maxNull(n.maxC, hom);
        n.minC = minNull(n.minC, szam(d.next_6_hours?.details?.air_temperature_min));
        n.maxC = maxNull(n.maxC, szam(d.next_6_hours?.details?.air_temperature_max));

        n.maxSzelKmh = maxNull(n.maxSzelKmh, msToKmh(szam(inst.wind_speed)));
        n.maxLokesKmh = maxNull(n.maxLokesKmh, msToKmh(szam(inst.wind_speed_of_gust)));

        const idoszak = d.next_1_hours ?? d.next_6_hours;
        const hossz = d.next_1_hours ? 1 : d.next_6_hours ? 6 : 0;
        if (idoszak && t >= lefedveEddig) {
            n.csapadekMm += szam(idoszak.details?.precipitation_amount) ?? 0;
            lefedveEddig = t + hossz * 3_600_000;
        }
        n.csapadekValoszinusegSzazalek = maxNull(n.csapadekValoszinusegSzazalek, szam(idoszak?.details?.probability_of_precipitation));
        n.zivatarValoszinusegSzazalek = maxNull(n.zivatarValoszinusegSzazalek, szam(d.next_1_hours?.details?.probability_of_thunder));

        // A nap ikonja: a helyi déli órához legközelebbi időszak szimbóluma.
        const szimb = d.next_6_hours?.summary?.symbol_code ?? d.next_1_hours?.summary?.symbol_code;
        if (szimb) {
            const tav = Math.abs(helyiOra(e.time) - 12);
            if (tav < n._szimbolumTav) {
                n.szimbolum = szimb;
                n._szimbolumTav = tav;
            }
        }
    }

    const napok: Nap[] = [...napMap.values()]
        // Az idősor végén lévő csonka nap (csak egy pillanatnyi érték, időszak-összegzés
        // nélkül) félrevezető lenne (min = max, nincs ikon, nincs csapadék) → kihagyjuk.
        .filter((n) => n.szimbolum != null)
        .sort((a, b) => a.datum.localeCompare(b.datum))
        .map((n): Nap => ({
            datum: n.datum,
            minC: n.minC == null ? null : kerek1(n.minC),
            maxC: n.maxC == null ? null : kerek1(n.maxC),
            csapadekMm: kerek1(n.csapadekMm),
            csapadekValoszinusegSzazalek: n.csapadekValoszinusegSzazalek,
            maxSzelKmh: n.maxSzelKmh,
            maxLokesKmh: n.maxLokesKmh,
            zivatarValoszinusegSzazalek: n.zivatarValoszinusegSzazalek,
            szimbolum: n.szimbolum,
        }));

    return { frissitve, aktualis, orak, napok };
}

// ─── Szélirány ───────────────────────────────────────────────────────────────

const EGTAJAK = ["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"] as const;

/** Szélirány (fok, ahonnan fúj) → égtáj rövidítés, pl. 225 → „DNy”. */
export function egtaj(fok: number | null | undefined): string | null {
    if (fok == null || !Number.isFinite(fok)) return null;
    const i = Math.round((((fok % 360) + 360) % 360) / 45) % 8;
    return EGTAJAK[i];
}
