"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    BarChart3,
    CheckCircle2,
    Fish,
    RefreshCw,
    TriangleAlert,
    Waves,
    Wheat,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { fmtSzam, GrafikonKartya, VizszintesOszlop } from "@/components/app/grafikonok";
import { ESEMENY_CHART_CONFIG, esemenyMeta } from "@/components/app/esemenyek";
import { fajChartConfig, useFajSzinek, type FajSzinek } from "@/components/app/fajSzinek";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { IconButton } from "@/components/ui/icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";

// ─── Típusok ─────────────────────────────────────────────────────────────────

interface ToAllomany {
    azonosito: number;
    nev: string;
    tipus: "TO" | "TELELO";
    aktiv: boolean;
    allomany: Array<{ halfajNev: string; darab: number }>;
}

type Riasztas = {
    kod: string;
    sulyossag: "magas" | "kozepes" | "alacsony";
    cim: string;
    reszlet: string;
    eroforrasId?: number;
};

export type LegutobbiEsemeny = {
    azonosito: number;
    tipus: string;
    datum: string;
    leiras: string | null;
    darab: number | null;
    mennyisegKg: unknown;
    to: { azonosito: number; nev: string } | null;
    rogzitoNev: string | null;
};

interface OsszesitoValasz {
    toak: { ossz: number; aktiv: number };
    halallomany: {
        osszDarab: number;
        fajokSzama: number;
        fajonkent: Array<{ nev: string; darab: number }>;
    };
    etetes: { napok: number; osszegKg: unknown; darab: number };
    esemenyEloszlas: Array<{ tipus: string; darab: number }>;
    aktivitasEsemenyek: Array<{ tipus: string; datum: string }>;
    tavakAllomany: ToAllomany[];
    days: number;
    // Dashboard 2.0 — opcionálisak, hogy régi válasszal is működjön
    takarmany?: {
        ossz: number;
        aktiv: number;
        osszKeszlet: number;
        tetelek: Array<{ azonosito: number; nev: string; egyseg: string; keszlet: number; aktiv: boolean }>;
    };
    etetesTrend?: Array<{ nap: string; kg: number }>;
    riasztasok?: Riasztas[];
    riasztasKuszobok?: { alacsonyKeszlet: number; inaktivToNapok: number };
    legutobbiEsemenyek?: LegutobbiEsemeny[];
}

const IDOSZAKOK = [7, 14, 30, 60, 90];

// ─── Segédek ─────────────────────────────────────────────────────────────────


// ─── Figyelmeztetések ────────────────────────────────────────────────────────

const SULYOSSAG = {
    magas: { cimke: "Sürgős", badge: "danger" },
    kozepes: { cimke: "Közepes", badge: "warning" },
    alacsony: { cimke: "Alacsony", badge: "secondary" },
} as const;

function RiasztasPanel({ riasztasok, kuszobok }: {
    riasztasok: Riasztas[];
    kuszobok?: { alacsonyKeszlet: number; inaktivToNapok: number };
}) {
    const [mindMutat, setMindMutat] = useState(false);
    const LATHATO = 4;

    if (riasztasok.length === 0) {
        return (
            <Alert variant="success">
                <CheckCircle2 />
                <AlertTitle>Nincs aktív figyelmeztetés</AlertTitle>
                <AlertDescription>
                    Nincs elfogyott vagy alacsony takarmány, üres állományú vagy régóta inaktív tó.
                </AlertDescription>
            </Alert>
        );
    }

    const lathatok = mindMutat ? riasztasok : riasztasok.slice(0, LATHATO);
    const magasSzam = riasztasok.filter((r) => r.sulyossag === "magas").length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className={cn("size-5", magasSzam > 0 ? "text-destructive" : "text-warning")} aria-hidden="true" />
                    Figyelmeztetések
                </CardTitle>
                <CardAction className="flex gap-2">
                    {magasSzam > 0 && <Badge variant="danger">{magasSzam} sürgős</Badge>}
                    <Badge variant="secondary">{riasztasok.length} tétel</Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
                <ul className="grid gap-2 md:grid-cols-2">
                    {lathatok.map((r, i) => {
                        const s = SULYOSSAG[r.sulyossag] ?? SULYOSSAG.alacsony;
                        return (
                            <li
                                key={`${r.kod}-${r.eroforrasId ?? i}`}
                                className={cn(
                                    "flex items-start gap-3 rounded-lg border p-3",
                                    r.sulyossag === "magas" && "border-destructive/25 bg-destructive/5",
                                    r.sulyossag === "kozepes" && "border-warning/30 bg-warning/5"
                                )}
                            >
                                <Badge variant={s.badge} className="mt-0.5">{s.cimke}</Badge>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">{r.cim}</p>
                                    <p className="text-xs text-muted-foreground">{r.reszlet}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {riasztasok.length > LATHATO && (
                    <Button variant="outline" size="sm" onClick={() => setMindMutat((v) => !v)} aria-expanded={mindMutat}>
                        {mindMutat ? "Kevesebb" : `További ${riasztasok.length - LATHATO} megjelenítése`}
                    </Button>
                )}

                {kuszobok && (
                    <p className="text-xs text-muted-foreground">
                        Szabályok: takarmány &lt; {kuszobok.alacsonyKeszlet} egység = alacsony •{" "}
                        {kuszobok.inaktivToNapok} napja nincs művelet = inaktív tó. Vízminőség-alapú riasztás még nincs.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/** Halállomány tavanként — halfajonként halmozott oszlopok. */
function TavakAllomanyChart({ tavak, cim, szinek }: { tavak: ToAllomany[]; cim: string; szinek: FajSzinek }) {
    const fajok = useMemo(() => {
        const set = new Set<string>();
        for (const t of tavak) for (const a of t.allomany) set.add(a.halfajNev);
        return [...set].sort((a, b) => a.localeCompare(b, "hu"));
    }, [tavak]);

    const config = useMemo(() => fajChartConfig(fajok, szinek), [fajok, szinek]);

    const adat = useMemo(
        () => tavak.map((t) => {
            const sor: Record<string, string | number> = { nev: t.nev };
            for (const faj of fajok) {
                const kulcs = szinek.get(faj)?.kulcs;
                if (kulcs) sor[kulcs] = t.allomany.find((a) => a.halfajNev === faj)?.darab ?? 0;
            }
            return sor;
        }),
        [tavak, fajok, szinek]
    );

    const osszDarab = tavak.reduce((s, t) => s + t.allomany.reduce((ss, a) => ss + a.darab, 0), 0);

    if (tavak.length === 0) return null;

    return (
        <GrafikonKartya
            cim={cim}
            leiras={
                osszDarab === 0
                    ? `${tavak.length} egység, még nincs rögzített halállomány.`
                    : `${tavak.length} egység · ${osszDarab.toLocaleString("hu-HU")} db hal`
            }
        >
            {osszDarab > 0 && (
                <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(180, tavak.length * 48) }}>
                    <BarChart data={adat} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                        <YAxis dataKey="nev" type="category" width={96} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {fajok.map((faj, i) => {
                            const kulcs = szinek.get(faj)?.kulcs ?? faj;
                            return (
                                <Bar
                                    key={kulcs}
                                    dataKey={kulcs}
                                    stackId="allomany"
                                    fill={`var(--color-${kulcs})`}
                                    radius={i === fajok.length - 1 ? [0, 6, 6, 0] : 0}
                                    maxBarSize={32}
                                />
                            );
                        })}
                    </BarChart>
                </ChartContainer>
            )}
        </GrafikonKartya>
    );
}

// ─── Betöltés váz ────────────────────────────────────────────────────────────

function StatVaz() {
    return (
        <div className="grid gap-4" role="status" aria-label="Statisztikák betöltése">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-[104px] rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-28 rounded-2xl" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function HalaszatStatClient({
    hid,
    frissites = 0,
    onLegutobbiEsemenyek,
}: {
    hid: string;
    /** Ha változik, újratölt (pl. új tó létrehozása után). */
    frissites?: number;
    /** A „Legutóbbi tevékenységek” kártya a szülőben van — ide adjuk át az adatot. */
    onLegutobbiEsemenyek?: (esemenyek: LegutobbiEsemeny[] | null) => void;
}) {
    const [days, setDays] = useState(30);
    const [data, setData] = useState<OsszesitoValasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    async function betolt(d = days) {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/osszesito?days=${d}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
            onLegutobbiEsemenyek?.(json?.legutobbiEsemenyek ?? null);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
            onLegutobbiEsemenyek?.(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void betolt(); }, [hid, frissites]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Grafikon adatok ───────────────────────────────────────────────────────

    const fajSzinek = useFajSzinek(hid, [
        ...(data?.halallomany.fajonkent ?? []).map((f) => f.nev),
        ...(data?.tavakAllomany ?? []).flatMap((t) => t.allomany.map((a) => a.halfajNev)),
    ]);

    const fajAdat = useMemo(
        () => (data?.halallomany.fajonkent ?? []).map((f) => {
            const kulcs = fajSzinek.get(f.nev)?.kulcs ?? f.nev;
            return { nev: f.nev, ertek: f.darab, kulcs, fill: `var(--color-${kulcs})` };
        }),
        [data, fajSzinek]
    );
    const fajokConfig = useMemo(() => fajChartConfig(fajAdat.map((f) => f.nev), fajSzinek), [fajAdat, fajSzinek]);

    const esemenyAdat = useMemo(
        () => (data?.esemenyEloszlas ?? [])
            .map((e) => ({ nev: esemenyMeta(e.tipus).cimke, ertek: e.darab, kulcs: e.tipus, fill: `var(--color-${e.tipus})` }))
            .sort((a, b) => b.ertek - a.ertek),
        [data]
    );

    const aktivitasAdat = useMemo(() => {
        const napok: Record<string, { nap: string; TELEPITES: number; KIVETEL: number; ETETES: number }> = {};
        for (const e of data?.aktivitasEsemenyek ?? []) {
            const nap = new Date(e.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
            if (!napok[nap]) napok[nap] = { nap, TELEPITES: 0, KIVETEL: 0, ETETES: 0 };
            if (e.tipus === "TELEPITES" || e.tipus === "KIVETEL" || e.tipus === "ETETES") napok[nap][e.tipus]++;
        }
        return Object.values(napok);
    }, [data]);

    const etetesTrendAdat = useMemo(
        () => (data?.etetesTrend ?? []).map((e) => ({
            cimke: new Date(e.nap + "T00:00:00").toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
            kg: e.kg,
        })),
        [data]
    );

    const toTavak = useMemo(() => (data?.tavakAllomany ?? []).filter((t) => t.tipus === "TO"), [data]);
    const teleloTavak = useMemo(() => (data?.tavakAllomany ?? []).filter((t) => t.tipus === "TELELO"), [data]);

    // ── Render ────────────────────────────────────────────────────────────────

    const fejlec = (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="text-lg font-bold">Összesítő</h2>
                <p className="text-sm text-muted-foreground">Az összes tó aggregált adatai a választott időszakra.</p>
            </div>
            <div className="flex items-center gap-2">
                <Select
                    value={String(days)}
                    onValueChange={(v) => { const d = Number(v); setDays(d); void betolt(d); }}
                >
                    <SelectTrigger size="sm" className="w-36" aria-label="Időszak">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                        {IDOSZAKOK.map((n) => (
                            <SelectItem key={n} value={String(n)}>Elmúlt {n} nap</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <IconButton
                    label="Frissítés"
                    icon={<RefreshCw className={cn(loading && "animate-spin")} />}
                    variant="outline"
                    size="icon-sm"
                    onClick={() => betolt()}
                    disabled={loading}
                />
            </div>
        </div>
    );

    if (loading && !data) {
        return <div className="grid gap-4">{fejlec}<StatVaz /></div>;
    }

    if (hiba) {
        return (
            <div className="grid gap-4">
                {fejlec}
                <ErrorState title="Nem sikerült betölteni a statisztikákat" message={hiba} onRetry={() => betolt()} />
            </div>
        );
    }

    if (!data) return null;

    const vanAdat = data.halallomany.osszDarab > 0 || data.esemenyEloszlas.length > 0;
    const osszEsemeny = data.esemenyEloszlas.reduce((s, e) => s + e.darab, 0);

    return (
        <div className={cn("grid gap-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            {fejlec}

            {/* KPI kártyák */}
            <StatGrid className="lg:grid-cols-3 xl:grid-cols-5">
                <StatCard cim="Tavak" ertek={data.toak.ossz} alcim={`${data.toak.aktiv} aktív`} ikon={Waves} />
                <StatCard
                    cim="Halállomány"
                    ertek={`${data.halallomany.osszDarab.toLocaleString("hu-HU")} db`}
                    alcim={`${data.halallomany.fajokSzama} halfaj`}
                    ikon={Fish}
                    tonus="info"
                />
                <StatCard
                    cim="Etetés"
                    ertek={`${fmtSzam(data.etetes.osszegKg)} kg`}
                    alcim={`${data.etetes.darab} bejegyzés · ${data.days} nap`}
                    ikon={BarChart3}
                    tonus="success"
                />
                {data.takarmany && (
                    <StatCard
                        cim="Takarmánykészlet"
                        ertek={fmtSzam(data.takarmany.osszKeszlet)}
                        alcim={`${data.takarmany.aktiv} aktív takarmány`}
                        ikon={Wheat}
                        tonus="warning"
                    />
                )}
                <StatCard cim="Események" ertek={osszEsemeny} alcim="naplózott műveletek" ikon={Activity} />
            </StatGrid>

            {/* Figyelmeztetések */}
            {data.riasztasok && <RiasztasPanel riasztasok={data.riasztasok} kuszobok={data.riasztasKuszobok} />}

            {!vanAdat && (
                <EmptyState
                    icon={<BarChart3 />}
                    title="Még nincs adat a grafikonokhoz"
                    description="Hozz létre tavakat és rögzíts telepítést – itt jelennek meg az összesítők."
                />
            )}

            {vanAdat && (
                <div className="grid gap-4 lg:grid-cols-2">
                    {fajAdat.length > 0 && (
                        <GrafikonKartya cim="Halállomány fajonként" leiras="Összes tó, darabszám">
                            <VizszintesOszlop adat={fajAdat} config={fajokConfig} />
                        </GrafikonKartya>
                    )}

                    {esemenyAdat.length > 0 && (
                        <GrafikonKartya cim="Események eloszlása" leiras={`Elmúlt ${data.days} nap`}>
                            <VizszintesOszlop adat={esemenyAdat} config={ESEMENY_CHART_CONFIG} />
                        </GrafikonKartya>
                    )}

                    {etetesTrendAdat.length > 1 && (
                        <GrafikonKartya cim="Etetési trend" leiras={`kg / nap · elmúlt ${data.days} nap`}>
                            <ChartContainer config={{ kg: { label: "Etetés (kg)", color: "var(--chart-2)" } }} className="aspect-auto h-56 w-full">
                                <BarChart data={etetesTrendAdat} margin={{ left: -12, right: 8 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="cimke" tickLine={false} axisLine={false} minTickGap={16} />
                                    <YAxis tickLine={false} axisLine={false} width={44} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="kg" fill="var(--color-kg)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ChartContainer>
                        </GrafikonKartya>
                    )}

                    {aktivitasAdat.length > 1 && (
                        <GrafikonKartya cim="Aktivitás" leiras={`Műveletek naponta · elmúlt ${data.days} nap`}>
                            <ChartContainer config={ESEMENY_CHART_CONFIG} className="aspect-auto h-56 w-full">
                                <BarChart data={aktivitasAdat} margin={{ left: -12, right: 8 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="nap" tickLine={false} axisLine={false} minTickGap={16} />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="TELEPITES" stackId="a" fill="var(--color-TELEPITES)" maxBarSize={28} />
                                    <Bar dataKey="ETETES" stackId="a" fill="var(--color-ETETES)" maxBarSize={28} />
                                    <Bar dataKey="KIVETEL" stackId="a" fill="var(--color-KIVETEL)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ChartContainer>
                        </GrafikonKartya>
                    )}

                    <TavakAllomanyChart tavak={toTavak} cim="Halállomány tavanként" szinek={fajSzinek} />
                    <TavakAllomanyChart tavak={teleloTavak} cim="Halállomány telelőnként" szinek={fajSzinek} />
                </div>
            )}
        </div>
    );
}
