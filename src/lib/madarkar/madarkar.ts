// Tiszta (pure) logika a madárkár-nyilvántartáshoz — adatbázis nélkül, unit-tesztelhető.
//  - bemenet ellenőrzése / normalizálása,
//  - összesítés (halgazdaság, tóegység, madárfaj szerint),
//  - fénykép-típus felismerés (magic bytes) és korlátok,
//  - jogosultsági szabály.

/** Gyakori halevő / halastavi kárt okozó madárfajok (javaslatlista; szabad szöveg is megengedett). */
export const MADARFAJ_JAVASLATOK = [
    "Nagy kárókatona",
    "Kis kárókatona",
    "Szürke gém",
    "Nagy kócsag",
    "Kis kócsag",
    "Bakcsó",
    "Vörös gém",
    "Fekete gólya",
    "Jégmadár",
    "Búbos vöcsök",
    "Sirály",
    "Halászsas",
    "Rétisas",
] as const;

export const MAX_FOTO_DB = 6;
/** A böngésző lekicsinyíti a képet; ez a szerveroldali felső határ egy képre. */
export const MAX_FOTO_BAJT = 3 * 1024 * 1024;
export const MAX_MEGJEGYZES = 2000;

export type MadarkarAdat = {
    toId: number;
    datum: Date;
    madarfaj: string;
    egyedszam: number | null;
    halvesztesegKg: number | null;
    karFt: number | null;
    megjegyzes: string | null;
};

type Eredmeny<T> = { ok: true; adat: T } | { ok: false; hiba: string };

function opcionalisSzam(x: unknown): number | null | undefined {
    if (x == null || x === "") return null;
    const n = typeof x === "number" ? x : Number(String(x).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
}

/**
 * Kérés törzse → ellenőrzött madárkár-adat. `reszleges`: PATCH-nél csak a
 * megadott mezőket ellenőrzi (a hiányzók nem kerülnek az eredménybe).
 */
export function ellenorizMadarkar(body: unknown, most: Date = new Date()): Eredmeny<MadarkarAdat> {
    const b = (body ?? {}) as Record<string, unknown>;

    const toId = Number(b.toId);
    if (!Number.isInteger(toId) || toId <= 0) return { ok: false, hiba: "Válaszd ki az érintett tóegységet." };

    const datum = new Date(String(b.datum ?? ""));
    if (b.datum == null || b.datum === "" || Number.isNaN(datum.getTime())) return { ok: false, hiba: "Add meg az esemény dátumát." };
    if (datum.getTime() > most.getTime() + 24 * 3_600_000) return { ok: false, hiba: "Az esemény dátuma nem lehet a jövőben." };

    const madarfaj = typeof b.madarfaj === "string" ? b.madarfaj.trim().replace(/\s+/g, " ") : "";
    if (madarfaj.length < 2) return { ok: false, hiba: "Add meg a madárfajt." };
    if (madarfaj.length > 100) return { ok: false, hiba: "A madárfaj neve legfeljebb 100 karakter lehet." };

    const egyedszam = opcionalisSzam(b.egyedszam);
    if (egyedszam === undefined || (egyedszam != null && (!Number.isInteger(egyedszam) || egyedszam < 1 || egyedszam > 100_000))) {
        return { ok: false, hiba: "A becsült egyedszám pozitív egész szám legyen." };
    }

    const halvesztesegKg = opcionalisSzam(b.halvesztesegKg);
    if (halvesztesegKg === undefined || (halvesztesegKg != null && (halvesztesegKg < 0 || halvesztesegKg > 10_000_000))) {
        return { ok: false, hiba: "A becsült halveszteség nem negatív szám (kg) legyen." };
    }

    const karFt = opcionalisSzam(b.karFt);
    if (karFt === undefined || (karFt != null && (karFt < 0 || karFt > 2_000_000_000))) {
        return { ok: false, hiba: "A becsült kár nem negatív összeg (Ft) legyen." };
    }

    const megjegyzesNyers = typeof b.megjegyzes === "string" ? b.megjegyzes.trim() : "";
    if (megjegyzesNyers.length > MAX_MEGJEGYZES) return { ok: false, hiba: `A megjegyzés legfeljebb ${MAX_MEGJEGYZES} karakter lehet.` };

    return {
        ok: true,
        adat: {
            toId,
            datum,
            madarfaj,
            egyedszam,
            halvesztesegKg: halvesztesegKg == null ? null : Math.round(halvesztesegKg * 100) / 100,
            karFt: karFt == null ? null : Math.round(karFt),
            megjegyzes: megjegyzesNyers || null,
        },
    };
}

// ─── Összesítés ──────────────────────────────────────────────────────────────

export type MadarkarSor = {
    toId: number;
    toNev: string;
    madarfaj: string;
    egyedszam: number | null;
    halvesztesegKg: number | null;
    karFt: number | null;
};

export type Osszeg = {
    esemenyDb: number;
    egyedszam: number;
    halvesztesegKg: number;
    karFt: number;
};

const ures = (): Osszeg => ({ esemenyDb: 0, egyedszam: 0, halvesztesegKg: 0, karFt: 0 });

function hozzaad(o: Osszeg, s: MadarkarSor) {
    o.esemenyDb += 1;
    o.egyedszam += s.egyedszam ?? 0;
    o.halvesztesegKg += s.halvesztesegKg ?? 0;
    o.karFt += s.karFt ?? 0;
}

const kerekit = (o: Osszeg): Osszeg => ({ ...o, halvesztesegKg: Math.round(o.halvesztesegKg * 100) / 100 });

/**
 * Halgazdaság-szintű összesítés, tóegységenként és madárfajonként.
 * A bontások kár (Ft), majd halveszteség (kg) szerint csökkenő sorrendben.
 */
export function osszesitMadarkar(sorok: MadarkarSor[]) {
    const ossz = ures();
    const toMap = new Map<number, Osszeg & { toId: number; toNev: string }>();
    const fajMap = new Map<string, Osszeg & { madarfaj: string }>();

    for (const s of sorok) {
        hozzaad(ossz, s);

        let t = toMap.get(s.toId);
        if (!t) { t = { ...ures(), toId: s.toId, toNev: s.toNev }; toMap.set(s.toId, t); }
        hozzaad(t, s);

        // Kis-nagybetű független csoportosítás, az első előfordulás írásmódjával.
        const kulcs = s.madarfaj.toLocaleLowerCase("hu");
        let f = fajMap.get(kulcs);
        if (!f) { f = { ...ures(), madarfaj: s.madarfaj }; fajMap.set(kulcs, f); }
        hozzaad(f, s);
    }

    const rendez = <T extends Osszeg>(a: T, b: T) => b.karFt - a.karFt || b.halvesztesegKg - a.halvesztesegKg || b.esemenyDb - a.esemenyDb;

    return {
        osszesen: kerekit(ossz),
        tavankent: [...toMap.values()].map((t) => ({ ...t, ...kerekit(t) })).sort(rendez),
        fajonkent: [...fajMap.values()].map((f) => ({ ...f, ...kerekit(f) })).sort(rendez),
    };
}

// ─── Fényképek ───────────────────────────────────────────────────────────────

export type KepMime = "image/jpeg" | "image/png" | "image/webp";

/** A fájl valódi típusa a tartalma (magic bytes) alapján — a kliens által küldött MIME-ban nem bízunk. */
export function kepTipus(b: Uint8Array): KepMime | null {
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
    if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
    return null;
}

// ─── Jogosultság ─────────────────────────────────────────────────────────────

/**
 * Rögzíteni bármely tag (STAFF+) tud. Módosítani / törölni (és fotót törölni)
 * az ADMIN/OWNER, vagy a saját rögzítését a rögzítő maga.
 */
export function modosithatjaMadarkar(
    szerepkor: "OWNER" | "ADMIN" | "STAFF",
    rogzitoId: number | null,
    felhasznaloId: number
): boolean {
    if (szerepkor === "OWNER" || szerepkor === "ADMIN") return true;
    return rogzitoId != null && rogzitoId === felhasznaloId;
}

// ─── Naplószöveg ─────────────────────────────────────────────────────────────

/** A madárkár-esemény ember-olvasható naplószövege (halászati napló, export). */
export function naploLeiras(a: Pick<MadarkarAdat, "madarfaj" | "egyedszam" | "halvesztesegKg" | "karFt" | "megjegyzes">): string {
    const hu = (n: number) => n.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
    return [
        `Madárfaj: ${a.madarfaj}`,
        a.egyedszam != null ? `becsült egyedszám: ${hu(a.egyedszam)}` : null,
        a.halvesztesegKg != null ? `becsült halveszteség: ${hu(a.halvesztesegKg)} kg` : null,
        a.karFt != null ? `becsült kár: ${hu(a.karFt)} Ft` : null,
        a.megjegyzes,
    ].filter(Boolean).join(" • ");
}
