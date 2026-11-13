// Tiszta (pure) logika a címkereséshez (geokódolás). Hálózat nélkül → unit-tesztelhető.
// A tényleges lekérés a szerveren fut: /api/geokod (Nominatim / OpenStreetMap).

import { pontBemenetbol, type LatLng } from "./geo";

export type GeokodTalalat = {
    /** Megjelenítendő név / cím. */
    nev: string;
    lat: number;
    lng: number;
    /** Nominatim osztály/típus (pl. "place/village") — csak tájékoztató. */
    tipus: string | null;
};

export const KERESES_MIN_HOSSZ = 3;
export const KERESES_MAX_HOSSZ = 200;
export const MAX_TALALAT = 5;

/**
 * Koordináta beírva? Pl. "47.1467, 20.2038", "47,1467 20,2038", "47.1467;20.2038".
 * Tizedesvessző esetén a két számot szóköz vagy pontosvessző választja el.
 */
export function koordinataSzovegbol(q: string): LatLng | null {
    const s = q.trim();
    // Tizedespont: "lat, lng" / "lat lng" / "lat;lng"
    let m = s.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!m) {
        // Tizedesvessző: "lat lng" / "lat;lng" (vesszővel mint elválasztóval nem egyértelmű)
        m = s.match(/^(-?\d{1,3}(?:,\d+)?)\s*[; ]\s*(-?\d{1,3}(?:,\d+)?)$/);
    }
    if (!m) return null;
    return pontBemenetbol(m[1], m[2]);
}

/** Keresőszöveg ellenőrzése: null, ha rendben; különben hibaüzenet. */
export function keresesHiba(q: string): string | null {
    const s = q.trim();
    if (s.length < KERESES_MIN_HOSSZ) return `Adj meg legalább ${KERESES_MIN_HOSSZ} karaktert.`;
    if (s.length > KERESES_MAX_HOSSZ) return "Túl hosszú keresés.";
    return null;
}

type NominatimSor = {
    display_name?: unknown;
    lat?: unknown;
    lon?: unknown;
    class?: unknown;
    type?: unknown;
};

/** Nominatim `jsonv2` válasz → egységes, érvényes találatlista (max. {@link MAX_TALALAT}). */
export function nominatimTalalatok(valasz: unknown): GeokodTalalat[] {
    if (!Array.isArray(valasz)) return [];
    const ki: GeokodTalalat[] = [];
    for (const sor of valasz as NominatimSor[]) {
        const p = pontBemenetbol(sor?.lat, sor?.lon);
        const nev = typeof sor?.display_name === "string" ? sor.display_name.trim() : "";
        if (!p || !nev) continue;
        const tipus = typeof sor.class === "string" && typeof sor.type === "string" ? `${sor.class}/${sor.type}` : null;
        ki.push({ nev, lat: p.lat, lng: p.lng, tipus });
        if (ki.length >= MAX_TALALAT) break;
    }
    return ki;
}
