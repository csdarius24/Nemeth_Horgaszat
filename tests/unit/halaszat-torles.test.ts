import { describe, expect, it } from "vitest";
import { torlesNevEgyezik, torlesTetelek } from "@/lib/halaszat/torles";

describe("torlesNevEgyezik", () => {
    it("pontos egyezés kell", () => {
        expect(torlesNevEgyezik("Teszt Halgazdaság", "Teszt Halgazdaság")).toBe(true);
        expect(torlesNevEgyezik("teszt halgazdaság", "Teszt Halgazdaság")).toBe(false);
        expect(torlesNevEgyezik("Teszt Halgazdasá", "Teszt Halgazdaság")).toBe(false);
        expect(torlesNevEgyezik("Teszt", "Teszt Halgazdaság")).toBe(false);
    });
    it("a szóközöket egységesíti (elején, végén, dupla)", () => {
        expect(torlesNevEgyezik("  Teszt   Halgazdaság ", "Teszt Halgazdaság")).toBe(true);
    });
    it("üres / nem szöveg → nem egyezik", () => {
        expect(torlesNevEgyezik("", "")).toBe(false);
        expect(torlesNevEgyezik("   ", "Teszt")).toBe(false);
        expect(torlesNevEgyezik(undefined, "Teszt")).toBe(false);
        expect(torlesNevEgyezik(123, "123")).toBe(false);
    });
});

describe("torlesTetelek", () => {
    it("csak a nem nulla tételek, magyar számformátummal", () => {
        const t = torlesTetelek({
            tavak: 3, halfajok: 2, halDarab: 12500, naploBejegyzesek: 0, tagok: 1, takarmanyok: 0,
            feladatok: 0, madarkar: 1, tokezelesek: 0, halkeltetes: 0, naptar: 0,
        }).map((s) => s.replace(/\s/g, " "));
        expect(t).toEqual([
            "3 tóegység",
            "12 500 db hal nyilvántartott állománya",
            "2 halfaj",
            "1 madárkár-bejegyzés (fotókkal)",
            "1 csapattag hozzáférése",
        ]);
    });
});
