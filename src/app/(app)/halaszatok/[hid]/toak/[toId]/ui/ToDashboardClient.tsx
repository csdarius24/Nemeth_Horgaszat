"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowUpFromLine,
    Fish,
    History,
    RefreshCw,
    Utensils,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { toTipusCimke } from "@/lib/toak/attekintes";
import { EsemenyElem } from "@/components/app/EsemenyElem";
import { ESEMENY_CHART_CONFIG } from "@/components/app/esemenyek";
import { fajChartConfig, useFajSzinek } from "@/components/app/fajSzinek";
import { fmtSzam, GrafikonKartya, VizszintesOszlop } from "@/components/app/grafikonok";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Relatív importok: a modálok ugyanabban a mappafában élnek, így a route-group
// átrendezés (app/(app)/...) nem töri el őket.
import AttelepitesModal from "./actions/AttelepitesModal";
import EtetesModal from "./actions/EtetesModal";
import KivetelModal from "./actions/KivetelModal";
import TelepitesModal from "./actions/TelepitesModal";
import type { AllomanyTetel } from "./actions/kozos";

// ─── Típusok ────────────────────────────────────────────────────────────────

type SummaryResponse = {
    to: { azonosito: number; nev: string; tipus: string };
    summary: {
        osszDarab: number;
        etetes: { napok: number; osszegKg: unknown; darab: number };
    };
    allomany: Array<{
        darab: number;
        minTomegKg: unknown;
        maxTomegKg: unknown;
        halfaj: { azonosito: number; nev: string };
    }>;
    timeline: Array<{
        azonosito: number;
        tipus: string;
        datum: string;
        leiras: string | null;
        darab: number | null;
        mennyisegKg: unknown;
        halfaj: { azonosito: number; nev: string } | null;
    }>;
};

type Muvelet = "etetes" | "telepites" | "kivetel" | "attelepites";

const NAPOK = [7, 14, 30, 60];
const ESEMENY_LIMITEK = [10, 20, 30, 50];

// ─── Kis komponensek ────────────────────────────────────────────────────────

function OldalVaz() {
    return (
        <div className="grid gap-6" role="status" aria-label="Tó adatainak betöltése">
            <div className="space-y-2">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    );
}

/** Esemény-eloszlás fánkdiagram, középen az összes eseményszámmal. */
function EsemenyFank({ adat }: { adat: Array<{ tipus: string; db: number }> }) {
    const ossz = adat.reduce((s, a) => s + a.db, 0);
    return (
        <ChartContainer config={ESEMENY_CHART_CONFIG} className="mx-auto aspect-square max-h-64 w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="tipus" hideLabel />} />
                <Pie data={adat} dataKey="db" nameKey="tipus" innerRadius="58%" strokeWidth={3} paddingAngle={2}>
                    {adat.map((a) => <Cell key={a.tipus} fill={`var(--color-${a.tipus})`} />)}
                    <Label
                        content={({ viewBox }) => {
                            if (!viewBox || !("cx" in viewBox)) return null;
                            return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-heading text-2xl font-bold">
                                        {ossz}
                                    </tspan>
                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                                        esemény
                                    </tspan>
                                </text>
                            );
                        }}
                    />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="tipus" className="flex-wrap" />} />
            </PieChart>
        </ChartContainer>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function ToDashboardClient({
    hid,
    toId,
    viewerRole,
}: {
    hid: string;
    toId: string;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
}) {
    const [days, setDays] = useState(7);
    const [events, setEvents] = useState(20);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SummaryResponse | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);

    const [nyitott, setNyitott] = useState<Muvelet | null>(null);
    const modalProps = (m: Muvelet) => ({
        open: nyitott === m,
        onOpenChange: (open: boolean) => setNyitott(open ? m : null),
        hid,
        toId,
        onMentve: load,
    });

    // A telepítés/kivétel/áttelepítés végpontok ADMIN szerepkört kérnek; az etetést bárki rögzítheti.
    const kezelo = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const url = useMemo(
        () => `/api/halaszatok/${hid}/toak/${toId}/summary?days=${days}&events=${events}`,
        [hid, toId, days, events]
    );

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Hiba a tó adatainak betöltésekor.");
            setData(json);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    // ── Származtatott adatok ────────────────────────────────────────────────

    const fajSzinek = useFajSzinek(hid, (data?.allomany ?? []).map((a) => a.halfaj.nev));

    const allomanyAdat = useMemo(
        () => (data?.allomany ?? []).map((a) => {
            const kulcs = fajSzinek.get(a.halfaj.nev)?.kulcs ?? "s0";
            return { nev: a.halfaj.nev, ertek: a.darab, kulcs, fill: `var(--color-${kulcs})` };
        }),
        [data, fajSzinek]
    );
    const allomanyConfig = useMemo(() => fajChartConfig(allomanyAdat.map((a) => a.nev), fajSzinek), [allomanyAdat, fajSzinek]);

    const allomanyTetelek: AllomanyTetel[] = useMemo(
        () => (data?.allomany ?? []).map((a) => ({ halfajId: a.halfaj.azonosito, nev: a.halfaj.nev, darab: a.darab })),
        [data]
    );

    const esemenyEloszlas = useMemo(() => {
        const szamlalo: Record<string, number> = {};
        for (const e of data?.timeline ?? []) szamlalo[e.tipus] = (szamlalo[e.tipus] ?? 0) + 1;
        return Object.entries(szamlalo).map(([tipus, db]) => ({ tipus, db }));
    }, [data]);

    const aktivitas = useMemo(() => {
        const napok: Record<string, Record<string, number | string>> = {};
        for (const e of data?.timeline ?? []) {
            const nap = new Date(e.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
            napok[nap] ??= { nap };
            napok[nap][e.tipus] = ((napok[nap][e.tipus] as number) ?? 0) + 1;
        }
        return Object.values(napok).reverse();
    }, [data]);
    const aktivitasTipusok = useMemo(() => [...new Set((data?.timeline ?? []).map((e) => e.tipus))], [data]);

    // ── Render ──────────────────────────────────────────────────────────────

    if (loading && !data && !hiba) return <OldalVaz />;

    if (hiba || !data) {
        return (
            <div className="grid gap-6">
                <PageHeader className="mb-0" title="Vízegység" />
                <ErrorState title="Nem sikerült betölteni a tó adatait" message={hiba ?? "Nincs adat."} onRetry={() => load()} />
            </div>
        );
    }

    const muveletGombok = (
        // Mobilon 2×2 rács, hogy hüvelykujjal is kényelmesen elérhető legyen.
        <div className={cn("grid w-full gap-2 sm:flex sm:w-auto", kezelo ? "grid-cols-2" : "grid-cols-1")}>
            <Button onClick={() => setNyitott("etetes")}>
                <Utensils />
                Etetés
            </Button>
            {kezelo && (
                <>
                    <Button variant="outline" onClick={() => setNyitott("telepites")}>
                        <ArrowDownToLine />
                        Telepítés
                    </Button>
                    <Button variant="outline" onClick={() => setNyitott("kivetel")}>
                        <ArrowUpFromLine />
                        Kivétel
                    </Button>
                    <Button variant="outline" onClick={() => setNyitott("attelepites")}>
                        <ArrowLeftRight />
                        Áttelepítés
                    </Button>
                </>
            )}
        </div>
    );

    const nincsAllomany = data.allomany.length === 0;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title={data.to.nev}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{toTipusCimke(data.to.tipus)}</Badge>
                        <Link href={`/halaszatok/${hid}/toak`} className="text-sm hover:text-foreground hover:underline">
                            Összes vízegység
                        </Link>
                    </span>
                }
                actions={muveletGombok}
            />

            {/* ── Összefoglaló + szűrők ── */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">Összefoglaló</h2>
                    <p className="text-sm text-muted-foreground">Állomány, etetés és a legutóbbi napló-események.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                        <SelectTrigger size="sm" aria-label="Etetési időszak">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {NAPOK.map((n) => <SelectItem key={n} value={String(n)}>Etetés: {n} nap</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(events)} onValueChange={(v) => setEvents(Number(v))}>
                        <SelectTrigger size="sm" aria-label="Események száma">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {ESEMENY_LIMITEK.map((n) => <SelectItem key={n} value={String(n)}>Utolsó {n} esemény</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <IconButton
                        label="Frissítés"
                        icon={<RefreshCw className={cn(loading && "animate-spin")} />}
                        variant="outline"
                        size="icon-sm"
                        onClick={() => load()}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-6 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
                {/* ── KPI-k ── */}
                <StatGrid className="lg:grid-cols-3">
                    <StatCard
                        cim="Halállomány"
                        ertek={`${data.summary.osszDarab.toLocaleString("hu-HU")} db`}
                        alcim={`${data.allomany.length} halfaj`}
                        ikon={Fish}
                        tonus="info"
                    />
                    <StatCard
                        cim="Etetés"
                        ertek={`${fmtSzam(data.summary.etetes.osszegKg)} kg`}
                        alcim={`${data.summary.etetes.darab} bejegyzés · ${data.summary.etetes.napok} nap`}
                        ikon={Utensils}
                        tonus="success"
                    />
                    <StatCard
                        cim="Események"
                        ertek={data.timeline.length}
                        alcim={`az utolsó ${events} közül`}
                        ikon={Activity}
                    />
                </StatGrid>

                {/* ── Grafikonok ── */}
                {nincsAllomany && data.timeline.length === 0 ? (
                    <EmptyState
                        icon={<Fish />}
                        title="Még üres ez a vízegység"
                        description={kezelo ? "Telepíts halat, és itt megjelenik az állomány és a napló." : "Még nincs rögzített állomány vagy esemény."}
                        action={kezelo && (
                            <Button onClick={() => setNyitott("telepites")}>
                                <ArrowDownToLine />
                                Telepítés
                            </Button>
                        )}
                    />
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <GrafikonKartya cim="Halállomány fajonként" leiras="Aktuális darabszám">
                            {nincsAllomany ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">Nincs rögzített állomány.</p>
                            ) : (
                                <VizszintesOszlop adat={allomanyAdat} config={allomanyConfig} />
                            )}
                        </GrafikonKartya>

                        <GrafikonKartya cim="Események eloszlása" leiras={`Utolsó ${events} esemény`}>
                            {esemenyEloszlas.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">Nincs napló-esemény.</p>
                            ) : (
                                <EsemenyFank adat={esemenyEloszlas} />
                            )}
                        </GrafikonKartya>

                        {aktivitas.length > 1 && (
                            <GrafikonKartya cim="Aktivitás" leiras="Műveletek naponta" className="lg:col-span-2">
                                <ChartContainer config={ESEMENY_CHART_CONFIG} className="aspect-auto h-56 w-full">
                                    <BarChart data={aktivitas} margin={{ left: -12, right: 8 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="nap" tickLine={false} axisLine={false} minTickGap={16} />
                                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        {aktivitasTipusok.map((t, i) => (
                                            <Bar
                                                key={t}
                                                dataKey={t}
                                                stackId="a"
                                                fill={`var(--color-${t})`}
                                                radius={i === aktivitasTipusok.length - 1 ? [4, 4, 0, 0] : 0}
                                                maxBarSize={28}
                                            />
                                        ))}
                                    </BarChart>
                                </ChartContainer>
                            </GrafikonKartya>
                        )}
                    </div>
                )}

                {/* ── Állomány + idővonal ── */}
                <div className="grid gap-4 lg:grid-cols-5">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Állomány részletei</CardTitle>
                            <CardDescription>Darabszám és tömegtartomány halfajonként.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {nincsAllomany ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">Nincs rögzített állomány.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Halfaj</TableHead>
                                            <TableHead className="text-right">Darab</TableHead>
                                            <TableHead className="text-right">Tömeg (kg)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.allomany.map((a) => (
                                            <TableRow key={a.halfaj.azonosito}>
                                                <TableCell>
                                                    <span className="flex items-center gap-2 font-medium">
                                                        <span
                                                            className="size-2.5 shrink-0 rounded-sm"
                                                            style={{ background: fajSzinek.get(a.halfaj.nev)?.szin }}
                                                            aria-hidden="true"
                                                        />
                                                        {a.halfaj.nev}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{a.darab.toLocaleString("hu-HU")}</TableCell>
                                                <TableCell className="text-right text-muted-foreground tabular-nums">
                                                    {Number(a.minTomegKg) > 0 || Number(a.maxTomegKg) > 0
                                                        ? `${fmtSzam(a.minTomegKg)} – ${fmtSzam(a.maxTomegKg)}`
                                                        : "–"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Idővonal</CardTitle>
                            <CardDescription>A tó legutóbbi napló-eseményei.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.timeline.length === 0 ? (
                                <EmptyState
                                    className="p-6 md:p-8"
                                    icon={<History />}
                                    title="Nincs napló-esemény"
                                    description="Az etetések, telepítések és kivételek itt jelennek meg."
                                />
                            ) : (
                                <ol className="divide-y">
                                    {data.timeline.map((e) => (
                                        <EsemenyElem
                                            key={e.azonosito}
                                            tipus={e.tipus}
                                            cimKiegeszites={e.halfaj?.nev}
                                            reszletek={[
                                                e.darab != null && `${e.darab.toLocaleString("hu-HU")} db`,
                                                e.mennyisegKg != null && `${fmtSzam(e.mennyisegKg)} kg`,
                                            ]}
                                            leiras={e.leiras}
                                            datum={e.datum}
                                        />
                                    ))}
                                </ol>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Modálok ── */}
            <EtetesModal {...modalProps("etetes")} />
            {kezelo && (
                <>
                    <TelepitesModal {...modalProps("telepites")} />
                    <KivetelModal {...modalProps("kivetel")} allomany={allomanyTetelek} />
                    <AttelepitesModal {...modalProps("attelepites")} allomany={allomanyTetelek} forrasNev={data.to.nev} />
                </>
            )}
        </div>
    );
}

