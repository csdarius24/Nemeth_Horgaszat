"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Printer, Search, SearchX, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    AKTIV_ESEMENY_TIPUSOK,
    ESEMENY_TIPUS_CIMKE,
    periodusCimke,
    periodusHatarok,
    type NaploPeriodus,
} from "@/lib/naplo/format";
import { esemenyMeta } from "@/components/app/esemenyek";
import { Tudnivalok } from "@/components/app/Tudnivalok";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { ErvenytelenitesModal, SzovegJavitasModal } from "./NaploModalok";
import { NaploSor } from "./NaploSor";
import { naploModositas, type NaploBejegyzes } from "./tipusok";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Valasz = {
    esemenyek: NaploBejegyzes[];
    talalatOsszesen: number;
    tenantOsszesen: number;
    limit: number;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

type ToOpcio = { azonosito: number; nev: string };

/** A Radix Select nem enged üres értéket, ezért ez jelöli a „mind” opciót. */
const MIND = "mind";

const PERIODUSOK = [
    { ertek: MIND, cimke: "Összes" },
    { ertek: "day", cimke: "Napi" },
    { ertek: "week", cimke: "Heti" },
    { ertek: "month", cimke: "Havi" },
] as const;

function maUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Napfejléc a csoportosított listához, pl. „Ma”, „Tegnap”, „okt. 18., szombat”. */
function napCimke(kulcs: string): string {
    const d = new Date(`${kulcs}T00:00:00`);
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const kulonbseg = Math.round((ma.getTime() - d.getTime()) / 86_400_000);
    if (kulonbseg === 0) return "Ma";
    if (kulonbseg === 1) return "Tegnap";
    return d.toLocaleDateString("hu-HU", {
        year: d.getFullYear() === ma.getFullYear() ? undefined : "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
    });
}

function helyiNapKulcs(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function HalaszatiNaploClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [tipus, setTipus] = useState(MIND);
    const [toId, setToId] = useState(MIND);
    const [periodus, setPeriodus] = useState<string>(MIND);
    const [datum, setDatum] = useState(maUtc());
    const [toak, setToak] = useState<ToOpcio[]>([]);
    const [csakErvenyes, setCsakErvenyes] = useState(false);

    // Sor-műveletek (egy-egy modál az egész oldalon)
    const [javitando, setJavitando] = useState<NaploBejegyzes | null>(null);
    const [ervenytelenitendo, setErvenytelenitendo] = useState<NaploBejegyzes | null>(null);
    const [visszaallitando, setVisszaallitando] = useState<NaploBejegyzes | null>(null);
    const [visszaallitasFut, setVisszaallitasFut] = useState(false);

    // Kereső debounce
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // Tavak a szűrőhöz (best-effort)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(json?.toak)) {
                    setToak((json.toak as ToOpcio[]).map((t) => ({ azonosito: t.azonosito, nev: t.nev })));
                }
            } catch { /* a szűrő opcionális */ }
        })();
    }, [hid]);

    const vanPeriodus = periodus !== MIND;

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const p = new URLSearchParams();
            if (debouncedQ) p.set("q", debouncedQ);
            if (tipus !== MIND) p.set("tipus", tipus);
            if (toId !== MIND) p.set("toId", toId);
            if (vanPeriodus) { p.set("period", periodus); p.set("date", datum); }
            if (csakErvenyes) p.set("csakErvenyes", "1");
            const res = await fetch(`/api/halaszatok/${hid}/naplo?${p}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid, debouncedQ, tipus, toId, vanPeriodus, periodus, datum, csakErvenyes]);

    useEffect(() => { void betolt(); }, [betolt]);

    const exportUrl = useMemo(() => {
        if (!vanPeriodus) return null;
        const p = new URLSearchParams({ period: periodus, date: datum });
        if (toId !== MIND) p.set("toId", toId);
        if (tipus !== MIND) p.set("tipus", tipus);
        return `/api/halaszatok/${hid}/naplo/export?${p}`;
    }, [hid, vanPeriodus, periodus, datum, toId, tipus]);

    const idoszakSzoveg = useMemo(() => {
        if (!vanPeriodus) return null;
        const h = periodusHatarok(periodus, datum);
        return h ? periodusCimke(periodus as NaploPeriodus, h) : null;
    }, [vanPeriodus, periodus, datum]);

    const esemenyek = useMemo(() => data?.esemenyek ?? [], [data]);
    const canModosit = data?.viewerRole === "OWNER" || data?.viewerRole === "ADMIN";
    const vanSzuro = !!q || tipus !== MIND || toId !== MIND || vanPeriodus || csakErvenyes;

    // Napok szerinti csoportosítás (a lista már időrendben érkezik)
    const napok = useMemo(() => {
        const csoportok: Array<{ kulcs: string; tetelek: NaploBejegyzes[] }> = [];
        for (const e of esemenyek) {
            const kulcs = helyiNapKulcs(e.datum);
            const utolso = csoportok[csoportok.length - 1];
            if (utolso?.kulcs === kulcs) utolso.tetelek.push(e);
            else csoportok.push({ kulcs, tetelek: [e] });
        }
        return csoportok;
    }, [esemenyek]);

    function szurokTorlese() {
        setQ("");
        setTipus(MIND);
        setToId(MIND);
        setPeriodus(MIND);
        setDatum(maUtc());
        setCsakErvenyes(false);
    }

    async function visszaallitas() {
        if (!visszaallitando) return;
        setVisszaallitasFut(true);
        try {
            await naploModositas(hid, visszaallitando.id, { ervenyes: true });
            toast.success("Bejegyzés visszaállítva", { description: visszaallitando.cim });
            setVisszaallitando(null);
            void betolt();
        } catch (e) {
            toast.error("Nem sikerült visszaállítani", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setVisszaallitasFut(false);
        }
    }

    // ─── Render ────────────────────────────────────────────────────────────

    const exportGomb = exportUrl ? (
        <Button variant="outline" asChild>
            <a href={exportUrl} target="_blank" rel="noopener noreferrer">
                <Printer />
                Nyomtatható export
            </a>
        </Button>
    ) : (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* A letiltott gomb nem kap egéreseményt, ezért a span hordozza a tooltipet. */}
                <span tabIndex={0} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    <Button variant="outline" disabled aria-describedby="export-sugo">
                        <Printer />
                        Nyomtatható export
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent id="export-sugo">Az exporthoz válassz időszakot (napi / heti / havi).</TooltipContent>
        </Tooltip>
    );

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Halászati napló"
                description={
                    data
                        ? `${data.tenantOsszesen} naplózott esemény · a szűrőkre ${data.talalatOsszesen} találat${data.talalatOsszesen > data.limit ? ` (az első ${data.limit} látható)` : ""}`
                        : "A műveletek automatikusan ide naplózódnak."
                }
                actions={exportGomb}
            />

            {/* ── Szűrők ── */}
            <Card className="gap-4 py-4 sm:py-5">
                <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
                        <InputGroup>
                            <InputGroupInput
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Keresés a naplóban…"
                                aria-label="Keresés a naplóban"
                            />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                        </InputGroup>
                        <Select value={tipus} onValueChange={setTipus}>
                            <SelectTrigger className="w-full" aria-label="Eseménytípus">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={MIND}>Minden típus</SelectItem>
                                {AKTIV_ESEMENY_TIPUSOK.map((t) => (
                                    <SelectItem key={t} value={t}>{esemenyMeta(t).cimke || ESEMENY_TIPUS_CIMKE[t]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={toId} onValueChange={setToId}>
                            <SelectTrigger className="w-full" aria-label="Vízegység">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={MIND}>Minden vízegység</SelectItem>
                                {toak.map((t) => (
                                    <SelectItem key={t.azonosito} value={String(t.azonosito)}>{t.nev}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={2}
                            value={periodus}
                            onValueChange={(v) => v && setPeriodus(v)}
                            aria-label="Időszak"
                        >
                            {PERIODUSOK.map((p) => (
                                <ToggleGroupItem key={p.ertek} value={p.ertek} className="px-3">{p.cimke}</ToggleGroupItem>
                            ))}
                        </ToggleGroup>

                        {vanPeriodus && (
                            <DatePicker
                                value={datum}
                                onChange={(d) => setDatum(d || maUtc())}
                                aria-label="Az időszak dátuma"
                                size="sm"
                                className="w-auto"
                            />
                        )}

                        <div className="flex items-center gap-2">
                            <Switch id="csak-ervenyes" checked={csakErvenyes} onCheckedChange={setCsakErvenyes} />
                            <Label htmlFor="csak-ervenyes" className="font-normal">Csak érvényes</Label>
                        </div>

                        {vanSzuro && (
                            <Button variant="ghost" size="sm" onClick={szurokTorlese} className="ml-auto">
                                <X />
                                Szűrők törlése
                            </Button>
                        )}
                    </div>

                    {idoszakSzoveg && <p className="text-sm font-medium text-primary">{idoszakSzoveg}</p>}
                </CardContent>
            </Card>

            {/* ── Lista ── */}
            {loading && !data ? (
                <Card>
                    <CardContent className="grid gap-4" role="status" aria-label="Napló betöltése">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="size-9 rounded-lg" />
                                <div className="grid flex-1 gap-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : hiba ? (
                <ErrorState title="Nem sikerült betölteni a naplót" message={hiba} onRetry={() => betolt()} />
            ) : esemenyek.length === 0 ? (
                data && data.tenantOsszesen === 0 ? (
                    <EmptyState
                        icon={<BookOpen />}
                        title="Még nincs naplózott esemény"
                        description="A telepítés, kivétel, etetés és a takarmánymozgások automatikusan ide naplózódnak."
                    />
                ) : (
                    <EmptyState
                        icon={<SearchX />}
                        title="Nincs találat"
                        description="Módosítsd a keresést, a szűrőt vagy az időszakot."
                        action={<Button variant="outline" onClick={szurokTorlese}>Szűrők törlése</Button>}
                    />
                )
            ) : (
                <div className={cn("grid gap-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
                    {napok.map((nap) => (
                        <section key={nap.kulcs} aria-labelledby={`nap-${nap.kulcs}`}>
                            <h2
                                id={`nap-${nap.kulcs}`}
                                className="sticky top-14 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1 text-sm font-semibold text-muted-foreground backdrop-blur-sm first-letter:uppercase md:top-16"
                            >
                                {napCimke(nap.kulcs)}
                                <span className="ml-2 font-normal">· {nap.tetelek.length} esemény</span>
                            </h2>
                            <Card className="py-0 sm:py-0">
                                <CardContent>
                                    <ol className="divide-y">
                                        {nap.tetelek.map((e) => (
                                            <NaploSor
                                                key={e.id}
                                                e={e}
                                                canModosit={canModosit}
                                                onSzerkeszt={() => setJavitando(e)}
                                                onErvenytelenit={() => setErvenytelenitendo(e)}
                                                onVisszaallit={() => setVisszaallitando(e)}
                                            />
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        </section>
                    ))}
                </div>
            )}

            {/* ── Tudnivalók ── */}
            <Tudnivalok cim="Hogyan működik a napló?">
                <p>
                    A napló a ténylegesen rögzített műveletekből épül (telepítés, kivétel, áttelepítés, etetés,
                    takarmány-bevétel és -felhasználás). Az export <strong>nyomtatóbarát HTML</strong> — a böngésző
                    „Nyomtatás → Mentés PDF-ként” funkciójával menthető.
                </p>
                <p>
                    A naplósorok <strong>nem törölhetők</strong>. Hibás rögzítésnél tulajdonos vagy adminisztrátor
                    kötelező indokkal <em>érvénytelenítheti</em> a bejegyzést: a sor áthúzva megmarad, és kimarad az
                    összegzésekből. A szöveg (cím, leírás) javítható, a mennyiségek nem. Az érvénytelenítés a
                    készletet <strong>nem</strong> állítja vissza — ahhoz kompenzáló műveletet kell rögzíteni.
                </p>
            </Tudnivalok>

            {/* ── Modálok ── */}
            <SzovegJavitasModal hid={hid} bejegyzes={javitando} onClose={() => setJavitando(null)} onMentve={() => void betolt()} />
            <ErvenytelenitesModal hid={hid} bejegyzes={ervenytelenitendo} onClose={() => setErvenytelenitendo(null)} onMentve={() => void betolt()} />
            <ConfirmDialog
                open={visszaallitando != null}
                onOpenChange={(v) => !v && setVisszaallitando(null)}
                title="Visszaállítod érvényesre?"
                description={`„${visszaallitando?.cim ?? ""}” újra beleszámít az összegzésekbe.`}
                confirmLabel="Visszaállítás"
                loading={visszaallitasFut}
                onConfirm={visszaallitas}
            />
        </div>
    );
}
