// A Naptár oldal közös típusai és dátum-segédei.

export interface Bejegyzes {
    azonosito: number;
    datum: string;
    cim: string;
    tartalom: string | null;
    szin: string | null;
}

export const NAPOK = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
export const HONAPOK = [
    "január", "február", "március", "április", "május", "június",
    "július", "augusztus", "szeptember", "október", "november", "december",
];

/** A hónap napjai + az előző/következő hónap feltöltő napjai, hétfői kezdéssel, 6 teljes sorban. */
export function honapRacsa(ev: number, honap: number): Array<{ datum: Date; aktualisHonap: boolean }> {
    const elsoNap = new Date(ev, honap - 1, 1);
    const utolsoNap = new Date(ev, honap, 0);
    const elsoHetNap = (elsoNap.getDay() + 6) % 7; // JS: 0 = vasárnap → hétfőre igazítva

    const napok: Array<{ datum: Date; aktualisHonap: boolean }> = [];
    for (let i = elsoHetNap - 1; i >= 0; i--) napok.push({ datum: new Date(ev, honap - 1, -i), aktualisHonap: false });
    for (let i = 1; i <= utolsoNap.getDate(); i++) napok.push({ datum: new Date(ev, honap - 1, i), aktualisHonap: true });
    const maradek = 42 - napok.length;
    for (let i = 1; i <= maradek; i++) napok.push({ datum: new Date(ev, honap, i), aktualisHonap: false });
    return napok;
}

export function datumKulcs(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function napNev(kulcs: string, opciok: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", weekday: "long" }) {
    return new Date(`${kulcs}T12:00:00`).toLocaleDateString("hu-HU", opciok);
}
