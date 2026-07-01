import { describe, it, expect } from "vitest";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";

describe("rogzitoMegjelenites()", () => {
    it("a nevet adja vissza, ha van", () => {
        expect(rogzitoMegjelenites({ nev: "Kovács Béla", email: "b@x.hu" })).toBe("Kovács Béla");
    });

    it("az emailt adja vissza, ha nincs név", () => {
        expect(rogzitoMegjelenites({ nev: null, email: "b@x.hu" })).toBe("b@x.hu");
    });

    it("az emailt adja vissza üres/whitespace név esetén", () => {
        expect(rogzitoMegjelenites({ nev: "   ", email: "b@x.hu" })).toBe("b@x.hu");
    });

    it("null-t ad vissza, ha nincs actor (rendszer-esemény)", () => {
        expect(rogzitoMegjelenites(null)).toBeNull();
        expect(rogzitoMegjelenites(undefined)).toBeNull();
    });

    it("null-t ad vissza, ha se név, se email nincs", () => {
        expect(rogzitoMegjelenites({ nev: null, email: "" })).toBeNull();
        expect(rogzitoMegjelenites({ nev: "  ", email: "   " })).toBeNull();
    });

    it("trimmeli a nevet", () => {
        expect(rogzitoMegjelenites({ nev: "  Anna  ", email: "a@x.hu" })).toBe("Anna");
    });
});
