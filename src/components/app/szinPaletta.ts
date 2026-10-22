/**
 * Felhasználó által választható címke-színek (takarmány, naptárbejegyzés).
 * Az `ertek` az adatbázisban tárolt kulcs (NEM változhat), a `hex` csak a
 * megjelenítés — a design rendszer palettájából.
 */
export const CIMKE_SZINEK = [
    { ertek: "narancs", cimke: "Narancs", hex: "#f59e0b" },
    { ertek: "piros", cimke: "Piros", hex: "#ef4444" },
    { ertek: "zold", cimke: "Zöld", hex: "#10b981" },
    { ertek: "kek", cimke: "Kék", hex: "#0ea5e9" },
    { ertek: "lila", cimke: "Lila", hex: "#8b5cf6" },
    { ertek: "szurke", cimke: "Szürke", hex: "#94a3b8" },
] as const;

export function cimkeSzinHex(szin: string | null | undefined) {
    return CIMKE_SZINEK.find((s) => s.ertek === szin)?.hex ?? CIMKE_SZINEK[0].hex;
}
