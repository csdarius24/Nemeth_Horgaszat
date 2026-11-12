import { describe, expect, it } from "vitest";
import { bevitelHaBan, haToM2, m2ToHa, teruletSzoveg } from "@/lib/toak/terulet";

describe("ha ↔ m² átváltás", () => {
    it("ha → m²", () => {
        expect(haToM2(0.175)).toBe(1750);
        expect(haToM2(3)).toBe(30000);
    });
    it("m² → ha (4 tizedes)", () => {
        expect(m2ToHa(1750)).toBe(0.175);
        expect(m2ToHa(1)).toBe(0.0001);
        expect(m2ToHa(12345)).toBe(1.2345);
    });
});

describe("bevitelHaBan", () => {
    it("hibajegy: 0.175 ha elfogadott, nem kerekítődik 2 tizedesre", () => {
        expect(bevitelHaBan("0.175", "ha")).toBe(0.175);
    });
    it("tizedesvessző is jó", () => {
        expect(bevitelHaBan("0,175", "ha")).toBe(0.175);
    });
    it("m² bevitel ha-ra váltódik", () => {
        expect(bevitelHaBan("1750", "m2")).toBe(0.175);
        expect(bevitelHaBan(1750, "m2")).toBe(0.175);
    });
    it("4 tizedes fölött kerekít (1 m² felbontás)", () => {
        expect(bevitelHaBan("0.12346", "ha")).toBe(0.1235);
    });
    it("üres / nulla / negatív / szöveg / túl kicsi → null", () => {
        expect(bevitelHaBan("", "ha")).toBeNull();
        expect(bevitelHaBan("0", "ha")).toBeNull();
        expect(bevitelHaBan("-1", "m2")).toBeNull();
        expect(bevitelHaBan("abc", "ha")).toBeNull();
        expect(bevitelHaBan("0.2", "m2")).toBeNull(); // 0,2 m² → 0 ha
    });
});

describe("teruletSzoveg", () => {
    it("ha és m² együtt, magyar formátumban", () => {
        // A hu-HU formátum 4 jegyig nem tagol (1750), 5 jegytől igen (12 345).
        expect(teruletSzoveg(0.175).replace(/\s/g, " ")).toBe("0,175 ha (1750 m²)");
        expect(teruletSzoveg(1.2345).replace(/\s/g, " ")).toBe("1,2345 ha (12 345 m²)");
    });
});
