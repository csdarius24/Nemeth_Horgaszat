import type { CiklusOsszegzes } from "@/lib/halkeltes/szamitas";

// A Halkeltetés oldal közös típusai és segédei.

export type CiklusListaElem = {
    id: number;
    nev: string | null;
    datum: string;
    homersekletC: number | null;
    statusz: string;
    halfajNev: string | null;
    rogzitoNev: string | null;
    osszegzes: {
        ikrasDarab: number; tejesDarab: number;
        ikrasOsszKg: number; tejesOsszKg: number; ikraOsszKg: number;
    };
};

type ReszletSor = { sorszam: number | null; chipAzonosito: string | null; fajtaJeloles: string | null; tomegKg: number | null };

export type CiklusReszlet = {
    ciklus: {
        id: number; nev: string | null; datum: string; oltasIdopont: string | null;
        homersekletC: number | null; statusz: string; megjegyzes: string | null;
        halfajNev: string | null; rogzitoNev: string | null;
    };
    ikrasSorok: Array<ReszletSor & { ikraKg: number | null; szamitott: { eloadagMg: number | null; dontoMg: number | null; ml: number | null } }>;
    tejesSorok: Array<ReszletSor & { tejMl: number | null; szamitott: { mg: number | null; ml: number | null } }>;
    osszegzes: CiklusOsszegzes;
};

export const HALKELTES_STATUSZOK = ["TERVEZET", "FOLYAMATBAN", "LEZARVA"] as const;

export const STATUSZ_BADGE: Record<string, "secondary" | "primary" | "success"> = {
    TERVEZET: "secondary",
    FOLYAMATBAN: "primary",
    LEZARVA: "success",
};

export const STATUSZ_CSIK: Record<string, string> = {
    TERVEZET: "before:bg-border",
    FOLYAMATBAN: "before:bg-primary",
    LEZARVA: "before:bg-success",
};

/** Szöveges számmező → szám (vessző is elfogadott); üres → null. */
export const num = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

export function fmt(n: number | null | undefined, egyseg?: string): string {
    if (n == null) return "—";
    const s = n.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
    return egyseg ? `${s} ${egyseg}` : s;
}
