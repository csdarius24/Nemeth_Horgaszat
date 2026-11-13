"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bird, Coins, Fish, Images, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { Osszeg } from "@/lib/madarkar/madarkar";
import { cn } from "@/lib/utils";

import { fotoUrl } from "./kep";
import { MadarkarModal, type MadarkarEsemenyUI, type ToOpcio } from "./MadarkarModal";

type Valasz = {
    esemenyek: MadarkarEsemenyUI[];
    osszesites: {
        osszesen: Osszeg;
        tavankent: Array<Osszeg & { toId: number; toNev: string }>;
        fajonkent: Array<Osszeg & { madarfaj: string }>;
    };
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

const IDOSZAKOK = [
    { ertek: "30", cimke: "Elmúlt 30 nap" },
    { ertek: "90", cimke: "Elmúlt 90 nap" },
    { ertek: "365", cimke: "Elmúlt 1 év" },
    { ertek: "ev", cimke: "Idei év" },
    { ertek: "osszes", cimke: "Összes" },
];

const hu = (n: number, tizedes = 0) => n.toLocaleString("hu-HU", { maximumFractionDigits: tizedes });
const ft = (n: number | null) => (n == null ? "–" : `${hu(n)} Ft`);
const kg = (n: number | null) => (n == null ? "–" : `${hu(n, 2)} kg`);
const datumFmt = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

function idoszakTol(ertek: string): string | null {
    if (ertek === "osszes") return null;
    const d = new Date();
    if (ertek === "ev") return new Date(Date.UTC(d.getFullYear(), 0, 1)).toISOString();
    d.setDate(d.getDate() - Number(ertek));
    return d.toISOString();
}

function OsszegTabla({ cim, leiras, sorok, nev }: {
    cim: string;
    leiras: string;
    sorok: Array<Osszeg & { kulcs: string; nev: string }>;
    nev: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{cim}</CardTitle>
                <CardDescription>{leiras}</CardDescription>
            </CardHeader>
            <CardContent>
                {sorok.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Nincs adat a választott időszakban.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{nev}</TableHead>
                                <TableHead className="text-right">Esemény</TableHead>
                                <TableHead className="text-right">Madár</TableHead>
                                <TableHead className="text-right">Halveszteség</TableHead>
                                <TableHead className="text-right">Kár</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorok.map((s) => (
                                <TableRow key={s.kulcs}>
                                    <TableCell className="font-medium">{s.nev}</TableCell>
                                    <TableCell className="text-right tabular-nums">{s.esemenyDb}</TableCell>
                                    <TableCell className="text-right tabular-nums">{hu(s.egyedszam)}</TableCell>
                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{kg(s.halvesztesegKg)}</TableCell>
                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{ft(s.karFt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function MadarkarClient({ hid, kezdoToId }: { hid: string; kezdoToId: string | null }) {
    const [toak, setToak] = useState<ToOpcio[]>([]);
    const [toSzuro, setToSzuro] = useState(kezdoToId ?? "osszes");
    const [idoszak, setIdoszak] = useState("365");
    const [adat, setAdat] = useState<Valasz | null>(null);
    const [toltes, setToltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [modalNyitva, setModalNyitva] = useState(false);
    const [szerkesztett, setSzerkesztett] = useState<MadarkarEsemenyUI | null>(null);
    const [torlendo, setTorlendo] = useState<MadarkarEsemenyUI | null>(null);
    const [nagyKep, setNagyKep] = useState<{ esemeny: MadarkarEsemenyUI; index: number } | null>(null);

    // Tóegységek (szűrő + űrlap).
    useEffect(() => {
        fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => setToak(Array.isArray(j?.toak) ? j.toak.map((t: ToOpcio) => ({ azonosito: t.azonosito, nev: t.nev })) : []))
            .catch(() => setToak([]));
    }, [hid]);

    const url = useMemo(() => {
        const p = new URLSearchParams();
        if (toSzuro !== "osszes") p.set("toId", toSzuro);
        const tol = idoszakTol(idoszak);
        if (tol) p.set("from", tol);
        return `/api/halaszatok/${hid}/madarkar?${p}`;
    }, [hid, toSzuro, idoszak]);

    const betolt = useCallback(async () => {
        setToltes(true);
        setHiba(null);
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült betölteni a madárkár-adatokat.");
            setAdat(json as Valasz);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setToltes(false);
        }
    }, [url]);

    useEffect(() => { void betolt(); }, [betolt]);

    async function torles() {
        if (!torlendo) return;
        const res = await fetch(`/api/halaszatok/${hid}/madarkar/${torlendo.id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        if (!res.ok) { toast.error(json?.error ?? "Nem sikerült törölni."); return; }
        toast.success("Bejegyzés törölve", { description: "A halászati naplóban érvénytelenítve marad meg." });
        setTorlendo(null);
        void betolt();
    }

    const ujGomb = (
        <Button onClick={() => { setSzerkesztett(null); setModalNyitva(true); }} disabled={toak.length === 0}>
            <Plus />
            Madárkár rögzítése
        </Button>
    );

    if (!adat && toltes) {
        return (
            <div className="grid gap-6" role="status" aria-label="Betöltés">
                <Skeleton className="h-9 w-56" />
                <StatGrid oszlopok={{ lg: 4 }}>
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
                </StatGrid>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    if (hiba && !adat) {
        return (
            <div className="grid gap-6">
                <PageHeader className="mb-0" title="Madárkár" />
                <ErrorState title="Nem sikerült betölteni" message={hiba} onRetry={() => void betolt()} />
            </div>
        );
    }

    if (!adat) return null;
    const o = adat.osszesites.osszesen;
    const kepNezet = nagyKep ? nagyKep.esemeny.fotok[nagyKep.index] : null;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Madárkár"
                description="Halevő madarak okozta károk dokumentálása tóegységenként."
                actions={ujGomb}
            />

            <div className="flex flex-wrap items-center gap-2">
                <Select value={toSzuro} onValueChange={setToSzuro}>
                    <SelectTrigger size="sm" aria-label="Tóegység szűrő" className="min-w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="osszes">Minden tóegység</SelectItem>
                        {toak.map((t) => <SelectItem key={t.azonosito} value={String(t.azonosito)}>{t.nev}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={idoszak} onValueChange={setIdoszak}>
                    <SelectTrigger size="sm" aria-label="Időszak">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {IDOSZAKOK.map((i) => <SelectItem key={i.ertek} value={i.ertek}>{i.cimke}</SelectItem>)}
                    </SelectContent>
                </Select>
                <IconButton
                    label="Frissítés"
                    icon={<RefreshCw className={cn(toltes && "animate-spin")} />}
                    variant="outline"
                    size="icon-sm"
                    onClick={() => void betolt()}
                    disabled={toltes}
                />
            </div>

            <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-6 transition-opacity", toltes && "opacity-60")} aria-busy={toltes}>
                <StatGrid oszlopok={{ lg: 4 }}>
                    <StatCard cim="Események" ertek={o.esemenyDb} alcim="rögzített madárkár" ikon={Bird} />
                    <StatCard cim="Madarak" ertek={`${hu(o.egyedszam)} db`} alcim="becsült egyedszám (összesen)" ikon={Bird} tonus="info" />
                    <StatCard cim={"Hal­veszteség"} ertek={kg(o.halvesztesegKg)} alcim="becsült" ikon={Fish} tonus="warning" />
                    <StatCard cim="Kár" ertek={ft(o.karFt)} alcim="becsült pénzügyi kár" ikon={Coins} tonus="danger" />
                </StatGrid>

                {adat.esemenyek.length === 0 ? (
                    <EmptyState
                        icon={<Bird />}
                        title="Nincs rögzített madárkár"
                        description={toak.length === 0 ? "Előbb hozz létre tóegységet." : "A választott szűrőkkel nincs bejegyzés. Rögzítsd az első esetet."}
                        action={toak.length > 0 ? ujGomb : undefined}
                    />
                ) : (
                    <>
                        <div className="grid gap-4 2xl:grid-cols-2">
                            <OsszegTabla
                                cim="Tóegységenként"
                                leiras="Összesítés a választott időszakra."
                                nev="Tóegység"
                                sorok={adat.osszesites.tavankent.map((t) => ({ ...t, kulcs: String(t.toId), nev: t.toNev }))}
                            />
                            <OsszegTabla
                                cim="Madárfajonként"
                                leiras="Melyik faj okozza a legtöbb kárt."
                                nev="Madárfaj"
                                sorok={adat.osszesites.fajonkent.map((f) => ({ ...f, kulcs: f.madarfaj, nev: f.madarfaj }))}
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Bejegyzések</CardTitle>
                                <CardDescription>{adat.esemenyek.length} esemény, a legfrissebb elöl.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y">
                                    {adat.esemenyek.map((e) => (
                                        <li key={e.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]">
                                            <div className="grid gap-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold">{e.madarfaj}</span>
                                                    <Badge variant="outline">{e.toNev}</Badge>
                                                    <span className="text-sm text-muted-foreground">{datumFmt.format(new Date(e.datum))}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                    <span><span className="text-muted-foreground">Egyedszám:</span> {e.egyedszam == null ? "–" : `${hu(e.egyedszam)} db`}</span>
                                                    <span><span className="text-muted-foreground">Halveszteség:</span> {kg(e.halvesztesegKg)}</span>
                                                    <span><span className="text-muted-foreground">Kár:</span> {ft(e.karFt)}</span>
                                                </div>
                                                {e.megjegyzes && <p className="text-sm whitespace-pre-line text-muted-foreground">{e.megjegyzes}</p>}
                                                {e.fotok.length > 0 && (
                                                    <ul className="mt-1 flex flex-wrap gap-2" aria-label="Fényképek">
                                                        {e.fotok.map((f, i) => (
                                                            <li key={f.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNagyKep({ esemeny: e, index: i })}
                                                                    className="block size-16 overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary sm:size-20"
                                                                    aria-label={`${i + 1}. fénykép megnyitása`}
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={fotoUrl(hid, f.id)} alt="" className="size-full object-cover" loading="lazy" />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {e.rogzitoNev && <p className="text-xs text-muted-foreground">Rögzítette: {e.rogzitoNev}</p>}
                                            </div>
                                            {e.modosithato && (
                                                <div className="flex items-start gap-1 sm:justify-end">
                                                    <IconButton label="Szerkesztés" icon={<Pencil />} variant="ghost" size="icon-sm" onClick={() => { setSzerkesztett(e); setModalNyitva(true); }} />
                                                    <IconButton label="Törlés" icon={<Trash2 />} variant="ghost" size="icon-sm" onClick={() => setTorlendo(e)} />
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <MadarkarModal
                hid={hid}
                open={modalNyitva}
                onOpenChange={setModalNyitva}
                toak={toak}
                esemeny={szerkesztett}
                alapToId={toSzuro !== "osszes" ? Number(toSzuro) : null}
                onMentve={() => void betolt()}
            />

            <ConfirmDialog
                open={torlendo != null}
                onOpenChange={(o) => !o && setTorlendo(null)}
                title="Törlöd a madárkár-bejegyzést?"
                description="A bejegyzés és a fényképei törlődnek. A halászati naplóban érvénytelenítve megmarad (audit)."
                confirmLabel="Törlés"
                destructive
                onConfirm={() => void torles()}
            />

            {/* Fénykép nagyban */}
            <Dialog open={nagyKep != null} onOpenChange={(o) => !o && setNagyKep(null)}>
                <DialogContent className="max-w-[min(96vw,64rem)] gap-3 overflow-y-auto p-3 sm:max-w-[min(96vw,64rem)]">
                    <DialogTitle className="flex items-center gap-2 pr-8 text-base">
                        <Images className="size-4" aria-hidden="true" />
                        {nagyKep && `${nagyKep.esemeny.madarfaj} · ${nagyKep.esemeny.toNev} · ${nagyKep.index + 1}/${nagyKep.esemeny.fotok.length}`}
                    </DialogTitle>
                    {kepNezet && nagyKep && (
                        <div className="grid gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={fotoUrl(hid, kepNezet.id)}
                                alt={`Madárkár fénykép: ${nagyKep.esemeny.madarfaj}`}
                                className="max-h-[60dvh] w-full rounded-md object-contain"
                            />
                            {nagyKep.esemeny.fotok.length > 1 && (
                                <div className="flex justify-center gap-2">
                                    <Button variant="outline" size="sm" disabled={nagyKep.index === 0} onClick={() => setNagyKep({ ...nagyKep, index: nagyKep.index - 1 })}>
                                        Előző
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={nagyKep.index === nagyKep.esemeny.fotok.length - 1} onClick={() => setNagyKep({ ...nagyKep, index: nagyKep.index + 1 })}>
                                        Következő
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
