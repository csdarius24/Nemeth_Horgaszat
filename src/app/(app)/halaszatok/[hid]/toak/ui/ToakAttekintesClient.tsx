"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, SearchX, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    NINCS_ADAT,
    toTipusCimke,
    allapotCimke,
    ertekVagyNincsAdat,
    type Allapot,
} from "@/lib/toak/attekintes";
import { Tudnivalok } from "@/components/app/Tudnivalok";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { UjVizegysegModal, VIZEGYSEG_TIPUSOK } from "./UjVizegysegModal";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Egyseg = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
    teruletHa: number | null;
    atlagMelysegMeter: number | null;
    kapacitasKg: number | null;
    allomanyDarab: number;
    allomanyKg: number | null;
    allomanyBecsultReszleges: boolean;
    foFajok: string | null;
    utolsoEtetes: string | null;
    utolsoEtetesNapja: number | null;
    atlagNapiEtetesKg: number;
    fedezetNap: number | null;
    utolsoEsemeny: string | null;
    utolsoEsemenyNapja: number | null;
    telitettsegSzazalek: number | null;
    vizminosegPont: number | null;
    egeszsegPont: number | null;
    allapot: Allapot;
};

type Valasz = {
    egysegek: Egyseg[];
    osszesen: number;
    days: number;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
    takarmany: { keszletKg: number; halaszatAtlagNapiKg: number; halaszatFedezetNap: number | null };
};

const SZUROK = [{ ertek: "OSSZES", cimke: "Összes" }, ...VIZEGYSEG_TIPUSOK] as const;

/** Állapot → badge-változat és a kártya bal szélén futó színcsík. */
const ALLAPOT_STILUS: Record<Allapot, { badge: "success" | "primary" | "warning" | "secondary"; csik: string }> = {
    kivalo: { badge: "success", csik: "before:bg-success" },
    jo: { badge: "primary", csik: "before:bg-primary" },
    figyelendo: { badge: "warning", csik: "before:bg-warning" },
    nincs_adat: { badge: "secondary", csik: "before:bg-border" },
};

// ─── Segédek ─────────────────────────────────────────────────────────────────

function hanyNapja(nap: number | null, iso: string | null): string {
    if (nap == null || !iso) return NINCS_ADAT;
    if (nap <= 0) return "ma";
    if (nap === 1) return "tegnap";
    return `${nap} napja`;
}

function datumTeljes(iso: string | null): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── Építőelemek ─────────────────────────────────────────────────────────────

/** Címke + érték pár a kártyán. */
function Adat({ cimke, children, title, gyenge }: {
    cimke: string;
    children: React.ReactNode;
    title?: string;
    gyenge?: boolean;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{cimke}</dt>
            <dd className={cn("truncate text-sm font-semibold", gyenge && "font-normal text-muted-foreground")} title={title}>
                {children}
            </dd>
        </div>
    );
}

/** 0–100 közötti mutató sávval; ha nincs adat, halvány „nincs adat”. */
function Mutato({ cimke, ertek, egyseg = "" }: { cimke: string; ertek: number | null; egyseg?: string }) {
    const vanAdat = ertek != null && Number.isFinite(ertek);
    const ertekSzoveg = vanAdat ? `${ertek}${egyseg}` : NINCS_ADAT;
    return (
        <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{cimke}</span>
                <span className={cn("font-medium tabular-nums", !vanAdat && "text-muted-foreground")}>{ertekSzoveg}</span>
            </div>
            <Progress
                value={vanAdat ? Math.max(0, Math.min(100, ertek)) : 0}
                aria-label={`${cimke}: ${ertekSzoveg}`}
                className={cn("h-1.5", !vanAdat && "opacity-50")}
            />
        </div>
    );
}

// ─── Vízegység kártya ────────────────────────────────────────────────────────

function EgysegKartya({ e, hid }: { e: Egyseg; hid: string }) {
    const stilus = ALLAPOT_STILUS[e.allapot];
    const href = `/halaszatok/${hid}/toak/${e.azonosito}`;
    const muszaki = [
        e.teruletHa != null && `${e.teruletHa} ha`,
        e.atlagMelysegMeter != null && `${e.atlagMelysegMeter} m mély`,
        e.kapacitasKg != null && `${e.kapacitasKg.toLocaleString("hu-HU")} kg kapacitás`,
    ].filter(Boolean);

    return (
        <Card
            className={cn(
                // Bal oldali állapot-színcsík + az egész kártya kattintható (a címben lévő link „kifeszítve”).
                "relative gap-4 overflow-hidden transition-shadow before:absolute before:inset-y-0 before:left-0 before:w-1 hover:shadow-md has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50",
                stilus.csik,
                !e.aktiv && "opacity-75"
            )}
        >
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="min-w-0 text-lg">
                        <Link href={href} className="outline-none after:absolute after:inset-0 after:content-['']">
                            <span className="line-clamp-1">{e.nev}</span>
                        </Link>
                    </CardTitle>
                    <Badge variant={stilus.badge} className="shrink-0">{allapotCimke(e.allapot)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant="outline">{toTipusCimke(e.tipus)}</Badge>
                    {!e.aktiv && <Badge variant="secondary">Inaktív</Badge>}
                    {muszaki.length > 0 ? <span>{muszaki.join(" · ")}</span> : <span>Műszaki adat: {NINCS_ADAT}</span>}
                </div>
            </CardHeader>

            <CardContent className="grid gap-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Adat cimke="Halállomány">
                        {e.allomanyKg != null ? `~${e.allomanyKg.toLocaleString("hu-HU")} kg` : NINCS_ADAT}
                        <span className="font-normal text-muted-foreground"> · {e.allomanyDarab.toLocaleString("hu-HU")} db</span>
                    </Adat>
                    <Adat cimke="Fő faj" gyenge={!e.foFajok} title={e.foFajok ?? undefined}>
                        {e.foFajok ?? NINCS_ADAT}
                    </Adat>
                    <Adat cimke="Utolsó etetés" gyenge={!e.utolsoEtetes} title={datumTeljes(e.utolsoEtetes)}>
                        {hanyNapja(e.utolsoEtetesNapja, e.utolsoEtetes)}
                    </Adat>
                    <Adat cimke="Takarmány-fedezet" gyenge={e.fedezetNap == null}>
                        {ertekVagyNincsAdat(e.fedezetNap, (x) => `~${Math.round(x).toLocaleString("hu-HU")} nap`)}
                    </Adat>
                </dl>
                {e.allomanyBecsultReszleges && (
                    <p className="-mt-2 text-xs text-muted-foreground">A súly részleges tömegadatból becsült.</p>
                )}

                <Separator />

                <div className="grid gap-3">
                    <Mutato cimke="Telítettség" ertek={e.telitettsegSzazalek} egyseg="%" />
                    <div className="grid grid-cols-2 gap-4">
                        <Mutato cimke="Vízminőség" ertek={e.vizminosegPont} />
                        <Mutato cimke="Egészség" ertek={e.egeszsegPont} />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="justify-end">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Megnyitás
                    <ChevronRight className="size-4" aria-hidden="true" />
                </span>
            </CardFooter>
        </Card>
    );
}

function KartyaVaz() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Vízegységek betöltése">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[340px] rounded-2xl" />)}
        </div>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function ToakAttekintesClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [szuro, setSzuro] = useState<string>("OSSZES");
    const [modalNyitva, setModalNyitva] = useState(false);

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/attekintes`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid]);

    useEffect(() => { void betolt(); }, [betolt]);

    const egysegek = useMemo(() => data?.egysegek ?? [], [data]);
    const canCreate = data?.viewerRole === "OWNER" || data?.viewerRole === "ADMIN";

    const szurtek = useMemo(() => {
        const s = q.trim().toLowerCase();
        return egysegek.filter((e) => {
            if (szuro !== "OSSZES" && e.tipus !== szuro) return false;
            if (!s) return true;
            return (
                e.nev.toLowerCase().includes(s) ||
                toTipusCimke(e.tipus).toLowerCase().includes(s) ||
                (e.foFajok ?? "").toLowerCase().includes(s)
            );
        });
    }, [egysegek, q, szuro]);

    const leiras = data ? (
        <>
            {data.osszesen} kezelt vízegység
            {data.takarmany?.halaszatFedezetNap != null && (
                <> · takarmány-fedezet a halászatban: ~{Math.round(data.takarmany.halaszatFedezetNap).toLocaleString("hu-HU")} nap</>
            )}
        </>
    ) : "Vízegységek áttekintése";

    return (
        // minmax(0,1fr): a vízszintesen görgethető chip-sor ne feszítse szét az oldalt mobilon
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Tavak és telelők"
                description={leiras}
                actions={
                    canCreate && (
                        <Button onClick={() => setModalNyitva(true)}>
                            <Plus />
                            Új vízegység
                        </Button>
                    )
                }
            />

            {/* Eszköztár: keresés + típusszűrő */}
            {egysegek.length > 0 && (
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <InputGroup className="xl:w-80 xl:shrink-0">
                        <InputGroupInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Keresés név, típus vagy faj szerint…"
                            aria-label="Keresés a vízegységek között"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    {/* Mobilon vízszintesen görgethető chip-sor */}
                    <ScrollArea className="-mx-4 min-w-0 px-4 sm:mx-0 sm:px-0">
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={2}
                            value={szuro}
                            onValueChange={(v) => v && setSzuro(v)}
                            aria-label="Szűrés típus szerint"
                            className="pb-2 xl:pb-0"
                        >
                            {SZUROK.map((s) => {
                                const db = s.ertek === "OSSZES"
                                    ? egysegek.length
                                    : egysegek.filter((e) => e.tipus === s.ertek).length;
                                return (
                                    <ToggleGroupItem key={s.ertek} value={s.ertek} className="gap-1.5 px-3">
                                        {s.cimke}
                                        <span className="text-xs text-muted-foreground tabular-nums">{db}</span>
                                    </ToggleGroupItem>
                                );
                            })}
                        </ToggleGroup>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {loading && !data ? (
                <KartyaVaz />
            ) : hiba ? (
                <ErrorState title="Nem sikerült betölteni a vízegységeket" message={hiba} onRetry={() => betolt()} />
            ) : egysegek.length === 0 ? (
                <EmptyState
                    icon={<Waves />}
                    title="Még nincs vízegység"
                    description={
                        canCreate
                            ? "Hozd létre az első tavat, telelőt, ivadéknevelőt vagy keltető medencét."
                            : "Új vízegységet tulajdonos vagy adminisztrátor hozhat létre."
                    }
                    action={canCreate && (
                        <Button onClick={() => setModalNyitva(true)}>
                            <Plus />
                            Új vízegység
                        </Button>
                    )}
                />
            ) : szurtek.length === 0 ? (
                <EmptyState
                    icon={<SearchX />}
                    title="Nincs találat"
                    description="Módosítsd a keresést vagy a típusszűrőt."
                    action={
                        <Button variant="outline" onClick={() => { setQ(""); setSzuro("OSSZES"); }}>
                            Szűrők törlése
                        </Button>
                    }
                />
            ) : (
                <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", loading && "opacity-60")} aria-busy={loading}>
                    {szurtek.map((e) => <EgysegKartya key={e.azonosito} e={e} hid={hid} />)}
                </div>
            )}

            {egysegek.length > 0 && (
                <Tudnivalok cim="Az adatokról">
                    <p>
                        A <strong>vízminőség</strong> és az <strong>egészség</strong> mutatóhoz jelenleg nincs
                        adatforrás (külön modul), ezért „{NINCS_ADAT}”. A halállomány kg-ban <strong>becsült</strong>{" "}
                        érték (darabszám × a tömegtartomány középértéke). A <strong>telítettség</strong> csak
                        megadott kapacitás mellett számolható. A takarmánykészlet halászat-szintű; a kártyán a
                        fedezet azt mutatja, hány napra elég, ha csak az adott vízegység fogyasztana.
                    </p>
                </Tudnivalok>
            )}

            {canCreate && (
                <UjVizegysegModal
                    hid={hid}
                    open={modalNyitva}
                    onOpenChange={setModalNyitva}
                    onLetrehozva={() => void betolt()}
                />
            )}
        </div>
    );
}
