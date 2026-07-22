import { describe, it, expect } from "vitest";
import {
    takarmanyRiasztasok,
    toRiasztasok,
    rendezRiasztasok,
    ALACSONY_KESZLET_KUSZOB,
    INAKTIV_TO_NAPOK,
    type TakarmanyAllapot,
    type ToAllapot,
} from "@/lib/dashboard/riasztasok";

const takarmany = (p: Partial<TakarmanyAllapot> = {}): TakarmanyAllapot => ({
    azonosito: 1, nev: "Pellet", egyseg: "kg", keszlet: 100, aktiv: true, ...p,
});

const to = (p: Partial<ToAllapot> = {}): ToAllapot => ({
    azonosito: 1, nev: "Nagy-tó", aktiv: true, osszDarab: 100,
    utolsoEsemeny: new Date("2026-06-26T10:00:00Z"), ...p,
});

describe("takarmanyRiasztasok()", () => {
    it("elfogyott készletre MAGAS riasztást ad", () => {
        const r = takarmanyRiasztasok([takarmany({ keszlet: 0 })]);
        expect(r).toHaveLength(1);
        expect(r[0].kod).toBe("TAKARMANY_ELFOGYOTT");
        expect(r[0].sulyossag).toBe("magas");
    });

    it("küszöb alatti készletre KOZEPES riasztást ad", () => {
        const r = takarmanyRiasztasok([takarmany({ keszlet: 10 })], 50);
        expect(r).toHaveLength(1);
        expect(r[0].kod).toBe("TAKARMANY_ALACSONY");
        expect(r[0].sulyossag).toBe("kozepes");
    });

    it("elegendő készletre nem ad riasztást", () => {
        expect(takarmanyRiasztasok([takarmany({ keszlet: 500 })], 50)).toHaveLength(0);
    });

    it("a küszöbbel pontosan egyenlő készlet még NEM alacsony", () => {
        expect(takarmanyRiasztasok([takarmany({ keszlet: 50 })], 50)).toHaveLength(0);
    });

    it("inaktív takarmányt figyelmen kívül hagy", () => {
        expect(takarmanyRiasztasok([takarmany({ keszlet: 0, aktiv: false })])).toHaveLength(0);
    });

    it("az alapértelmezett küszöb 50", () => {
        expect(ALACSONY_KESZLET_KUSZOB).toBe(50);
        expect(takarmanyRiasztasok([takarmany({ keszlet: 49 })])).toHaveLength(1);
    });
});

describe("toRiasztasok()", () => {
    const most = new Date("2026-06-26T12:00:00Z");

    it("üres állományú aktív tóra KOZEPES riasztást ad", () => {
        const r = toRiasztasok([to({ osszDarab: 0 })], most);
        expect(r.some((x) => x.kod === "TO_URES_ALLOMANY" && x.sulyossag === "kozepes")).toBe(true);
    });

    it("régóta művelet nélküli tóra ALACSONY riasztást ad", () => {
        const regi = new Date("2026-06-01T12:00:00Z"); // 25 napja
        const r = toRiasztasok([to({ utolsoEsemeny: regi })], most, 14);
        expect(r.some((x) => x.kod === "TO_INAKTIV")).toBe(true);
    });

    it("friss művelet esetén nem ad inaktív riasztást", () => {
        const r = toRiasztasok([to({ utolsoEsemeny: new Date("2026-06-25T12:00:00Z") })], most, 14);
        expect(r.some((x) => x.kod === "TO_INAKTIV")).toBe(false);
    });

    it("ha még soha nem volt művelet, ALACSONY riasztást ad", () => {
        const r = toRiasztasok([to({ utolsoEsemeny: null })], most);
        expect(r.some((x) => x.kod === "TO_INAKTIV")).toBe(true);
    });

    it("inaktív tavat teljesen figyelmen kívül hagy", () => {
        const r = toRiasztasok([to({ aktiv: false, osszDarab: 0, utolsoEsemeny: null })], most);
        expect(r).toHaveLength(0);
    });

    it("string dátumot is elfogad", () => {
        const r = toRiasztasok([to({ utolsoEsemeny: "2026-06-01T12:00:00Z" })], most, 14);
        expect(r.some((x) => x.kod === "TO_INAKTIV")).toBe(true);
    });

    it("az alapértelmezett inaktivitási küszöb 14 nap", () => {
        expect(INAKTIV_TO_NAPOK).toBe(14);
    });
});

describe("rendezRiasztasok()", () => {
    it("súlyosság szerint csökkenő sorrendbe rak", () => {
        const r = rendezRiasztasok([
            { kod: "TO_INAKTIV", sulyossag: "alacsony", cim: "a", reszlet: "" },
            { kod: "TAKARMANY_ELFOGYOTT", sulyossag: "magas", cim: "b", reszlet: "" },
            { kod: "TO_URES_ALLOMANY", sulyossag: "kozepes", cim: "c", reszlet: "" },
        ]);
        expect(r.map((x) => x.sulyossag)).toEqual(["magas", "kozepes", "alacsony"]);
    });

    it("nem módosítja az eredeti tömböt", () => {
        const eredeti: Parameters<typeof rendezRiasztasok>[0] = [
            { kod: "TO_INAKTIV", sulyossag: "alacsony", cim: "a", reszlet: "" },
            { kod: "TAKARMANY_ELFOGYOTT", sulyossag: "magas", cim: "b", reszlet: "" },
        ];
        rendezRiasztasok(eredeti);
        expect(eredeti[0].sulyossag).toBe("alacsony");
    });
});
