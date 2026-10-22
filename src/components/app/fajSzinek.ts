import { useEffect, useMemo, useState } from "react";

import type { ChartConfig } from "@/components/ui/chart";

const SOROZAT_SZINEK = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * Halfajonként állandó szín a grafikonokon: a fajok ábécérendje alapján kap
 * mindegyik egy `--chart-*` színt. Kulcsként `s<index>`-et használunk, mert a
 * fajnév (szóköz, ékezet) nem lehet CSS-változó neve.
 */
export function fajSzinTerkep(nevek: string[]) {
    const rendezett = [...new Set(nevek)].sort((a, b) => a.localeCompare(b, "hu"));
    return new Map(rendezett.map((nev, i) => [nev, { kulcs: `s${i}`, szin: SOROZAT_SZINEK[i % SOROZAT_SZINEK.length] }]));
}

export type FajSzinek = ReturnType<typeof fajSzinTerkep>;

export function fajChartConfig(nevek: string[], szinek: FajSzinek): ChartConfig {
    return Object.fromEntries(
        nevek.flatMap((nev) => {
            const sz = szinek.get(nev);
            return sz ? [[sz.kulcs, { label: nev, color: sz.szin }]] : [];
        })
    );
}

/**
 * A halászat ÖSSZES halfaja alapján képzett színtérkép — így egy faj minden
 * oldalon (Dashboard, tó részletező) ugyanazt a színt kapja, függetlenül attól,
 * hogy az adott nézetben mely fajok szerepelnek. Amíg a lista tölt (vagy ha a
 * lekérés hibázik), a nézetben látható fajokból számol.
 */
export function useFajSzinek(hid: string, lathatoNevek: string[]) {
    const [osszesNev, setOsszesNev] = useState<string[]>([]);

    useEffect(() => {
        let aktiv = true;
        fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                const items: Array<{ nev: string }> = Array.isArray(j?.items) ? j.items : [];
                if (aktiv) setOsszesNev(items.map((h) => h.nev));
            })
            .catch(() => {});
        return () => { aktiv = false; };
    }, [hid]);

    const kulcs = lathatoNevek.join("|");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => fajSzinTerkep([...osszesNev, ...lathatoNevek]), [osszesNev, kulcs]);
}
