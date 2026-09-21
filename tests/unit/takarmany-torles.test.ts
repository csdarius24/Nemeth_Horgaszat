// A takarmány-törlés audit-védelmének unit tesztjei.
//
// Kontextus: a DB-séma NEM véd meg az előzményvesztéstől
// (`takarmany_mozgasok` → ON DELETE CASCADE, `etetesek` → ON DELETE SET NULL),
// ezért a szabály alkalmazás-szinten él. Ezek a tesztek a tiszta döntéslogikát
// fedik le — adatbázis nélkül.

import { describe, it, expect } from "vitest";
import { torolhetoTakarmany } from "@/lib/takarmany/torles";

describe("torolhetoTakarmany()", () => {
    it("előzmény nélküli takarmány törölhető", () => {
        const e = torolhetoTakarmany({ mozgasokDb: 0, etetesekDb: 0 });
        expect(e.torolheto).toBe(true);
    });

    it("készletmozgás esetén NEM törölhető (a mozgástörténet cascade-del elveszne)", () => {
        const e = torolhetoTakarmany({ mozgasokDb: 3, etetesekDb: 0 });
        expect(e.torolheto).toBe(false);
        if (!e.torolheto) {
            expect(e.ok).toBe("mozgas");
            expect(e.uzenet).toContain("3 készletmozgás");
            expect(e.uzenet).toContain("inaktiváld");
        }
    });

    it("etetés-hivatkozás esetén NEM törölhető (az etetések elvesztenék a kötést)", () => {
        const e = torolhetoTakarmany({ mozgasokDb: 0, etetesekDb: 2 });
        expect(e.torolheto).toBe(false);
        if (!e.torolheto) {
            expect(e.ok).toBe("etetes");
            expect(e.uzenet).toContain("2 etetés");
            expect(e.uzenet).toContain("inaktiváld");
        }
    });

    it("mindkét előzmény esetén NEM törölhető, és mindkettőt megnevezi", () => {
        const e = torolhetoTakarmany({ mozgasokDb: 5, etetesekDb: 4 });
        expect(e.torolheto).toBe(false);
        if (!e.torolheto) {
            expect(e.ok).toBe("mindketto");
            expect(e.uzenet).toContain("5 készletmozgás");
            expect(e.uzenet).toContain("4 etetés");
        }
    });

    it("egyetlen mozgás is elég a tiltáshoz (határeset)", () => {
        expect(torolhetoTakarmany({ mozgasokDb: 1, etetesekDb: 0 }).torolheto).toBe(false);
        expect(torolhetoTakarmany({ mozgasokDb: 0, etetesekDb: 1 }).torolheto).toBe(false);
    });

    it("fail-safe: érvénytelen vagy negatív darabszám esetén NEM enged törölni", () => {
        expect(torolhetoTakarmany({ mozgasokDb: NaN, etetesekDb: 0 }).torolheto).toBe(false);
        expect(torolhetoTakarmany({ mozgasokDb: 0, etetesekDb: NaN }).torolheto).toBe(false);
        expect(torolhetoTakarmany({ mozgasokDb: -1, etetesekDb: 0 }).torolheto).toBe(false);
        expect(torolhetoTakarmany({ mozgasokDb: Infinity, etetesekDb: 0 }).torolheto).toBe(false);
    });

    it("az elutasítás mindig inaktiválást ajánl alternatívaként", () => {
        for (const be of [
            { mozgasokDb: 1, etetesekDb: 0 },
            { mozgasokDb: 0, etetesekDb: 1 },
            { mozgasokDb: 2, etetesekDb: 2 },
        ]) {
            const e = torolhetoTakarmany(be);
            expect(e.torolheto).toBe(false);
            if (!e.torolheto) expect(e.uzenet.toLowerCase()).toContain("inaktiváld");
        }
    });
});
