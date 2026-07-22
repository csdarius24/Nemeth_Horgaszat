// Tiszta (pure) szabály-alapú riasztás-logika a dashboardhoz.
// Adatbázis nélkül számol, ezért unit-tesztelhető.
//
// FONTOS (őszinteség): ezek a riasztások KIZÁRÓLAG a már meglévő adatokból
// származnak (takarmánykészlet, halállomány, naplóesemény-időbélyeg). Vízminőség-
// vagy halegészség-alapú riasztás NINCS — ahhoz külön modul kell (SZD2, P2).

export type RiasztasSulyossag = "magas" | "kozepes" | "alacsony";

export type RiasztasKod =
    | "TAKARMANY_ELFOGYOTT"
    | "TAKARMANY_ALACSONY"
    | "TO_URES_ALLOMANY"
    | "TO_INAKTIV";

export type Riasztas = {
    kod: RiasztasKod;
    sulyossag: RiasztasSulyossag;
    cim: string;
    reszlet: string;
    /** A kapcsolódó erőforrás azonosítója (takarmány vagy tó). */
    eroforrasId?: number;
};

/** Alapértelmezett küszöb: ez alatt "alacsony" a takarmánykészlet. */
export const ALACSONY_KESZLET_KUSZOB = 50;

/** Alapértelmezett: ennyi nap művelet nélkül számít inaktívnak egy tó. */
export const INAKTIV_TO_NAPOK = 14;

const SULYOSSAG_RANG: Record<RiasztasSulyossag, number> = {
    magas: 3,
    kozepes: 2,
    alacsony: 1,
};

export type TakarmanyAllapot = {
    azonosito: number;
    nev: string;
    egyseg: string;
    keszlet: number;
    aktiv: boolean;
};

/**
 * Takarmány-riasztások: elfogyott (0) → magas, küszöb alatti → közepes.
 * Csak az **aktív** takarmányokat vizsgálja.
 */
export function takarmanyRiasztasok(
    takarmanyok: TakarmanyAllapot[],
    kuszob: number = ALACSONY_KESZLET_KUSZOB
): Riasztas[] {
    const ki: Riasztas[] = [];
    for (const t of takarmanyok) {
        if (!t.aktiv) continue;
        if (!Number.isFinite(t.keszlet)) continue;

        if (t.keszlet <= 0) {
            ki.push({
                kod: "TAKARMANY_ELFOGYOTT",
                sulyossag: "magas",
                cim: `Elfogyott: ${t.nev}`,
                reszlet: `A(z) "${t.nev}" takarmány készlete 0 ${t.egyseg}. Etetés ebből nem rögzíthető.`,
                eroforrasId: t.azonosito,
            });
        } else if (t.keszlet < kuszob) {
            ki.push({
                kod: "TAKARMANY_ALACSONY",
                sulyossag: "kozepes",
                cim: `Alacsony készlet: ${t.nev}`,
                reszlet: `Már csak ${t.keszlet} ${t.egyseg} van készleten (küszöb: ${kuszob} ${t.egyseg}).`,
                eroforrasId: t.azonosito,
            });
        }
    }
    return ki;
}

export type ToAllapot = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
    /** A tóban lévő összes hal darabszáma. */
    osszDarab: number;
    /** A tó utolsó naplóeseményének időpontja, vagy null, ha még nem volt. */
    utolsoEsemeny: Date | string | null;
};

/**
 * Tó-riasztások: aktív tó üres állománnyal (közepes), illetve aktív tó, amelyben
 * régóta (vagy még soha) nem történt művelet (alacsony).
 * Inaktív (szándékosan kikapcsolt) tavakra nem ad riasztást.
 */
export function toRiasztasok(
    toak: ToAllapot[],
    most: Date = new Date(),
    inaktivNapok: number = INAKTIV_TO_NAPOK
): Riasztas[] {
    const ki: Riasztas[] = [];
    for (const t of toak) {
        if (!t.aktiv) continue;

        if (t.osszDarab <= 0) {
            ki.push({
                kod: "TO_URES_ALLOMANY",
                sulyossag: "kozepes",
                cim: `Üres állomány: ${t.nev}`,
                reszlet: `A(z) "${t.nev}" tó aktív, de nincs benne nyilvántartott halállomány.`,
                eroforrasId: t.azonosito,
            });
        }

        if (t.utolsoEsemeny == null) {
            ki.push({
                kod: "TO_INAKTIV",
                sulyossag: "alacsony",
                cim: `Nincs művelet: ${t.nev}`,
                reszlet: `A(z) "${t.nev}" tóhoz még nem rögzítettek műveletet.`,
                eroforrasId: t.azonosito,
            });
            continue;
        }

        const utolso = t.utolsoEsemeny instanceof Date ? t.utolsoEsemeny : new Date(t.utolsoEsemeny);
        if (Number.isNaN(utolso.getTime())) continue;

        const eltelt = Math.floor((most.getTime() - utolso.getTime()) / 86_400_000);
        if (eltelt >= inaktivNapok) {
            ki.push({
                kod: "TO_INAKTIV",
                sulyossag: "alacsony",
                cim: `Régóta nincs művelet: ${t.nev}`,
                reszlet: `${eltelt} napja nem történt rögzített művelet ebben a tóban (küszöb: ${inaktivNapok} nap).`,
                eroforrasId: t.azonosito,
            });
        }
    }
    return ki;
}

/** Súlyosság szerint csökkenő sorrend (magas → közepes → alacsony); stabil. */
export function rendezRiasztasok(riasztasok: Riasztas[]): Riasztas[] {
    return [...riasztasok].sort(
        (a, b) => SULYOSSAG_RANG[b.sulyossag] - SULYOSSAG_RANG[a.sulyossag]
    );
}
