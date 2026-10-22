"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Egg, FileSpreadsheet, Fish, Plus, Thermometer } from "lucide-react";

import { cn } from "@/lib/utils";
import { halkeltesStatuszCimke } from "@/lib/halkeltes/szamitas";
import { Tudnivalok } from "@/components/app/Tudnivalok";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { CiklusReszletModal } from "./CiklusReszletModal";
import { fmt, STATUSZ_BADGE, STATUSZ_CSIK, type CiklusListaElem } from "./halkeltes";
import { UjCiklusModal } from "./UjCiklusModal";

// ─── Ciklus kártya ───────────────────────────────────────────────────────────

function CiklusKartya({ c, onMegnyit }: { c: CiklusListaElem; onMegnyit: () => void }) {
    const o = c.osszegzes;
    return (
        <Card
            className={cn(
                "relative gap-4 overflow-hidden transition-shadow before:absolute before:inset-y-0 before:left-0 before:w-1 hover:shadow-md has-[button:focus-visible]:ring-[3px] has-[button:focus-visible]:ring-ring/50",
                STATUSZ_CSIK[c.statusz] ?? "before:bg-border"
            )}
        >
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                        {/* A gomb „kifeszítve” az egész kártyát kattinthatóvá teszi. */}
                        <button type="button" onClick={onMegnyit} className="text-left outline-none after:absolute after:inset-0 after:content-['']">
                            {c.nev || `Ciklus #${c.id}`}
                        </button>
                    </CardTitle>
                    <Badge variant={STATUSZ_BADGE[c.statusz] ?? "secondary"} className="shrink-0">{halkeltesStatuszCimke(c.statusz)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" />{new Date(c.datum).toLocaleDateString("hu-HU")}</span>
                    {c.homersekletC != null && <span className="inline-flex items-center gap-1"><Thermometer className="size-3.5" aria-hidden="true" />{fmt(c.homersekletC)} °C</span>}
                    {c.halfajNev && <span className="inline-flex items-center gap-1"><Fish className="size-3.5" aria-hidden="true" />{c.halfajNev}</span>}
                </div>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <dt className="text-xs text-muted-foreground">Ikrás</dt>
                        <dd className="font-semibold tabular-nums">{o.ikrasDarab} db <span className="font-normal text-muted-foreground">· {fmt(o.ikrasOsszKg, "kg")}</span></dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">Tejes</dt>
                        <dd className="font-semibold tabular-nums">{o.tejesDarab} db <span className="font-normal text-muted-foreground">· {fmt(o.tejesOsszKg, "kg")}</span></dd>
                    </div>
                    {o.ikraOsszKg > 0 && (
                        <div className="col-span-2">
                            <dt className="text-xs text-muted-foreground">Ikra összesen</dt>
                            <dd className="font-semibold tabular-nums">{fmt(o.ikraOsszKg, "kg")}</dd>
                        </div>
                    )}
                </dl>
            </CardContent>
            <CardFooter className="mt-auto justify-between text-xs text-muted-foreground">
                <span>{c.rogzitoNev ?? "Rögzítő: nincs adat"}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Részletek
                    <ChevronRight className="size-4" aria-hidden="true" />
                </span>
            </CardFooter>
        </Card>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function HalkeltesClient({ hid }: { hid: string }) {
    const [ciklusok, setCiklusok] = useState<CiklusListaElem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const [ujNyitva, setUjNyitva] = useState(false);
    const [reszletId, setReszletId] = useState<number | null>(null);

    const betolt = useCallback(async () => {
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setCiklusok(json.ciklusok ?? []);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid]);

    useEffect(() => { void betolt(); }, [betolt]);

    const ujGomb = (
        <Button onClick={() => setUjNyitva(true)}>
            <Plus />
            Új ciklus
        </Button>
    );

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Halkeltetés"
                description={`Keltetési ciklusok nyilvántartása: ikráztatás, oltási adagok, ikrás és tejes halak.${ciklusok.length ? ` · ${ciklusok.length} ciklus` : ""}`}
                actions={
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={0} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                                    <Button variant="outline" disabled>
                                        <FileSpreadsheet />
                                        Excel import
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Hamarosan — egy későbbi verzióban.</TooltipContent>
                        </Tooltip>
                        {ujGomb}
                    </>
                }
            />

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Ciklusok betöltése">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
                </div>
            ) : hiba ? (
                <ErrorState title="Nem sikerült betölteni a ciklusokat" message={hiba} onRetry={() => betolt()} />
            ) : ciklusok.length === 0 ? (
                <EmptyState
                    icon={<Egg />}
                    title="Még nincs keltetési ciklus"
                    description="Rögzítsd az első ciklust: a protokollból halanként kiszámoljuk az oltási adagokat."
                    action={ujGomb}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {ciklusok.map((c) => <CiklusKartya key={c.id} c={c} onMegnyit={() => setReszletId(c.id)} />)}
                </div>
            )}

            <Tudnivalok cim="Hogyan működik a halkeltetés modul?">
                <p>
                    Ez a <strong>kézi</strong> keltetési nyilvántartás. Az oltási adagok a ciklusnál megadott,
                    <strong> konfigurálható protokoll</strong> értékeiből számolódnak (mg/kg, ml/kg) — nincs beégetett
                    biológiai szabály. A ciklus létrehozása a Halászati naplóba is bekerül.
                </p>
                <p>
                    Még nincs: Excel-import, dokumentum-export, ivadék-kihelyezés és automatikus állománynövelés —
                    ezek egy későbbi verzióban jönnek.
                </p>
            </Tudnivalok>

            <UjCiklusModal hid={hid} open={ujNyitva} onOpenChange={setUjNyitva} onLetrehozva={() => void betolt()} />
            <CiklusReszletModal hid={hid} id={reszletId} onClose={() => setReszletId(null)} onValtozas={() => void betolt()} />
        </div>
    );
}
