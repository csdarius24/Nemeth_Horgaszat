// Tiszta (pure) takarmánykészlet-logika — adatbázis nélkül, unit-tesztelhető.
//
// Megjegyzés: nincs mértékegység-konverzió. A levonandó mennyiséget ugyanabban az
// egységben kezeljük, mint a takarmány készletét (a hívó felel a konzisztens
// egységért — etetésnél a `mennyisegKg` a levont mennyiség).

/** 2 tizedesre kerekít (a Decimal(…,2) oszlopokkal konzisztensen), float-drift nélkül. */
export function ketTizedes(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type KeszletLevonasEredmeny =
    | { ok: true; ujKeszlet: number }
    | { ok: false; hiba: "ervenytelen_mennyiseg" | "nincs_eleg_keszlet" };

/**
 * Kiszámolja az új készletet egy takarmány-felhasználás (levonás) után.
 *
 * Szabályok:
 * - a levonandó mennyiség legyen véges és > 0, különben `ervenytelen_mennyiseg`;
 * - a jelenlegi készlet legyen véges szám;
 * - ha a levonandó több, mint a készlet, `nincs_eleg_keszlet` (a készlet nem mehet
 *   negatívba);
 * - siker esetén az új készlet 2 tizedesre kerekítve (`keszlet - levonas`).
 *
 * A függvény tiszta: nem ír adatbázist, csak számol.
 */
export function szamitTakarmanyFelhasznalas(
    jelenlegiKeszlet: number,
    levonas: number
): KeszletLevonasEredmeny {
    if (!Number.isFinite(levonas) || levonas <= 0) {
        return { ok: false, hiba: "ervenytelen_mennyiseg" };
    }
    if (!Number.isFinite(jelenlegiKeszlet)) {
        return { ok: false, hiba: "ervenytelen_mennyiseg" };
    }

    const keszlet = ketTizedes(jelenlegiKeszlet);
    const kell = ketTizedes(levonas);

    if (kell > keszlet) {
        return { ok: false, hiba: "nincs_eleg_keszlet" };
    }

    return { ok: true, ujKeszlet: ketTizedes(keszlet - kell) };
}
