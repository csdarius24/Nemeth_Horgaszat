"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { cimkeSzinHex } from "@/components/app/szinPaletta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, ErrorState } from "@/components/ui/states";

import { datumKulcs, HONAPOK, honapRacsa, NAPOK, napNev, type Bejegyzes } from "./naptar";
import { NapModal } from "./NapModal";

// ─── Fő komponens ─────────────────────────────────────────────────────────────

export default function NaptarClient({ hid }: { hid: string }) {
    const ma = new Date();
    const maKulcs = datumKulcs(ma);
    const [ev, setEv] = useState(ma.getFullYear());
    const [honap, setHonap] = useState(ma.getMonth() + 1);

    const [bejegyzesek, setBejegyzesek] = useState<Bejegyzes[]>([]);
    const [betoltes, setBetoltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    // Modál: melyik nap, és (opcionálisan) melyik bejegyzés
    const [nyitottNap, setNyitottNap] = useState<string | null>(null);
    const [kezdoBejegyzes, setKezdoBejegyzes] = useState<Bejegyzes | null>(null);

    const racsRef = useRef<HTMLDivElement>(null);

    // ── Betöltés ──────────────────────────────────────────────────────────────

    const betolt = useCallback(async () => {
        setBetoltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/naptar?ev=${ev}&honap=${honap}`, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült betölteni a naptárat.");
            setBejegyzesek(json.bejegyzesek ?? []);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
        } finally {
            setBetoltes(false);
        }
    }, [hid, ev, honap]);

    useEffect(() => { void betolt(); }, [betolt]);

    // ── Navigáció ─────────────────────────────────────────────────────────────

    function lapoz(irany: -1 | 1) {
        const d = new Date(ev, honap - 1 + irany, 1);
        setEv(d.getFullYear());
        setHonap(d.getMonth() + 1);
    }

    function maraUgras() {
        setEv(ma.getFullYear());
        setHonap(ma.getMonth() + 1);
    }

    function napMegnyitas(kulcs: string, b: Bejegyzes | null = null) {
        setKezdoBejegyzes(b);
        setNyitottNap(kulcs);
    }

    // ── Rács ──────────────────────────────────────────────────────────────────

    const racs = useMemo(() => honapRacsa(ev, honap), [ev, honap]);

    const naponkent = useMemo(
        () => bejegyzesek.reduce<Record<string, Bejegyzes[]>>((acc, b) => {
            (acc[b.datum.slice(0, 10)] ??= []).push(b);
            return acc;
        }, {}),
        [bejegyzesek]
    );

    const honapNapjai = useMemo(
        () => Object.keys(naponkent).sort().map((k) => ({ kulcs: k, tetelek: naponkent[k] })),
        [naponkent]
    );

    /** Nyilakkal lépkedés a napok között (rácsos billentyűzet-navigáció). */
    function racsBillentyu(e: React.KeyboardEvent) {
        const lepes = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (!lepes) return;
        const gombok = [...(racsRef.current?.querySelectorAll<HTMLButtonElement>("button[data-nap]") ?? [])];
        const i = gombok.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        const cel = gombok[i + lepes];
        if (cel) {
            e.preventDefault();
            cel.focus();
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Naptár"
                description="Halászati események, határidők és napi jegyzetek."
                actions={
                    <Button onClick={() => napMegnyitas(maKulcs)}>
                        <CalendarPlus />
                        Új bejegyzés
                    </Button>
                }
            />

            {hiba && <ErrorState title="Nem sikerült betölteni a naptárat" message={hiba} onRetry={() => betolt()} />}

            <Card className="gap-0 py-0 sm:py-0">
                {/* Hónap-navigáció */}
                <div className="flex items-center gap-2 border-b px-3 py-3 sm:px-5">
                    <IconButton label="Előző hónap" icon={<ChevronLeft />} variant="outline" size="icon-sm" onClick={() => lapoz(-1)} />
                    <IconButton label="Következő hónap" icon={<ChevronRight />} variant="outline" size="icon-sm" onClick={() => lapoz(1)} />
                    <h2 className="ml-1 flex-1 font-heading text-lg font-bold first-letter:uppercase sm:text-xl" aria-live="polite">
                        {ev}. {HONAPOK[honap - 1]}
                    </h2>
                    {betoltes && <Spinner className="text-muted-foreground" />}
                    <Button variant="outline" size="sm" onClick={maraUgras}>Ma</Button>
                </div>

                {/* Hét napjai */}
                <div className="grid grid-cols-7 border-b bg-muted/40" aria-hidden="true">
                    {NAPOK.map((nap, i) => (
                        <div key={nap} className={cn("py-2 text-center text-xs font-semibold text-muted-foreground uppercase", i >= 5 && "text-muted-foreground/70")}>
                            {nap}
                        </div>
                    ))}
                </div>

                {/* Nap cellák — mindegyik valódi gomb, nyilakkal is bejárható */}
                <div ref={racsRef} className="grid grid-cols-7" onKeyDown={racsBillentyu}>
                    {racs.map(({ datum, aktualisHonap }, idx) => {
                        const kulcs = datumKulcs(datum);
                        const napi = naponkent[kulcs] ?? [];
                        const maE = kulcs === maKulcs;
                        const hetvege = idx % 7 >= 5;
                        return (
                            <button
                                key={kulcs}
                                type="button"
                                data-nap={kulcs}
                                onClick={() => napMegnyitas(kulcs)}
                                aria-label={`${napNev(kulcs)}${napi.length ? `, ${napi.length} bejegyzés` : ""}${maE ? " (ma)" : ""}`}
                                aria-current={maE ? "date" : undefined}
                                className={cn(
                                    "group relative flex min-h-14 flex-col items-stretch gap-1 border-b p-1 text-left outline-none transition-colors sm:min-h-24 sm:p-1.5",
                                    idx % 7 < 6 && "border-r",
                                    idx >= 35 && "border-b-0",
                                    hetvege && "bg-muted/30",
                                    !aktualisHonap && "bg-muted/50 text-muted-foreground/60",
                                    "hover:bg-accent/60 focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex size-7 items-center justify-center self-center rounded-full text-sm sm:self-start",
                                        maE ? "bg-primary font-bold text-primary-foreground" : "font-medium"
                                    )}
                                >
                                    {datum.getDate()}
                                </span>

                                {/* Mobilon csak színes pöttyök, sm-től a bejegyzések címe */}
                                {napi.length > 0 && (
                                    <>
                                        <span className="flex justify-center gap-0.5 sm:hidden" aria-hidden="true">
                                            {napi.slice(0, 3).map((b) => (
                                                <span key={b.azonosito} className="size-1.5 rounded-full" style={{ background: cimkeSzinHex(b.szin) }} />
                                            ))}
                                        </span>
                                        <span className="hidden gap-0.5 sm:grid" aria-hidden="true">
                                            {napi.slice(0, 3).map((b) => (
                                                <span
                                                    key={b.azonosito}
                                                    className="truncate rounded-sm border-l-[3px] bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                                                    style={{ borderLeftColor: cimkeSzinHex(b.szin) }}
                                                >
                                                    {b.cim}
                                                </span>
                                            ))}
                                            {napi.length > 3 && <span className="px-1 text-[10px] text-muted-foreground">+{napi.length - 3} további</span>}
                                        </span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* A hónap bejegyzései listában — mobilon ez az elsődleges nézet */}
            <Card>
                <CardHeader>
                    <CardTitle className="first-letter:uppercase">{HONAPOK[honap - 1]} bejegyzései</CardTitle>
                </CardHeader>
                <CardContent>
                    {!betoltes && honapNapjai.length === 0 ? (
                        <EmptyState
                            className="p-6"
                            icon={<CalendarDays />}
                            title="Nincs bejegyzés ebben a hónapban"
                            description="Kattints egy napra a naptárban, vagy használd az „Új bejegyzés” gombot."
                        />
                    ) : (
                        <ol className="grid gap-4">
                            {honapNapjai.map(({ kulcs, tetelek }) => (
                                <li key={kulcs} className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                                    <p className={cn("text-sm font-semibold first-letter:uppercase", kulcs === maKulcs && "text-primary")}>
                                        {napNev(kulcs)}
                                    </p>
                                    <ul className="grid gap-2">
                                        {tetelek.map((b) => (
                                            <li key={b.azonosito}>
                                                <button
                                                    type="button"
                                                    onClick={() => napMegnyitas(kulcs, b)}
                                                    className="w-full rounded-lg border border-l-4 p-3 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    style={{ borderLeftColor: cimkeSzinHex(b.szin) }}
                                                >
                                                    <span className="block font-medium">{b.cim}</span>
                                                    {b.tartalom && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{b.tartalom}</span>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>

            <NapModal
                hid={hid}
                datum={nyitottNap}
                kezdoBejegyzes={kezdoBejegyzes}
                napiBejegyzesek={nyitottNap ? naponkent[nyitottNap] ?? [] : []}
                onClose={() => { setNyitottNap(null); setKezdoBejegyzes(null); }}
                onValtozas={() => void betolt()}
            />
        </div>
    );
}
