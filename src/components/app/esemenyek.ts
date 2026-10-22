import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, History, PackageMinus, PackagePlus, Utensils, type LucideIcon } from "lucide-react";

import type { ChartConfig } from "@/components/ui/chart";

/**
 * Napló-eseménytípusok megjelenítése EGY helyen: címke, ikon, szín.
 * A színek a design tokenekből jönnek (globals.css → --chart-*), így a
 * grafikonok, ikonok és badge-ek mindenhol egyformák.
 */
export const ESEMENY_TIPUSOK = {
    TELEPITES: { cimke: "Telepítés", ikon: ArrowDownToLine, szin: "var(--chart-1)", ikonOsztaly: "bg-chart-1/15 text-chart-1" },
    ETETES: { cimke: "Etetés", ikon: Utensils, szin: "var(--chart-2)", ikonOsztaly: "bg-chart-2/15 text-chart-2" },
    KIVETEL: { cimke: "Kivétel", ikon: ArrowUpFromLine, szin: "var(--chart-3)", ikonOsztaly: "bg-chart-3/15 text-chart-3" },
    ATTELEPITES: { cimke: "Áttelepítés", ikon: ArrowLeftRight, szin: "var(--chart-4)", ikonOsztaly: "bg-chart-4/15 text-chart-4" },
    TAKARMANY_BEVETEL: { cimke: "Takarmány-bevétel", ikon: PackagePlus, szin: "var(--success)", ikonOsztaly: "bg-success/15 text-success" },
    TAKARMANY_FELHASZNALAS: { cimke: "Takarmány-felhasználás", ikon: PackageMinus, szin: "var(--warning)", ikonOsztaly: "bg-warning/15 text-warning" },
} as const satisfies Record<string, { cimke: string; ikon: LucideIcon; szin: string; ikonOsztaly: string }>;

export type EsemenyTipus = keyof typeof ESEMENY_TIPUSOK;

const ISMERETLEN = { cimke: "", ikon: History, szin: "var(--muted-foreground)", ikonOsztaly: "bg-muted text-muted-foreground" };

export function esemenyMeta(tipus: string) {
    const meta = ESEMENY_TIPUSOK[tipus as EsemenyTipus];
    return meta ?? { ...ISMERETLEN, cimke: tipus };
}

/** shadcn ChartConfig az eseménytípusokhoz (kulcs = típuskód). */
export const ESEMENY_CHART_CONFIG = Object.fromEntries(
    Object.entries(ESEMENY_TIPUSOK).map(([kod, m]) => [kod, { label: m.cimke, color: m.szin }])
) satisfies ChartConfig;
