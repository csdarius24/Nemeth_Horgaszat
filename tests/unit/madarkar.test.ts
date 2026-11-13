import { describe, expect, it } from "vitest";
import {
    ellenorizMadarkar,
    kepTipus,
    MAX_MEGJEGYZES,
    modosithatjaMadarkar,
    osszesitMadarkar,
    type MadarkarSor,
} from "@/lib/madarkar/madarkar";

const MOST = new Date("2026-11-13T12:00:00Z");
const alap = { toId: 3, datum: "2026-11-12", madarfaj: "Nagy kárókatona" };

describe("ellenorizMadarkar", () => {
    it("minimális érvényes bemenet", () => {
        const r = ellenorizMadarkar(alap, MOST);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.adat).toMatchObject({ toId: 3, madarfaj: "Nagy kárókatona", egyedszam: null, halvesztesegKg: null, karFt: null, megjegyzes: null });
    });
    it("teljes bemenet: tizedesvessző, szóközös ezres tagolás, kerekítés", () => {
        const r = ellenorizMadarkar({ ...alap, egyedszam: "40", halvesztesegKg: "120,456", karFt: "150 000", megjegyzes: "  reggel  " }, MOST);
        expect(r.ok && r.adat).toMatchObject({ egyedszam: 40, halvesztesegKg: 120.46, karFt: 150000, megjegyzes: "reggel" });
    });
    it("hiányzó / hibás kötelező mezők", () => {
        expect(ellenorizMadarkar({ ...alap, toId: 0 }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, datum: "" }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, datum: "nem dátum" }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, madarfaj: " " }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, madarfaj: "x".repeat(101) }, MOST).ok).toBe(false);
    });
    it("jövőbeli dátum nem lehet (1 nap tűrés)", () => {
        expect(ellenorizMadarkar({ ...alap, datum: "2026-11-20" }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, datum: "2026-11-14T06:00:00Z" }, MOST).ok).toBe(true);
    });
    it("számmezők tartománya", () => {
        expect(ellenorizMadarkar({ ...alap, egyedszam: 0 }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, egyedszam: 2.5 }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, halvesztesegKg: -1 }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, karFt: "abc" }, MOST).ok).toBe(false);
        expect(ellenorizMadarkar({ ...alap, halvesztesegKg: 0 }, MOST).ok).toBe(true);
    });
    it("túl hosszú megjegyzés", () => {
        expect(ellenorizMadarkar({ ...alap, megjegyzes: "x".repeat(MAX_MEGJEGYZES + 1) }, MOST).ok).toBe(false);
    });
});

describe("osszesitMadarkar", () => {
    const sor = (r: Partial<MadarkarSor>): MadarkarSor => ({
        toId: 1, toNev: "Nagy-tó", madarfaj: "Nagy kárókatona", egyedszam: null, halvesztesegKg: null, karFt: null, ...r,
    });

    it("összesen + tavankénti + fajonkénti bontás, kár szerint rendezve", () => {
        const o = osszesitMadarkar([
            sor({ egyedszam: 30, halvesztesegKg: 100, karFt: 120000 }),
            sor({ toId: 2, toNev: "Kis telelő", madarfaj: "Szürke gém", egyedszam: 4, halvesztesegKg: 10.555, karFt: 15000 }),
            sor({ madarfaj: "nagy kárókatona", egyedszam: 10, halvesztesegKg: 20 }),
        ]);
        expect(o.osszesen).toEqual({ esemenyDb: 3, egyedszam: 44, halvesztesegKg: 130.56, karFt: 135000 });
        expect(o.tavankent.map((t) => [t.toNev, t.esemenyDb, t.karFt])).toEqual([["Nagy-tó", 2, 120000], ["Kis telelő", 1, 15000]]);
        // kis-nagybetű független fajcsoportosítás, első írásmód
        expect(o.fajonkent.map((f) => [f.madarfaj, f.esemenyDb, f.egyedszam])).toEqual([["Nagy kárókatona", 2, 40], ["Szürke gém", 1, 4]]);
    });
    it("üres lista", () => {
        expect(osszesitMadarkar([])).toEqual({ osszesen: { esemenyDb: 0, egyedszam: 0, halvesztesegKg: 0, karFt: 0 }, tavankent: [], fajonkent: [] });
    });
});

describe("kepTipus", () => {
    it("JPEG / PNG / WebP felismerése a tartalomból", () => {
        expect(kepTipus(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
        expect(kepTipus(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
        expect(kepTipus(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    });
    it("más tartalom (pl. PDF, szöveg, SVG) → null", () => {
        expect(kepTipus(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
        expect(kepTipus(new TextEncoder().encode("<svg xmlns=..."))).toBeNull();
        expect(kepTipus(new Uint8Array([]))).toBeNull();
    });
});

describe("modosithatjaMadarkar", () => {
    it("ADMIN/OWNER bármit, STAFF csak a sajátját", () => {
        expect(modosithatjaMadarkar("ADMIN", 5, 9)).toBe(true);
        expect(modosithatjaMadarkar("OWNER", null, 9)).toBe(true);
        expect(modosithatjaMadarkar("STAFF", 9, 9)).toBe(true);
        expect(modosithatjaMadarkar("STAFF", 5, 9)).toBe(false);
        expect(modosithatjaMadarkar("STAFF", null, 9)).toBe(false);
    });
});

import { naploLeiras } from "@/lib/madarkar/madarkar";

describe("naploLeiras", () => {
    it("csak a megadott adatokat írja ki, magyar számformátummal", () => {
        expect(naploLeiras({ madarfaj: "Szürke gém", egyedszam: 4, halvesztesegKg: 10.5, karFt: null, megjegyzes: null }).replace(/\s/g, " "))
            .toBe("Madárfaj: Szürke gém • becsült egyedszám: 4 • becsült halveszteség: 10,5 kg");
        expect(naploLeiras({ madarfaj: "Kárókatona", egyedszam: null, halvesztesegKg: null, karFt: 150000, megjegyzes: "hajnalban" }).replace(/\s/g, " "))
            .toBe("Madárfaj: Kárókatona • becsült kár: 150 000 Ft • hajnalban");
    });
});
