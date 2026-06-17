import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slug";

describe("slugify()", () => {
    it("kisbetűsít és szóközt kötőjelre cserél", () => {
        expect(slugify("Tisza To")).toBe("tisza-to");
    });

    it("eltávolítja a magyar ékezeteket", () => {
        expect(slugify("Horgász Egyesület Ősz")).toBe("horgasz-egyesulet-osz");
        expect(slugify("ÁÉÍÓŐÚŰ")).toBe("aeioouu");
    });

    it("a nem alfanumerikus karaktersorokat egyetlen kötőjellé vonja össze", () => {
        expect(slugify("a@@@b")).toBe("a-b");
        expect(slugify("Hello!!!  World")).toBe("hello-world");
    });

    it("levágja a vezető és záró kötőjeleket", () => {
        expect(slugify("  Helló!  ")).toBe("hello");
        expect(slugify("---kezdes---")).toBe("kezdes");
    });

    it("megtartja a számokat", () => {
        expect(slugify("Tó 12")).toBe("to-12");
    });

    it("csupa szimbólum esetén üres stringet ad", () => {
        expect(slugify("***")).toBe("");
        expect(slugify("   ")).toBe("");
    });
});
