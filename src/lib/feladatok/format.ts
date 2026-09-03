// Tiszta (pure) logika a Feladatok modulhoz — adatbázis nélkül, unit-tesztelhető.
//
// Tartalma: szín-validálás (CSS-injection ellen), státusz-/prioritás-címkék,
// határidő-számítás (lejárt / hátralévő), állapot-átmenet mellékhatásai
// (elkeszultAt beállítása/törlése), és jogosultsági szabályok (ki mit módosíthat).

export type HalaszatSzerep = "OWNER" | "ADMIN" | "STAFF";

// ── Színek ───────────────────────────────────────────────────────────────────

/** Engedélyezett preset színek (biztonságos, ellenőrzött hex értékek). */
export const FELADAT_SZINEK = [
    "#2563eb", // kék
    "#16a34a", // zöld
    "#f59e0b", // borostyán
    "#dc2626", // piros
    "#7c3aed", // lila
    "#0891b2", // cián
    "#64748b", // pala
] as const;

export const ALAP_SZIN = "#64748b";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Biztonságos szín-normalizálás. CSS-injection ellen: csak a preset listát VAGY
 * a `#rrggbb` formátumú hexet fogadja el (kisbetűsítve). Bármi más → alapszín.
 * Így a tárolt/megjelenített érték sosem tartalmazhat tetszőleges CSS-t.
 */
export function normalizaltSzin(input: unknown): string {
    if (typeof input !== "string") return ALAP_SZIN;
    const s = input.trim().toLowerCase();
    if ((FELADAT_SZINEK as readonly string[]).includes(s)) return s;
    if (HEX_RE.test(s)) return s;
    return ALAP_SZIN;
}

/** Igaz, ha a bemenet önmagában érvényes szín (preset vagy #rrggbb). */
export function ervenyesSzin(input: unknown): boolean {
    if (typeof input !== "string") return false;
    const s = input.trim().toLowerCase();
    return (FELADAT_SZINEK as readonly string[]).includes(s) || HEX_RE.test(s);
}

// ── Státusz / prioritás címkék ───────────────────────────────────────────────

export const FELADAT_STATUSZ_CIMKE: Record<string, string> = {
    UJ: "Új",
    FOLYAMATBAN: "Folyamatban",
    KESZ: "Kész",
    ELHALASZTVA: "Elhalasztva",
    TOROLVE: "Törölve",
};

export const FELADAT_PRIORITAS_CIMKE: Record<string, string> = {
    ALACSONY: "Alacsony",
    NORMAL: "Normál",
    MAGAS: "Magas",
    SURGOS: "Sürgős",
};

export function feladatStatuszCimke(s: string): string {
    return FELADAT_STATUSZ_CIMKE[s] ?? s;
}
export function feladatPrioritasCimke(p: string): string {
    return FELADAT_PRIORITAS_CIMKE[p] ?? p;
}

export function ervenyesStatusz(s: unknown): s is keyof typeof FELADAT_STATUSZ_CIMKE {
    return typeof s === "string" && s in FELADAT_STATUSZ_CIMKE;
}
export function ervenyesPrioritas(p: unknown): p is keyof typeof FELADAT_PRIORITAS_CIMKE {
    return typeof p === "string" && p in FELADAT_PRIORITAS_CIMKE;
}

/** A "nyitott" (még nem lezárt) státuszok — a nyitott-számláláshoz. */
export function nyitottStatusz(s: string): boolean {
    return s === "UJ" || s === "FOLYAMATBAN" || s === "ELHALASZTVA";
}

// ── Határidő ─────────────────────────────────────────────────────────────────

/**
 * Lejárt-e a feladat: van határidő, a feladat még nyitott, és a határidő elmúlt.
 * A `KESZ`/`TOROLVE` feladat sosem lejárt.
 */
export function lejart(hatarido: Date | string | null | undefined, statusz: string, most: Date = new Date()): boolean {
    if (!hatarido) return false;
    if (!nyitottStatusz(statusz)) return false;
    const d = hatarido instanceof Date ? hatarido : new Date(hatarido);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < most.getTime();
}

/** Hátralévő egész napok a határidőig (negatív, ha lejárt); null, ha nincs határidő. */
export function hatralevoNap(hatarido: Date | string | null | undefined, most: Date = new Date()): number | null {
    if (!hatarido) return null;
    const d = hatarido instanceof Date ? hatarido : new Date(hatarido);
    if (Number.isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - most.getTime()) / 86_400_000);
}

// ── Állapot-átmenet mellékhatás ──────────────────────────────────────────────

/**
 * Az `elkeszultAt` mező értéke egy státuszváltáskor.
 * - KESZ-re váltáskor: ha még nincs elkészülés-idő, `most`.
 * - KESZ-ről bármi másra: `null` (töröljük).
 * - egyébként: a meglévő érték változatlan (`undefined` = ne módosítsd).
 */
export function elkeszultAtValtozas(
    ujStatusz: string,
    regiElkeszultAt: Date | null,
    most: Date = new Date()
): Date | null | undefined {
    if (ujStatusz === "KESZ") return regiElkeszultAt ?? most;
    if (regiElkeszultAt != null) return null;
    return undefined;
}

// ── Jogosultság ──────────────────────────────────────────────────────────────

/** ADMIN/OWNER minden mezőt szerkeszthet (és létrehozhat/kioszthat feladatot). */
export function canManageFeladat(szerep: HalaszatSzerep | null): boolean {
    return szerep === "ADMIN" || szerep === "OWNER";
}

/**
 * STAFF a NEKI kiosztott feladat STÁTUSZÁT módosíthatja (pl. FOLYAMATBAN/KESZ),
 * de nem oszthatja át és nem írhat vezetői mezőt. Ez a döntés azt mondja meg,
 * hogy a hívó módosíthatja-e egyáltalán a feladatot (bármely szinten).
 */
export function canStaffFrissitStatusz(
    szerep: HalaszatSzerep | null,
    felelosId: number | null,
    aktualisUserId: number
): boolean {
    if (canManageFeladat(szerep)) return true;
    if (szerep === "STAFF" && felelosId != null && felelosId === aktualisUserId) return true;
    return false;
}

/** Mely státuszokat állíthat be a saját feladatán egy STAFF. */
export const STAFF_ENGEDETT_STATUSZOK = ["FOLYAMATBAN", "KESZ", "UJ"] as const;

export function staffAllithatStatusz(uj: string): boolean {
    return (STAFF_ENGEDETT_STATUSZOK as readonly string[]).includes(uj);
}
