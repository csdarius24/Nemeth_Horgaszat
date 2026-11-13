import { describe, expect, it } from "vitest";
import { keresesHiba, koordinataSzovegbol, MAX_TALALAT, nominatimTalalatok } from "@/lib/terkep/geokod";

describe("koordinataSzovegbol", () => {
    it("tizedespont, vesszővel / szóközzel / pontosvesszővel", () => {
        expect(koordinataSzovegbol("47.146766, 20.203857")).toEqual({ lat: 47.146766, lng: 20.203857 });
        expect(koordinataSzovegbol("47.1467 20.2038")).toEqual({ lat: 47.1467, lng: 20.2038 });
        expect(koordinataSzovegbol(" 47.1;20.2 ")).toEqual({ lat: 47.1, lng: 20.2 });
    });
    it("tizedesvessző szóközzel / pontosvesszővel", () => {
        expect(koordinataSzovegbol("47,1467 20,2038")).toEqual({ lat: 47.1467, lng: 20.2038 });
        expect(koordinataSzovegbol("47,1467; 20,2038")).toEqual({ lat: 47.1467, lng: 20.2038 });
    });
    it("cím vagy tartományon kívüli → null", () => {
        expect(koordinataSzovegbol("Szolnok, Kossuth tér 1")).toBeNull();
        expect(koordinataSzovegbol("95, 20")).toBeNull();
        expect(koordinataSzovegbol("47")).toBeNull();
    });
});

describe("keresesHiba", () => {
    it("túl rövid / túl hosszú", () => {
        expect(keresesHiba("ab")).not.toBeNull();
        expect(keresesHiba("x".repeat(201))).not.toBeNull();
        expect(keresesHiba("Szolnok")).toBeNull();
    });
});

describe("nominatimTalalatok", () => {
    it("érvényes sorokat alakít át, a hibásakat kihagyja", () => {
        const t = nominatimTalalatok([
            { display_name: "Szolnok, Jász-Nagykun-Szolnok", lat: "47.1747", lon: "20.1967", class: "place", type: "city" },
            { display_name: "", lat: "47", lon: "20" },
            { display_name: "Rossz", lat: "abc", lon: "20" },
        ]);
        expect(t).toEqual([{ nev: "Szolnok, Jász-Nagykun-Szolnok", lat: 47.1747, lng: 20.1967, tipus: "place/city" }]);
    });
    it("max. találatszám, nem-tömb → üres", () => {
        const sok = Array.from({ length: 10 }, (_, i) => ({ display_name: `Hely ${i}`, lat: "47", lon: "20" }));
        expect(nominatimTalalatok(sok)).toHaveLength(MAX_TALALAT);
        expect(nominatimTalalatok({ error: "x" })).toEqual([]);
    });
});
