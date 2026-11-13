// Tiszta (pure) térbeli logika a térkép-modulhoz. Adatbázis és Leaflet nélkül
// számol → unit-tesztelhető, és a szerver is ezt használja a validáláshoz.
//
// Koordináták: WGS84. A GeoJSON szabvány szerint a pozíció [lng, lat] sorrendű!

export type LatLng = { lat: number; lng: number };

/** GeoJSON Polygon geometria: gyűrűk listája, az első a külső körvonal. */
export type PoligonGeometria = {
    type: "Polygon";
    coordinates: number[][][];
};

/** Ennyi tizedesre kerekítjük a koordinátákat (~1 cm). */
export const KOORD_TIZEDES = 7;
/** Egy körvonal legfeljebb ennyi pontból állhat (védelem a túl nagy JSON ellen). */
export const MAX_PONT = 2000;
/** WGS84 egyenlítői sugár (m) — ugyanaz, mint a turf / Leaflet területszámításnál. */
const FOLD_SUGAR = 6378137;

const kerekit = (n: number) => Math.round(n * 10 ** KOORD_TIZEDES) / 10 ** KOORD_TIZEDES;

export function ervenyesKoordinata(lat: unknown, lng: unknown): lat is number {
    return (
        typeof lat === "number" && typeof lng === "number" &&
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    );
}

/**
 * Felhasználói / kérésből jövő pont → {lat, lng}, vagy null, ha érvénytelen.
 * Számot és szám-stringet is elfogad.
 */
export function pontBemenetbol(lat: unknown, lng: unknown): LatLng | null {
    const la = typeof lat === "string" ? Number(lat.replace(",", ".")) : lat;
    const ln = typeof lng === "string" ? Number(lng.replace(",", ".")) : lng;
    if (lat === "" || lng === "" || lat == null || lng == null) return null;
    if (!ervenyesKoordinata(la, ln)) return null;
    return { lat: Math.round((la as number) * 1e6) / 1e6, lng: Math.round((ln as number) * 1e6) / 1e6 };
}

export type PoligonEredmeny =
    | { ok: true; geometria: PoligonGeometria }
    | { ok: false; hiba: string };

function azonosPont(a: number[], b: number[]) {
    return a[0] === b[0] && a[1] === b[1];
}

/**
 * Bejövő érték (GeoJSON Polygon geometria vagy Feature) ellenőrzése és
 * normalizálása: kerekítés, gyűrű lezárása, minimum 3 különböző pont.
 * A lyukakat (belső gyűrűk) is elfogadja és ugyanígy ellenőrzi.
 */
export function normalizalPoligon(bemenet: unknown): PoligonEredmeny {
    const obj = bemenet as { type?: unknown; geometry?: unknown; coordinates?: unknown } | null;
    const geom = (obj?.type === "Feature" ? obj.geometry : obj) as { type?: unknown; coordinates?: unknown } | null;

    if (!geom || geom.type !== "Polygon" || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
        return { ok: false, hiba: "A körvonal nem érvényes sokszög (GeoJSON Polygon)." };
    }

    let osszPont = 0;
    const gyuruk: number[][][] = [];

    for (const nyersGyuru of geom.coordinates as unknown[]) {
        if (!Array.isArray(nyersGyuru)) return { ok: false, hiba: "Hibás körvonal-gyűrű." };

        const gyuru: number[][] = [];
        for (const p of nyersGyuru as unknown[]) {
            if (!Array.isArray(p) || p.length < 2) return { ok: false, hiba: "Hibás koordináta a körvonalban." };
            const [lng, lat] = p as unknown[];
            if (!ervenyesKoordinata(lat, lng)) return { ok: false, hiba: "Érvénytelen koordináta a körvonalban." };
            const pont = [kerekit(lng as number), kerekit(lat as number)];
            // Egymást követő duplikált pontok kiszűrése.
            if (gyuru.length > 0 && azonosPont(gyuru[gyuru.length - 1], pont)) continue;
            gyuru.push(pont);
        }

        // Lezárás: az első és az utolsó pont egyezzen.
        if (gyuru.length > 0 && !azonosPont(gyuru[0], gyuru[gyuru.length - 1])) gyuru.push([...gyuru[0]]);

        // Lezárva legalább 4 pont = legalább 3 különböző csúcs.
        if (gyuru.length < 4) return { ok: false, hiba: "A körvonalhoz legalább 3 pont kell." };

        osszPont += gyuru.length;
        gyuruk.push(gyuru);
    }

    if (osszPont > MAX_PONT) return { ok: false, hiba: `A körvonal legfeljebb ${MAX_PONT} pontból állhat.` };
    if (gyuruTeruletM2(gyuruk[0]) < 1) return { ok: false, hiba: "A körvonal területe túl kicsi (kevesebb, mint 1 m²)." };

    return { ok: true, geometria: { type: "Polygon", coordinates: gyuruk } };
}

const rad = (fok: number) => (fok * Math.PI) / 180;

/**
 * Egy zárt gyűrű területe m²-ben, gömbi közelítéssel (Chamberlain & Duquette —
 * ugyanaz a képlet, amit a turf.js és a Leaflet.GeometryUtil használ).
 */
export function gyuruTeruletM2(gyuru: number[][]): number {
    const n = gyuru.length;
    if (n < 3) return 0;
    let osszeg = 0;
    for (let i = 0; i < n; i++) {
        const [lng1, lat1] = gyuru[i];
        const [lng2, lat2] = gyuru[(i + 1) % n];
        osszeg += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
    }
    return Math.abs((osszeg * FOLD_SUGAR * FOLD_SUGAR) / 2);
}

/** Sokszög területe m²-ben (külső gyűrű mínusz a lyukak), 2 tizedesre. */
export function poligonTeruletM2(g: PoligonGeometria): number {
    const [kulso, ...lyukak] = g.coordinates;
    const t = gyuruTeruletM2(kulso) - lyukak.reduce((s, l) => s + gyuruTeruletM2(l), 0);
    return Math.round(Math.max(0, t) * 100) / 100;
}

/**
 * A külső gyűrű területi súlypontja (sík közelítés helyi vetületben — tó-méretű
 * sokszögekre bőven pontos). Degenerált esetben a csúcsok átlaga.
 */
export function poligonKozeppont(g: PoligonGeometria): LatLng {
    const gyuru = g.coordinates[0];
    const lat0 = rad(gyuru[0][1]);
    const kx = Math.cos(lat0); // lng → x skálázás

    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < gyuru.length - 1; i++) {
        const x1 = gyuru[i][0] * kx, y1 = gyuru[i][1];
        const x2 = gyuru[i + 1][0] * kx, y2 = gyuru[i + 1][1];
        const k = x1 * y2 - x2 * y1;
        a += k;
        cx += (x1 + x2) * k;
        cy += (y1 + y2) * k;
    }

    let lat: number, lng: number;
    if (Math.abs(a) < 1e-15) {
        const pontok = gyuru.slice(0, -1);
        lng = pontok.reduce((s, p) => s + p[0], 0) / pontok.length;
        lat = pontok.reduce((s, p) => s + p[1], 0) / pontok.length;
    } else {
        lng = cx / (3 * a) / kx;
        lat = cy / (3 * a);
    }
    return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

export type KorvonalMezok = {
    korvonal: PoligonGeometria;
    kozeppontLat: number;
    kozeppontLng: number;
    rajzoltTeruletM2: number;
};

/**
 * Kérésből jövő körvonal → a `To` táblába írandó mezők (geometria + számolt
 * középpont és terület). A szerver mindig maga számol, a kliensben nem bízunk.
 */
export function korvonalMezok(bemenet: unknown): { ok: true; mezok: KorvonalMezok } | { ok: false; hiba: string } {
    const r = normalizalPoligon(bemenet);
    if (!r.ok) return r;
    const k = poligonKozeppont(r.geometria);
    return {
        ok: true,
        mezok: {
            korvonal: r.geometria,
            kozeppontLat: k.lat,
            kozeppontLng: k.lng,
            rajzoltTeruletM2: poligonTeruletM2(r.geometria),
        },
    };
}

/** Leaflet-sorrendű ([lat, lng]) pontlista a külső gyűrűből — megjelenítéshez. */
export function kulsoGyuruLatLng(g: PoligonGeometria): [number, number][] {
    return g.coordinates[0].slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

/** m² → „1750 m² (0,175 ha)” jellegű szöveg. */
export function rajzoltTeruletSzoveg(m2: number): string {
    const ha = m2 / 10_000;
    return `${Math.round(m2).toLocaleString("hu-HU")} m² (${ha.toLocaleString("hu-HU", { maximumFractionDigits: 4 })} ha)`;
}
