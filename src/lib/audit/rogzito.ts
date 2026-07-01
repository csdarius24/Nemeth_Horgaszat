// Tiszta (pure) segéd az actor / "rögzítő" megjelenítéséhez.
// A műveleti naplóból és a takarmánymozgásból visszaadott felhasználót
// ember-olvasható névvé alakítja (név → email → null).

export type RogzitoInfo = { nev: string | null; email: string } | null | undefined;

/**
 * Ember-olvasható megjelenítés a rögzítő felhasználóhoz.
 * - ha van (nem üres) név → a név,
 * - különben ha van email → az email,
 * - különben (nincs actor / rendszer-esemény) → null.
 */
export function rogzitoMegjelenites(f: RogzitoInfo): string | null {
    if (!f) return null;
    const nev = f.nev?.trim();
    if (nev) return nev;
    const email = f.email?.trim();
    return email ? email : null;
}
