// Tiszta (pure) logika a tóegység területéhez. A tárolás mindig hektárban
// történik (`To.teruletHa`, 4 tizedes = 1 m² pontosság); a UI m²-ben is bekérheti.

export type TeruletEgyseg = "ha" | "m2";

/** 1 ha = 10 000 m² */
export const M2_PER_HA = 10_000;

/** Ennyi tizedesre tároljuk a hektárt (1 m² = 0,0001 ha). */
export const HA_TIZEDES = 4;

function kerekit(n: number, tizedes: number): number {
    const f = 10 ** tizedes;
    return Math.round(n * f) / f;
}

/** ha → m² (egész m²-re kerekítve). */
export function haToM2(ha: number): number {
    return Math.round(ha * M2_PER_HA);
}

/** m² → ha (4 tizedesre kerekítve). */
export function m2ToHa(m2: number): number {
    return kerekit(m2 / M2_PER_HA, HA_TIZEDES);
}

/**
 * Felhasználói bevitel (ha vagy m²) → ha. Tizedesvessző is elfogadott.
 * Üres / érvénytelen / nem pozitív → null.
 */
export function bevitelHaBan(ertek: unknown, egyseg: TeruletEgyseg): number | null {
    if (ertek == null || ertek === "") return null;
    const n = typeof ertek === "number" ? ertek : Number(String(ertek).trim().replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    const ha = egyseg === "m2" ? m2ToHa(n) : kerekit(n, HA_TIZEDES);
    return ha > 0 ? ha : null;
}

/** Megjelenítés: „0,175 ha (1 750 m²)”. */
export function teruletSzoveg(ha: number): string {
    const haStr = ha.toLocaleString("hu-HU", { maximumFractionDigits: HA_TIZEDES });
    const m2Str = haToM2(ha).toLocaleString("hu-HU");
    return `${haStr} ha (${m2Str} m²)`;
}
