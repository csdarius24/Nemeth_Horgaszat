import { describe, it, expect } from "vitest";
import { sha256, hashPassword, verifyPassword, createSessionToken } from "@/lib/password";

describe("sha256()", () => {
    it("ismert bemenetre determinisztikus 64 hex karaktert ad", () => {
        // Az "abc" SHA-256 lenyomata közismert tesztvektor.
        expect(sha256("abc")).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        expect(sha256("abc")).toMatch(/^[0-9a-f]{64}$/);
    });

    it("eltérő bemenetre eltérő lenyomatot ad", () => {
        expect(sha256("a")).not.toBe(sha256("b"));
    });
});

describe("hashPassword() / verifyPassword()", () => {
    it("a hash nem egyezik a nyílt jelszóval és bcrypt formátumú", async () => {
        const hash = await hashPassword("titok1234");
        expect(hash).not.toBe("titok1234");
        expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("a helyes jelszót elfogadja", async () => {
        const hash = await hashPassword("helyesJelszo!");
        await expect(verifyPassword("helyesJelszo!", hash)).resolves.toBe(true);
    });

    it("a rossz jelszót elutasítja", async () => {
        const hash = await hashPassword("helyesJelszo!");
        await expect(verifyPassword("rosszJelszo", hash)).resolves.toBe(false);
    });
});

describe("createSessionToken()", () => {
    it("64 karakteres hex tokent ad (256 bit)", () => {
        expect(createSessionToken()).toMatch(/^[0-9a-f]{64}$/);
    });

    it("két egymás utáni hívás eltérő tokent ad", () => {
        expect(createSessionToken()).not.toBe(createSessionToken());
    });
});
