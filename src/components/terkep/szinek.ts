// Leaflet-mentes modul: a térkép (sokszögek) és a jelmagyarázat is innen veszi
// a színeket, így SSR-es komponensből (pl. TerkepClient) is importálható.

/** Vízegység-típusonkénti szín a térképen. Konkrét színek, mert a térképcsempék témától függetlenül világosak. */
export const TIPUS_SZIN: Record<string, string> = {
    TO: "#0284c7",
    TELELO: "#6366f1",
    IVADEKNEVELO: "#059669",
    KELTETO_MEDENCE: "#d97706",
};
export const tipusSzin = (tipus: string) => TIPUS_SZIN[tipus] ?? TIPUS_SZIN.TO;
