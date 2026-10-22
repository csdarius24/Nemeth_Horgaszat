// A Feladatok oldal közös típusai és megjelenítési segédei.

export type Feladat = {
    id: number;
    cim: string;
    leiras: string | null;
    statusz: string;
    prioritas: string;
    szin: string | null;
    hatarido: string | null;
    elkeszultAt: string | null;
    lejart: boolean;
    toId: number | null;
    toNev: string | null;
    felelosFelhasznaloId: number | null;
    felelosNev: string | null;
    letrehozoNev: string | null;
};

export type Tag = { azonosito: number; nev: string | null; email: string };
export type ToOpcio = { azonosito: number; nev: string };

export const STATUSZ_BADGE: Record<string, "secondary" | "primary" | "success" | "warning" | "danger"> = {
    UJ: "secondary",
    FOLYAMATBAN: "primary",
    KESZ: "success",
    ELHALASZTVA: "warning",
    TOROLVE: "danger",
};

export const PRIORITASOK = [
    { ertek: "ALACSONY", cimke: "Alacsony" },
    { ertek: "NORMAL", cimke: "Normál" },
    { ertek: "MAGAS", cimke: "Magas" },
    { ertek: "SURGOS", cimke: "Sürgős" },
] as const;

/** Prioritás megjelenítése: csak a magas/sürgős kap színt, hogy kitűnjön. */
export const PRIORITAS_OSZTALY: Record<string, string> = {
    ALACSONY: "text-muted-foreground",
    NORMAL: "text-muted-foreground",
    MAGAS: "text-warning",
    SURGOS: "text-destructive",
};

/** Határidő ember-olvasható formában: „Lejárt”, „Ma”, „Holnap”, „5 nap”. */
export function hataridoSzoveg(f: Pick<Feladat, "hatarido" | "lejart">, hatralevo: number | null) {
    if (!f.hatarido) return null;
    const datum = new Date(f.hatarido).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
    if (f.lejart) return { rovid: "Lejárt", datum, surgos: true };
    // Lezárt (kész/törölt) feladatnál a múltbeli határidő nem „lejárt”, csak egy dátum.
    if (hatralevo == null || hatralevo < 0) return { rovid: datum, datum, surgos: false };
    if (hatralevo === 0) return { rovid: "Ma", datum, surgos: true };
    if (hatralevo === 1) return { rovid: "Holnap", datum, surgos: true };
    return { rovid: `${hatralevo} nap`, datum, surgos: false };
}
