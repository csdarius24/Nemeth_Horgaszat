import { describe, it, expect } from "vitest";
import { szam } from "@/lib/utils/szam";

describe("szam()", () => {
    it("egy számot változatlanul ad vissza", () => {
        expect(szam(42)).toBe(42);
        expect(szam(0)).toBe(0);
        expect(szam(-3.5)).toBe(-3.5);
    });

    it("numerikus stringet számmá alakít", () => {
        expect(szam("42")).toBe(42);
        expect(szam("12.5")).toBe(12.5);
    });

    it("vesszős tizedeselválasztót pontra cserél", () => {
        expect(szam("1,5")).toBe(1.5);
        expect(szam(",5")).toBe(0.5);
    });

    it("érvénytelen bemenetnél az alapértéket adja", () => {
        expect(szam("abc")).toBe(0);
        expect(szam("abc", 7)).toBe(7);
        expect(szam(undefined, 3)).toBe(3);
        expect(szam(null, -1)).toBe(-1);
    });

    it("üres string a Number szerint 0 (véges), így 0-t ad", () => {
        expect(szam("")).toBe(0);
    });

    it("NaN bemenet az alapértéket adja", () => {
        expect(szam(Number.NaN, 9)).toBe(9);
    });
});
