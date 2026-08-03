import { describe, it, expect } from "vitest";
import {
    esemenyTipusCimke,
    ervenyesEsemenyTipus,
    periodusHatarok,
    periodusCimke,
    esemenyCim,
    naploOsszegzes,
    htmlEscape,
    AKTIV_ESEMENY_TIPUSOK,
} from "@/lib/naplo/format";

describe("esemenyTipusCimke()", () => {
    it("ismert típusok magyar címkét kapnak", () => {
        expect(esemenyTipusCimke("TELEPITES")).toBe("Telepítés");
        expect(esemenyTipusCimke("KIVETEL")).toBe("Kivét");
        expect(esemenyTipusCimke("ETETES")).toBe("Etetés");
        expect(esemenyTipusCimke("TAKARMANY_BEVETEL")).toBe("Takarmány-bevétel");
        expect(esemenyTipusCimke("TAKARMANY_FELHASZNALAS")).toBe("Takarmány-felhasználás");
    });

    it("ismeretlen típust változatlanul ad vissza", () => {
        expect(esemenyTipusCimke("VALAMI_MAS")).toBe("VALAMI_MAS");
    });

    it("az aktív típusok mind érvényesek", () => {
        for (const t of AKTIV_ESEMENY_TIPUSOK) {
            expect(ervenyesEsemenyTipus(t)).toBe(true);
        }
        expect(ervenyesEsemenyTipus("NEM_LETEZIK")).toBe(false);
        expect(ervenyesEsemenyTipus(42)).toBe(false);
    });
});

describe("periodusHatarok()", () => {
    it("day: a nap [00:00, +1 nap) UTC-ben", () => {
        const h = periodusHatarok("day", "2026-06-27")!;
        expect(h.tol.toISOString()).toBe("2026-06-27T00:00:00.000Z");
        expect(h.ig.toISOString()).toBe("2026-06-28T00:00:00.000Z");
    });

    it("week: hétfőtől induló hét (2026-06-27 szombat → hétfő 06-22)", () => {
        const h = periodusHatarok("week", "2026-06-27")!;
        expect(h.tol.toISOString()).toBe("2026-06-22T00:00:00.000Z");
        expect(h.ig.toISOString()).toBe("2026-06-29T00:00:00.000Z");
    });

    it("week: vasárnap még az előző hétfőhöz tartozik", () => {
        const h = periodusHatarok("week", "2026-06-28")!; // vasárnap
        expect(h.tol.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    });

    it("week: hétfő önmaga hetének kezdete", () => {
        const h = periodusHatarok("week", "2026-06-22")!;
        expect(h.tol.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    });

    it("month: hónap elseje → következő hónap elseje", () => {
        const h = periodusHatarok("month", "2026-06-27")!;
        expect(h.tol.toISOString()).toBe("2026-06-01T00:00:00.000Z");
        expect(h.ig.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    });

    it("month: decemberben átfordul a következő évre", () => {
        const h = periodusHatarok("month", "2026-12-15")!;
        expect(h.ig.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    });

    it("érvénytelen dátum / formátum / periódus → null", () => {
        expect(periodusHatarok("day", "2026-02-31")).toBeNull(); // nem létező nap
        expect(periodusHatarok("day", "2026.06.27")).toBeNull();
        expect(periodusHatarok("day", "")).toBeNull();
        expect(periodusHatarok("year", "2026-06-27")).toBeNull();
    });
});

describe("periodusCimke()", () => {
    it("napi: egyetlen dátum", () => {
        const h = periodusHatarok("day", "2026-06-27")!;
        expect(periodusCimke("day", h)).toBe("Napi napló — 2026. 06. 27.");
    });

    it("heti: tól-ig tartomány (az utolsó nap inkluzív)", () => {
        const h = periodusHatarok("week", "2026-06-27")!;
        expect(periodusCimke("week", h)).toBe("Heti napló — 2026. 06. 22. – 2026. 06. 28.");
    });

    it("havi: elsejétől a hónap utolsó napjáig", () => {
        const h = periodusHatarok("month", "2026-06-27")!;
        expect(periodusCimke("month", h)).toBe("Havi napló — 2026. 06. 01. – 2026. 06. 30.");
    });
});

describe("esemenyCim()", () => {
    it("a tárolt cím az elsődleges", () => {
        expect(esemenyCim({ tipus: "ETETES", cim: "Etetés — Nagy-tó" })).toBe("Etetés — Nagy-tó");
    });

    it("fallback: típus + tó + faj", () => {
        expect(esemenyCim({ tipus: "TELEPITES", toNev: "Nagy-tó", halfajNev: "Ponty" }))
            .toBe("Telepítés — Nagy-tó — Ponty");
    });

    it("fallback: csak típus, ha nincs más adat", () => {
        expect(esemenyCim({ tipus: "KIVETEL" })).toBe("Kivét");
    });

    it("üres/whitespace tárolt cím esetén fallback", () => {
        expect(esemenyCim({ tipus: "ETETES", cim: "   ", toNev: "Kis-tó" })).toBe("Etetés — Kis-tó");
    });
});

describe("naploOsszegzes()", () => {
    it("típusonként számol és mennyiségeket összegez", () => {
        const o = naploOsszegzes([
            { tipus: "ETETES", mennyisegKg: 10.5 },
            { tipus: "ETETES", mennyisegKg: 4.5 },
            { tipus: "TELEPITES", darab: 100 },
            { tipus: "KIVETEL", darab: 30 },
            { tipus: "TAKARMANY_BEVETEL", mennyisegKg: 200 },
            { tipus: "TAKARMANY_FELHASZNALAS", mennyisegKg: 15 },
        ]);
        expect(o.osszesEsemeny).toBe(6);
        expect(o.etetesKg).toBe(15);
        expect(o.telepitesDarab).toBe(100);
        expect(o.kivetelDarab).toBe(30);
        expect(o.takarmanyBevetelKg).toBe(200);
        expect(o.takarmanyFelhasznalasKg).toBe(15);
    });

    it("a típus-lista előfordulás szerint csökkenő", () => {
        const o = naploOsszegzes([
            { tipus: "KIVETEL" },
            { tipus: "ETETES" },
            { tipus: "ETETES" },
        ]);
        expect(o.tipusonkent[0]).toEqual({ tipus: "ETETES", cimke: "Etetés", darab: 2 });
        expect(o.tipusonkent[1].tipus).toBe("KIVETEL");
    });

    it("hiányzó mennyiségeket 0-ként kezel, üres listára nullákat ad", () => {
        const o = naploOsszegzes([]);
        expect(o.osszesEsemeny).toBe(0);
        expect(o.ervenytelenDarab).toBe(0);
        expect(o.etetesKg).toBe(0);
        expect(o.tipusonkent).toEqual([]);
    });

    it("az érvénytelenített bejegyzés NEM számít bele az összegekbe", () => {
        const o = naploOsszegzes([
            { tipus: "ETETES", mennyisegKg: 10, ervenyes: true },
            { tipus: "ETETES", mennyisegKg: 999, ervenyes: false }, // elrontott, érvénytelenítve
        ]);
        expect(o.etetesKg).toBe(10);
        expect(o.osszesEsemeny).toBe(1);
        expect(o.ervenytelenDarab).toBe(1);
    });

    it("az érvénytelenített bejegyzés a típus-bontásban sem jelenik meg", () => {
        const o = naploOsszegzes([
            { tipus: "KIVETEL", darab: 5, ervenyes: false },
            { tipus: "ETETES", mennyisegKg: 3, ervenyes: true },
        ]);
        expect(o.tipusonkent).toEqual([{ tipus: "ETETES", cimke: "Etetés", darab: 1 }]);
        expect(o.kivetelDarab).toBe(0);
    });

    it("a hiányzó `ervenyes` mezőt érvényesnek tekinti (visszafelé kompatibilitás)", () => {
        const o = naploOsszegzes([{ tipus: "ETETES", mennyisegKg: 7 }]);
        expect(o.etetesKg).toBe(7);
        expect(o.osszesEsemeny).toBe(1);
        expect(o.ervenytelenDarab).toBe(0);
    });

    it("float-drift nélkül kerekít", () => {
        const o = naploOsszegzes([
            { tipus: "ETETES", mennyisegKg: 0.1 },
            { tipus: "ETETES", mennyisegKg: 0.2 },
        ]);
        expect(o.etetesKg).toBe(0.3);
    });
});

describe("htmlEscape()", () => {
    it("escape-eli a HTML-veszélyes karaktereket", () => {
        expect(htmlEscape(`<script>alert("x&y'z")</script>`))
            .toBe("&lt;script&gt;alert(&quot;x&amp;y&#39;z&quot;)&lt;/script&gt;");
    });

    it("null/undefined → üres string", () => {
        expect(htmlEscape(null)).toBe("");
        expect(htmlEscape(undefined)).toBe("");
    });

    it("sima szöveget változatlanul hagy", () => {
        expect(htmlEscape("Nagy-tó etetés 12 kg")).toBe("Nagy-tó etetés 12 kg");
    });
});
