// A Takarmányok oldal közös típusai és megjelenítési segédei.

export type Takarmany = {
    azonosito: number;
    nev: string;
    egyseg: string;
    keszlet: number;
    szin: string | null;
    aktiv: boolean;
};

export type Mozgas = {
    azonosito: number;
    tipus: "BEVETEL" | "FELHASZNALVA";
    mennyiseg: number;
    datum: string;
    megjegyzes: string | null;
    rogzitoNev?: string | null;
};

import { CIMKE_SZINEK, cimkeSzinHex } from "@/components/app/szinPaletta";

/** A takarmányhoz választható színek (közös címke-paletta). */
export const TAKARMANY_SZINEK = CIMKE_SZINEK;

export function szinHex(szin: string | null) {
    return cimkeSzinHex(szin);
}

export const EGYSEGEK = ["kg", "l", "db", "t", "zsák", "bála"];

/** Ez alatt „alacsony” a készlet (egységtől függetlenül). */
export const ALACSONY_KESZLET = 50;

export type KeszletAllapot = "ures" | "alacsony" | "rendben";

export function keszletAllapot(keszlet: number): KeszletAllapot {
    if (keszlet <= 0) return "ures";
    if (keszlet < ALACSONY_KESZLET) return "alacsony";
    return "rendben";
}

export function fmtMennyiseg(x: number, egyseg?: string) {
    const s = Number(x).toLocaleString("hu-HU", { maximumFractionDigits: 2 });
    return egyseg ? `${s} ${egyseg}` : s;
}
