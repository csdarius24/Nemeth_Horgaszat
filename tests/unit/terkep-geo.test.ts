import { describe, expect, it } from "vitest";
import {
    kulsoGyuruLatLng,
    normalizalPoligon,
    poligonKozeppont,
    poligonTeruletM2,
    pontBemenetbol,
    type PoligonGeometria,
} from "@/lib/terkep/geo";

// ~100 m × 100 m négyzet Magyarországon (47° É). 1° szélesség ≈ 111 320 m,
// 1° hosszúság 47°-on ≈ 75 920 m (gömbi közelítés).
const LAT0 = 47.0;
const LNG0 = 19.0;
const dLat = 100 / 111_320;
const dLng = 100 / (111_320 * Math.cos((LAT0 * Math.PI) / 180));
const negyzet = (): PoligonGeometria => ({
    type: "Polygon",
    coordinates: [[
        [LNG0, LAT0],
        [LNG0 + dLng, LAT0],
        [LNG0 + dLng, LAT0 + dLat],
        [LNG0, LAT0 + dLat],
        [LNG0, LAT0],
    ]],
});

describe("pontBemenetbol", () => {
    it("számot és szám-stringet is elfogad (vesszővel is)", () => {
        expect(pontBemenetbol(47.5, 19.05)).toEqual({ lat: 47.5, lng: 19.05 });
        expect(pontBemenetbol("47,1234567", "19.7654321")).toEqual({ lat: 47.123457, lng: 19.765432 });
    });
    it("tartományon kívüli / hiányzó → null", () => {
        expect(pontBemenetbol(91, 19)).toBeNull();
        expect(pontBemenetbol(47, 181)).toBeNull();
        expect(pontBemenetbol(null, 19)).toBeNull();
        expect(pontBemenetbol("", "")).toBeNull();
        expect(pontBemenetbol("abc", 19)).toBeNull();
    });
});

describe("normalizalPoligon", () => {
    it("érvényes négyzet átmegy, Feature-be csomagolva is", () => {
        expect(normalizalPoligon(negyzet()).ok).toBe(true);
        expect(normalizalPoligon({ type: "Feature", properties: {}, geometry: negyzet() }).ok).toBe(true);
    });
    it("nyitott gyűrűt lezárja", () => {
        const g = negyzet();
        g.coordinates[0].pop();
        const r = normalizalPoligon(g);
        expect(r.ok).toBe(true);
        if (r.ok) {
            const gy = r.geometria.coordinates[0];
            expect(gy[0]).toEqual(gy[gy.length - 1]);
        }
    });
    it("kevesebb mint 3 különböző pont → hiba", () => {
        const r = normalizalPoligon({ type: "Polygon", coordinates: [[[19, 47], [19.001, 47], [19, 47]]] });
        expect(r.ok).toBe(false);
    });
    it("duplikált egymás utáni pontokat kiszűri", () => {
        const g = negyzet();
        g.coordinates[0].splice(1, 0, [...g.coordinates[0][1]]);
        const r = normalizalPoligon(g);
        expect(r.ok && r.geometria.coordinates[0].length).toBe(5);
    });
    it("érvénytelen koordináta / típus → hiba", () => {
        expect(normalizalPoligon({ type: "Polygon", coordinates: [[[19, 95], [19.1, 47], [19, 47.1]]] }).ok).toBe(false);
        expect(normalizalPoligon({ type: "Point", coordinates: [19, 47] }).ok).toBe(false);
        expect(normalizalPoligon(null).ok).toBe(false);
        expect(normalizalPoligon("valami").ok).toBe(false);
    });
});

describe("poligonTeruletM2", () => {
    it("~100 × 100 m négyzet ≈ 10 000 m² (±1%)", () => {
        const t = poligonTeruletM2(negyzet());
        expect(t).toBeGreaterThan(9_900);
        expect(t).toBeLessThan(10_100);
    });
    it("lyuk levonódik", () => {
        const g = negyzet();
        const kicsi = (f: number) => [LNG0 + dLng * f, LAT0 + dLat * f];
        g.coordinates.push([kicsi(0.25), [LNG0 + dLng * 0.75, LAT0 + dLat * 0.25], kicsi(0.75), [LNG0 + dLng * 0.25, LAT0 + dLat * 0.75], kicsi(0.25)]);
        const t = poligonTeruletM2(g);
        expect(t).toBeGreaterThan(7_400);
        expect(t).toBeLessThan(7_600);
    });
    it("körüljárási iránytól független", () => {
        const g = negyzet();
        const fordított: PoligonGeometria = { type: "Polygon", coordinates: [[...g.coordinates[0]].reverse()] };
        expect(poligonTeruletM2(fordított)).toBe(poligonTeruletM2(g));
    });
});

describe("poligonKozeppont", () => {
    it("négyzet középpontja a közepe", () => {
        const k = poligonKozeppont(negyzet());
        expect(k.lat).toBeCloseTo(LAT0 + dLat / 2, 5);
        expect(k.lng).toBeCloseTo(LNG0 + dLng / 2, 5);
    });
});

describe("kulsoGyuruLatLng", () => {
    it("[lat, lng] sorrend, a záró pont nélkül", () => {
        const p = kulsoGyuruLatLng(negyzet());
        expect(p).toHaveLength(4);
        expect(p[0]).toEqual([LAT0, LNG0]);
    });
});
