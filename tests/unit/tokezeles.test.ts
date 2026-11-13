import { describe, expect, it } from "vitest";
import {
    aktivVarakozasok,
    ellenorizTokezeles,
    kgBan,
    modosithatjaTokezeles,
    naploCim,
    naploLeiras,
    osszesitTokezeles,
    TIPUS_META,
    varakozasVege,
    type TokezelesSor,
} from "@/lib/tokezeles/tokezeles";

const MOST = new Date("2026-11-13T12:00:00Z");
const alap = { toId: 1, tipus: "SZERVESTRAGYA", datum: "2026-11-10T12:00:00Z", mennyiseg: "12,5", egyseg: "t" };

describe("ellenorizTokezeles", () => {
    it("szervestrágya: tizedesvessző, alapadatok", () => {
        const r = ellenorizTokezeles(alap, MOST);
        expect(r.ok && r.adat).toMatchObject({ toId: 1, tipus: "SZERVESTRAGYA", mennyiseg: 12.5, egyseg: "t", varakozasiIdoNap: null });
    });
    it("kötelező mezők és típus", () => {
        expect(ellenorizTokezeles({ ...alap, toId: 0 }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, tipus: "VALAMI" }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, datum: "" }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, mennyiseg: 0 }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, mennyiseg: "" }, MOST).ok).toBe(false);
    });
    it("a mértékegységnek illenie kell a típushoz", () => {
        expect(ellenorizTokezeles({ ...alap, egyseg: "ml" }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, tipus: "GYOGYSZER", egyseg: "ml", keszitmeny: "X" }, MOST).ok).toBe(true);
    });
    it("gyógyszer / antibiotikum: készítmény vagy hatóanyag kötelező, várakozási idő megadható", () => {
        const ab = { ...alap, tipus: "ANTIBIOTIKUM", egyseg: "g", mennyiseg: 250 };
        expect(ellenorizTokezeles(ab, MOST).ok).toBe(false);
        const r = ellenorizTokezeles({ ...ab, hatoanyag: "oxitetraciklin", varakozasiIdoNap: "30" }, MOST);
        expect(r.ok && r.adat).toMatchObject({ hatoanyag: "oxitetraciklin", varakozasiIdoNap: 30 });
        expect(ellenorizTokezeles({ ...ab, keszitmeny: "X", varakozasiIdoNap: 400 }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...ab, keszitmeny: "X", varakozasiIdoNap: 2.5 }, MOST).ok).toBe(false);
    });
    it("várakozási idő nem gyógyszeres kezelésnél figyelmen kívül marad", () => {
        const r = ellenorizTokezeles({ ...alap, varakozasiIdoNap: 30 }, MOST);
        expect(r.ok && r.adat.varakozasiIdoNap).toBeNull();
    });
    it("költség és jövőbeli dátum", () => {
        expect(ellenorizTokezeles({ ...alap, koltsegFt: "45 000" }, MOST).ok && true).toBe(true);
        expect(ellenorizTokezeles({ ...alap, koltsegFt: -5 }, MOST).ok).toBe(false);
        expect(ellenorizTokezeles({ ...alap, datum: "2026-12-01" }, MOST).ok).toBe(false);
    });
});

describe("kgBan", () => {
    it("tömegegységek átváltása, térfogat/darab → null", () => {
        expect(kgBan(2, "t")).toBe(2000);
        expect(kgBan(500, "g")).toBe(0.5);
        expect(kgBan(3, "kg")).toBe(3);
        expect(kgBan(2, "l")).toBeNull();
        expect(kgBan(10, "db")).toBeNull();
    });
});

describe("várakozási idő", () => {
    it("varakozasVege: dátum + N nap; 0/null → nincs", () => {
        expect(varakozasVege("2026-11-01T12:00:00Z", 30)?.toISOString()).toBe("2026-12-01T12:00:00.000Z");
        expect(varakozasVege("2026-11-01", 0)).toBeNull();
        expect(varakozasVege("2026-11-01", null)).toBeNull();
    });
    it("aktivVarakozasok: csak a még tartók, tavanként a legkésőbb lejáró", () => {
        const sor = (r: Partial<TokezelesSor>): TokezelesSor => ({
            toId: 1, toNev: "Nagy-tó", datum: "2026-11-01T12:00:00Z", tipus: "ANTIBIOTIKUM", keszitmeny: "A",
            hatoanyag: null, mennyiseg: 1, egyseg: "g", koltsegFt: null, varakozasiIdoNap: 30, ...r,
        });
        const v = aktivVarakozasok([
            sor({}),
            sor({ keszitmeny: "B", varakozasiIdoNap: 40 }),
            sor({ toId: 2, toNev: "Kis telelő", varakozasiIdoNap: 5 }), // lejárt (11-06)
            sor({ toId: 3, toNev: "Demó", varakozasiIdoNap: 20, keszitmeny: null, hatoanyag: "H" }),
        ], MOST);
        expect(v.map((x) => [x.toNev, x.keszitmeny, x.hatraNap])).toEqual([
            ["Nagy-tó", "B", 28],
            ["Demó", "H", 8],
        ]);
    });
});

describe("osszesitTokezeles", () => {
    const sor = (r: Partial<TokezelesSor>): TokezelesSor => ({
        toId: 1, toNev: "Nagy-tó", datum: "2026-11-01", tipus: "SZERVESTRAGYA", keszitmeny: null, hatoanyag: null,
        mennyiseg: 1, egyseg: "t", koltsegFt: null, varakozasiIdoNap: null, ...r,
    });

    it("típusonként és tavanként, kg/ha-val", () => {
        const o = osszesitTokezeles([
            sor({ mennyiseg: 6, egyseg: "t", koltsegFt: 60000 }),
            sor({ mennyiseg: 500, egyseg: "kg" }),
            sor({ tipus: "MESZEZES", mennyiseg: 800, egyseg: "kg", koltsegFt: 40000 }),
            sor({ tipus: "KLORMESZ", mennyiseg: 50, egyseg: "kg" }),
            sor({ toId: 2, toNev: "Kis telelő", tipus: "VITAMIN", mennyiseg: 2, egyseg: "l" }),
            sor({ toId: 2, toNev: "Kis telelő", tipus: "VITAMIN", mennyiseg: 500, egyseg: "ml" }),
            sor({ toId: 2, toNev: "Kis telelő", tipus: "ANTIBIOTIKUM", mennyiseg: 250, egyseg: "g", koltsegFt: 12000 }),
        ], new Map([[1, 3], [2, 0.175]]));

        expect(o.osszesen).toEqual({ db: 7, koltsegFt: 112000, szervestragyaKg: 6500, meszKg: 850, gyogykezelesDb: 3 });
        expect(o.tavankent.map((t) => [t.toNev, t.db, t.szervestragyaKg, t.meszKg, t.gyogykezelesDb, t.szervestragyaKgPerHa])).toEqual([
            ["Kis telelő", 3, 0, 0, 3, null],
            ["Nagy-tó", 4, 6500, 850, 0, 2166.7],
        ]);
        const vitamin = o.tipusonkent.find((t) => t.tipus === "VITAMIN")!;
        expect(vitamin.tomegKg).toBe(0);
        expect(vitamin.egyebMennyisegek).toEqual({ l: 2, ml: 500 });
        // a típusok a definiált sorrendben
        expect(o.tipusonkent.map((t) => t.tipus)).toEqual(["SZERVESTRAGYA", "MESZEZES", "KLORMESZ", "ANTIBIOTIKUM", "VITAMIN"]);
    });
    it("üres", () => {
        expect(osszesitTokezeles([]).osszesen).toEqual({ db: 0, koltsegFt: 0, szervestragyaKg: 0, meszKg: 0, gyogykezelesDb: 0 });
    });
});

describe("napló és jogosultság", () => {
    it("naplócím és -leírás", () => {
        const r = ellenorizTokezeles({ toId: 1, tipus: "ANTIBIOTIKUM", datum: "2026-11-10", mennyiseg: "250", egyseg: "g", keszitmeny: "Oxi 20%", hatoanyag: "oxitetraciklin", varakozasiIdoNap: 30, koltsegFt: 12000, kezelesOka: "bakteriális fertőzés" }, MOST);
        if (!r.ok) throw new Error(r.hiba);
        expect(naploCim(r.adat)).toBe("Antibiotikum — Oxi 20%");
        expect(naploLeiras(r.adat).replace(/\s/g, " ")).toBe(
            "Antibiotikum: 250 g • készítmény: Oxi 20% • hatóanyag: oxitetraciklin • ok: bakteriális fertőzés • várakozási idő: 30 nap • költség: 12 000 Ft"
        );
    });
    it("minden típusnak van címkéje és legalább egy egysége", () => {
        for (const m of Object.values(TIPUS_META)) {
            expect(m.cimke.length).toBeGreaterThan(0);
            expect(m.egysegek.length).toBeGreaterThan(0);
        }
    });
    it("jogosultság", () => {
        expect(modosithatjaTokezeles("ADMIN", 5, 9)).toBe(true);
        expect(modosithatjaTokezeles("STAFF", 9, 9)).toBe(true);
        expect(modosithatjaTokezeles("STAFF", 5, 9)).toBe(false);
    });
});

import { datumIg } from "@/lib/tokezeles/tokezeles";

describe("datumIg", () => {
    it("a dátum végi pont nélkül, -ig raggal", () => {
        expect(datumIg("2026-12-13T12:00:00.000Z").replace(/\s/g, " ")).toBe("2026. dec. 13-ig");
    });
});
