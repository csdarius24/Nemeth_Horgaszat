// Tiszta (pure) logika a tókezelésekhez — adatbázis nélkül, unit-tesztelhető.
//  - kezeléstípusok és megengedett mértékegységek,
//  - bemenet ellenőrzése,
//  - tömegre átváltás (kg), összesítés tavanként és típusonként (+ kg/ha),
//  - élelmezés-egészségügyi várakozási idő (gyógyszer / antibiotikum).

export const TOKEZELES_TIPUSOK = [
    "SZERVESTRAGYA", "MESZEZES", "KLORMESZ", "GYOGYSZER", "ANTIBIOTIKUM", "VITAMIN", "EGYEB",
] as const;
export type TokezelesTipus = (typeof TOKEZELES_TIPUSOK)[number];

export const EGYSEGEK = ["kg", "t", "g", "l", "ml", "db"] as const;
export type Egyseg = (typeof EGYSEGEK)[number];

export type TipusMeta = {
    cimke: string;
    /** Megengedett mértékegységek; az első az alapértelmezett. */
    egysegek: readonly Egyseg[];
    /** Van-e értelme élelmezés-egészségügyi várakozási időnek. */
    varakozasiIdo: boolean;
    /** A készítmény / hatóanyag megadása kötelező (nyomon követhetőség). */
    keszitmenyKotelezo: boolean;
    keszitmenyPelda: string;
};

export const TIPUS_META: Record<TokezelesTipus, TipusMeta> = {
    SZERVESTRAGYA: { cimke: "Szervestrágya", egysegek: ["t", "kg"], varakozasiIdo: false, keszitmenyKotelezo: false, keszitmenyPelda: "pl. érett marhatrágya" },
    MESZEZES: { cimke: "Meszezés", egysegek: ["kg", "t"], varakozasiIdo: false, keszitmenyKotelezo: false, keszitmenyPelda: "pl. égetett mész" },
    KLORMESZ: { cimke: "Klórmész", egysegek: ["kg", "t"], varakozasiIdo: false, keszitmenyKotelezo: false, keszitmenyPelda: "pl. klórmész 25%" },
    GYOGYSZER: { cimke: "Gyógyszer", egysegek: ["g", "kg", "ml", "l", "db"], varakozasiIdo: true, keszitmenyKotelezo: true, keszitmenyPelda: "a készítmény neve" },
    ANTIBIOTIKUM: { cimke: "Antibiotikum", egysegek: ["g", "kg", "ml", "l", "db"], varakozasiIdo: true, keszitmenyKotelezo: true, keszitmenyPelda: "a készítmény neve" },
    VITAMIN: { cimke: "Vitamin", egysegek: ["g", "kg", "ml", "l"], varakozasiIdo: false, keszitmenyKotelezo: false, keszitmenyPelda: "a készítmény neve" },
    EGYEB: { cimke: "Egyéb", egysegek: ["kg", "t", "g", "l", "ml", "db"], varakozasiIdo: false, keszitmenyKotelezo: false, keszitmenyPelda: "az anyag neve" },
};

export const ervenyesTipus = (t: unknown): t is TokezelesTipus =>
    typeof t === "string" && (TOKEZELES_TIPUSOK as readonly string[]).includes(t);

/** Gyógykezelés-jellegű típusok (dashboard: „gyógykezelések száma”). */
export const GYOGYKEZELES_TIPUSOK: readonly TokezelesTipus[] = ["GYOGYSZER", "ANTIBIOTIKUM", "VITAMIN"];

export const MAX_VARAKOZAS_NAP = 365;

export type TokezelesAdat = {
    toId: number;
    datum: Date;
    tipus: TokezelesTipus;
    keszitmeny: string | null;
    hatoanyag: string | null;
    mennyiseg: number;
    egyseg: Egyseg;
    koltsegFt: number | null;
    varakozasiIdoNap: number | null;
    kezelesOka: string | null;
    megjegyzes: string | null;
};

type Eredmeny<T> = { ok: true; adat: T } | { ok: false; hiba: string };

function szamBemenet(x: unknown): number | null | undefined {
    if (x == null || x === "") return null;
    const n = typeof x === "number" ? x : Number(String(x).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
}

const szoveg = (x: unknown, max: number): string | null | undefined => {
    if (x == null) return null;
    const s = String(x).trim().replace(/\s+/g, " ");
    if (!s) return null;
    return s.length > max ? undefined : s;
};

/** Kérés törzse → ellenőrzött tókezelés-adat. */
export function ellenorizTokezeles(body: unknown, most: Date = new Date()): Eredmeny<TokezelesAdat> {
    const b = (body ?? {}) as Record<string, unknown>;

    const toId = Number(b.toId);
    if (!Number.isInteger(toId) || toId <= 0) return { ok: false, hiba: "Válaszd ki a tóegységet." };

    if (!ervenyesTipus(b.tipus)) return { ok: false, hiba: "Válaszd ki a kezelés típusát." };
    const tipus = b.tipus;
    const meta = TIPUS_META[tipus];

    const datum = new Date(String(b.datum ?? ""));
    if (b.datum == null || b.datum === "" || Number.isNaN(datum.getTime())) return { ok: false, hiba: "Add meg a kezelés dátumát." };
    if (datum.getTime() > most.getTime() + 24 * 3_600_000) return { ok: false, hiba: "A kezelés dátuma nem lehet a jövőben." };

    const mennyiseg = szamBemenet(b.mennyiseg);
    if (mennyiseg == null || mennyiseg <= 0 || mennyiseg > 1e9) return { ok: false, hiba: "Add meg a bejuttatott mennyiséget (pozitív szám)." };

    const egyseg = String(b.egyseg ?? "") as Egyseg;
    if (!meta.egysegek.includes(egyseg)) {
        return { ok: false, hiba: `Ehhez a kezeléshez ezek a mértékegységek választhatók: ${meta.egysegek.join(", ")}.` };
    }

    const keszitmeny = szoveg(b.keszitmeny, 150);
    const hatoanyag = szoveg(b.hatoanyag, 150);
    if (keszitmeny === undefined || hatoanyag === undefined) return { ok: false, hiba: "A készítmény / hatóanyag neve legfeljebb 150 karakter lehet." };
    if (meta.keszitmenyKotelezo && !keszitmeny && !hatoanyag) {
        return { ok: false, hiba: `${meta.cimke} esetén a készítmény vagy a hatóanyag megadása kötelező (nyomon követhetőség).` };
    }

    const koltseg = szamBemenet(b.koltsegFt);
    if (koltseg === undefined || (koltseg != null && (koltseg < 0 || koltseg > 2_000_000_000))) {
        return { ok: false, hiba: "A költség nem negatív összeg (Ft) legyen." };
    }

    let varakozasiIdoNap: number | null = null;
    if (meta.varakozasiIdo) {
        const v = szamBemenet(b.varakozasiIdoNap);
        if (v === undefined || (v != null && (!Number.isInteger(v) || v < 0 || v > MAX_VARAKOZAS_NAP))) {
            return { ok: false, hiba: `A várakozási idő 0–${MAX_VARAKOZAS_NAP} közötti egész szám (nap) legyen.` };
        }
        varakozasiIdoNap = v;
    }

    const kezelesOka = szoveg(b.kezelesOka, 300);
    if (kezelesOka === undefined) return { ok: false, hiba: "A kezelés oka legfeljebb 300 karakter lehet." };

    const megjegyzesNyers = typeof b.megjegyzes === "string" ? b.megjegyzes.trim() : "";
    if (megjegyzesNyers.length > 2000) return { ok: false, hiba: "A megjegyzés legfeljebb 2000 karakter lehet." };

    return {
        ok: true,
        adat: {
            toId, datum, tipus, keszitmeny, hatoanyag,
            mennyiseg: Math.round(mennyiseg * 1000) / 1000,
            egyseg,
            koltsegFt: koltseg == null ? null : Math.round(koltseg),
            varakozasiIdoNap,
            kezelesOka,
            megjegyzes: megjegyzesNyers || null,
        },
    };
}

// ─── Átváltás ────────────────────────────────────────────────────────────────

/** Tömegegységek → kg; térfogat / darab → null (nem összeadható tömeggel). */
export function kgBan(mennyiseg: number, egyseg: string): number | null {
    switch (egyseg) {
        case "t": return mennyiseg * 1000;
        case "kg": return mennyiseg;
        case "g": return mennyiseg / 1000;
        default: return null;
    }
}

const kerek = (n: number, t = 3) => Math.round(n * 10 ** t) / 10 ** t;

// ─── Várakozási idő ──────────────────────────────────────────────────────────

/** A várakozási idő vége: a kezelés napja + N nap. 0 vagy null → nincs várakozás. */
export function varakozasVege(datum: Date | string, napok: number | null | undefined): Date | null {
    if (!napok || napok <= 0) return null;
    const d = new Date(datum);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getTime() + napok * 86_400_000);
}

export type TokezelesSor = {
    toId: number;
    toNev: string;
    datum: Date | string;
    tipus: TokezelesTipus;
    keszitmeny: string | null;
    hatoanyag: string | null;
    mennyiseg: number;
    egyseg: string;
    koltsegFt: number | null;
    varakozasiIdoNap: number | null;
};

export type AktivVarakozas = {
    toId: number;
    toNev: string;
    tipus: TokezelesTipus;
    keszitmeny: string | null;
    veg: string;
    hatraNap: number;
};

/**
 * A még tartó várakozási idők tavanként (a legkésőbb lejáró kezelés számít).
 * Rendezés: a legtovább tartó elöl.
 */
export function aktivVarakozasok(sorok: TokezelesSor[], most: Date = new Date()): AktivVarakozas[] {
    const legkesobb = new Map<number, AktivVarakozas & { _veg: number }>();
    for (const s of sorok) {
        const veg = varakozasVege(s.datum, s.varakozasiIdoNap);
        if (!veg || veg.getTime() <= most.getTime()) continue;
        const regi = legkesobb.get(s.toId);
        if (regi && regi._veg >= veg.getTime()) continue;
        legkesobb.set(s.toId, {
            toId: s.toId, toNev: s.toNev, tipus: s.tipus, keszitmeny: s.keszitmeny ?? s.hatoanyag,
            veg: veg.toISOString(),
            hatraNap: Math.ceil((veg.getTime() - most.getTime()) / 86_400_000),
            _veg: veg.getTime(),
        });
    }
    return [...legkesobb.values()].sort((a, b) => b._veg - a._veg).map(({ _veg: _v, ...v }) => { void _v; return v; });
}

// ─── Összesítés ──────────────────────────────────────────────────────────────

export type TipusOsszeg = {
    tipus: TokezelesTipus;
    cimke: string;
    db: number;
    /** A tömegegységben (t/kg/g) megadott tételek összege kg-ban. */
    tomegKg: number;
    /** A nem tömeg-egységű tételek egységenként (pl. { l: 2, ml: 500 }). */
    egyebMennyisegek: Partial<Record<Egyseg, number>>;
    koltsegFt: number;
};

export type ToOsszeg = {
    toId: number;
    toNev: string;
    db: number;
    szervestragyaKg: number;
    meszKg: number;
    gyogykezelesDb: number;
    koltsegFt: number;
    /** Szervestrágya kg/ha — csak ha ismert a tó területe. */
    szervestragyaKgPerHa: number | null;
};

/**
 * Összesítés típusonként és tavanként. `teruletHa`: tó azonosító → terület (ha),
 * a hektáronkénti trágyaadaghoz.
 */
export function osszesitTokezeles(sorok: TokezelesSor[], teruletHa: Map<number, number | null> = new Map()) {
    const tipusMap = new Map<TokezelesTipus, TipusOsszeg>();
    const toMap = new Map<number, ToOsszeg>();
    let koltsegOssz = 0;

    for (const s of sorok) {
        const kg = kgBan(s.mennyiseg, s.egyseg);
        const koltseg = s.koltsegFt ?? 0;
        koltsegOssz += koltseg;

        let t = tipusMap.get(s.tipus);
        if (!t) {
            t = { tipus: s.tipus, cimke: TIPUS_META[s.tipus].cimke, db: 0, tomegKg: 0, egyebMennyisegek: {}, koltsegFt: 0 };
            tipusMap.set(s.tipus, t);
        }
        t.db++;
        t.koltsegFt += koltseg;
        if (kg != null) t.tomegKg += kg;
        else t.egyebMennyisegek[s.egyseg as Egyseg] = (t.egyebMennyisegek[s.egyseg as Egyseg] ?? 0) + s.mennyiseg;

        let o = toMap.get(s.toId);
        if (!o) {
            o = { toId: s.toId, toNev: s.toNev, db: 0, szervestragyaKg: 0, meszKg: 0, gyogykezelesDb: 0, koltsegFt: 0, szervestragyaKgPerHa: null };
            toMap.set(s.toId, o);
        }
        o.db++;
        o.koltsegFt += koltseg;
        if (s.tipus === "SZERVESTRAGYA" && kg != null) o.szervestragyaKg += kg;
        if ((s.tipus === "MESZEZES" || s.tipus === "KLORMESZ") && kg != null) o.meszKg += kg;
        if (GYOGYKEZELES_TIPUSOK.includes(s.tipus)) o.gyogykezelesDb++;
    }

    const tavankent = [...toMap.values()].map((o) => {
        const ha = teruletHa.get(o.toId);
        return {
            ...o,
            szervestragyaKg: kerek(o.szervestragyaKg),
            meszKg: kerek(o.meszKg),
            szervestragyaKgPerHa: ha && ha > 0 && o.szervestragyaKg > 0 ? kerek(o.szervestragyaKg / ha, 1) : null,
        };
    }).sort((a, b) => a.toNev.localeCompare(b.toNev, "hu"));

    const tipusonkent = TOKEZELES_TIPUSOK
        .map((t) => tipusMap.get(t))
        .filter((t): t is TipusOsszeg => !!t)
        .map((t) => ({
            ...t,
            tomegKg: kerek(t.tomegKg),
            egyebMennyisegek: Object.fromEntries(Object.entries(t.egyebMennyisegek).map(([k, v]) => [k, kerek(v ?? 0)])),
        }));

    return {
        osszesen: {
            db: sorok.length,
            koltsegFt: koltsegOssz,
            szervestragyaKg: kerek(tavankent.reduce((s, t) => s + t.szervestragyaKg, 0)),
            meszKg: kerek(tavankent.reduce((s, t) => s + t.meszKg, 0)),
            gyogykezelesDb: tavankent.reduce((s, t) => s + t.gyogykezelesDb, 0),
        },
        tipusonkent,
        tavankent,
    };
}

// ─── Napló, jogosultság ──────────────────────────────────────────────────────

const hu = (n: number) => n.toLocaleString("hu-HU", { maximumFractionDigits: 3 });

export function naploCim(a: Pick<TokezelesAdat, "tipus" | "keszitmeny" | "hatoanyag">): string {
    const nev = a.keszitmeny ?? a.hatoanyag;
    return `${TIPUS_META[a.tipus].cimke}${nev ? ` — ${nev}` : ""}`;
}

export function naploLeiras(a: TokezelesAdat): string {
    return [
        `${TIPUS_META[a.tipus].cimke}: ${hu(a.mennyiseg)} ${a.egyseg}`,
        a.keszitmeny ? `készítmény: ${a.keszitmeny}` : null,
        a.hatoanyag ? `hatóanyag: ${a.hatoanyag}` : null,
        a.kezelesOka ? `ok: ${a.kezelesOka}` : null,
        a.varakozasiIdoNap ? `várakozási idő: ${a.varakozasiIdoNap} nap` : null,
        a.koltsegFt != null ? `költség: ${hu(a.koltsegFt)} Ft` : null,
        a.megjegyzes,
    ].filter(Boolean).join(" • ");
}

/** Rögzíteni bármely tag tud; módosítani/törölni az ADMIN/OWNER vagy a saját rögzítését a rögzítő. */
export function modosithatjaTokezeles(szerepkor: "OWNER" | "ADMIN" | "STAFF", rogzitoId: number | null, felhasznaloId: number): boolean {
    if (szerepkor === "OWNER" || szerepkor === "ADMIN") return true;
    return rogzitoId != null && rogzitoId === felhasznaloId;
}

// ─── Megjelenítés ────────────────────────────────────────────────────────────

const igFormazo = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/** „2026. dec. 13-ig” — a magyar dátum végi pont nélkül, „-ig” raggal. */
export function datumIg(iso: string | Date): string {
    return `${igFormazo.format(new Date(iso)).replace(/\.\s*$/, "")}-ig`;
}
