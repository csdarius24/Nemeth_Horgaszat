"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Coins, FlaskConical, Mountain, Pencil, Pill, Plus, RefreshCw, Sprout, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
    datumIg,
    TIPUS_META,
    TOKEZELES_TIPUSOK,
    type AktivVarakozas,
    type TipusOsszeg,
    type ToOsszeg,
    type TokezelesTipus,
} from "@/lib/tokezeles/tokezeles";
import { cn } from "@/lib/utils";

import { TokezelesModal, type ToOpcio, type TokezelesUI } from "./TokezelesModal";

type Valasz = {
    kezelesek: TokezelesUI[];
    osszesites: {
        osszesen: { db: number; koltsegFt: number; szervestragyaKg: number; meszKg: number; gyogykezelesDb: number };
        tipusonkent: TipusOsszeg[];
        tavankent: ToOsszeg[];
    };
    aktivVarakozasok: AktivVarakozas[];
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

const IDOSZAKOK = [
    { ertek: "30", cimke: "Elmúlt 30 nap" },
    { ertek: "90", cimke: "Elmúlt 90 nap" },
    { ertek: "365", cimke: "Elmúlt 1 év" },
    { ertek: "ev", cimke: "Idei év" },
    { ertek: "osszes", cimke: "Összes" },
];

const hu = (n: number, t = 0) => n.toLocaleString("hu-HU", { maximumFractionDigits: t });
const ft = (n: number) => `${hu(n)} Ft`;
/** kg → olvasható tömeg: 1 t felett tonnában. */
const tomeg = (kg: number) => (kg >= 1000 ? `${hu(kg / 1000, 2)} t` : `${hu(kg, 1)} kg`);
const datumFmt = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

const TIPUS_BADGE: Record<TokezelesTipus, "warning" | "info" | "danger" | "success" | "secondary" | "primary"> = {
    SZERVESTRAGYA: "warning",
    MESZEZES: "secondary",
    KLORMESZ: "info",
    GYOGYSZER: "primary",
    ANTIBIOTIKUM: "danger",
    VITAMIN: "success",
    EGYEB: "secondary",
};

function idoszakTol(ertek: string): string | null {
    if (ertek === "osszes") return null;
    const d = new Date();
    if (ertek === "ev") return new Date(Date.UTC(d.getFullYear(), 0, 1)).toISOString();
    d.setDate(d.getDate() - Number(ertek));
    return d.toISOString();
}

function tipusMennyiseg(t: TipusOsszeg) {
    const reszek = [t.tomegKg > 0 ? tomeg(t.tomegKg) : null, ...Object.entries(t.egyebMennyisegek).map(([e, m]) => `${hu(m ?? 0, 2)} ${e}`)];
    return reszek.filter(Boolean).join(" + ") || "–";
}

export default function TokezelesekClient({ hid, kezdoToId }: { hid: string; kezdoToId: string | null }) {
    const [toak, setToak] = useState<ToOpcio[]>([]);
    const [toSzuro, setToSzuro] = useState(kezdoToId ?? "osszes");
    const [tipusSzuro, setTipusSzuro] = useState<"osszes" | TokezelesTipus>("osszes");
    const [idoszak, setIdoszak] = useState("365");
    const [adat, setAdat] = useState<Valasz | null>(null);
    const [toltes, setToltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [modalNyitva, setModalNyitva] = useState(false);
    const [szerkesztett, setSzerkesztett] = useState<TokezelesUI | null>(null);
    const [torlendo, setTorlendo] = useState<TokezelesUI | null>(null);

    useEffect(() => {
        fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => setToak(Array.isArray(j?.toak) ? j.toak.map((t: ToOpcio) => ({ azonosito: t.azonosito, nev: t.nev, teruletHa: t.teruletHa ?? null })) : []))
            .catch(() => setToak([]));
    }, [hid]);

    const url = useMemo(() => {
        const p = new URLSearchParams();
        if (toSzuro !== "osszes") p.set("toId", toSzuro);
        if (tipusSzuro !== "osszes") p.set("tipus", tipusSzuro);
        const tol = idoszakTol(idoszak);
        if (tol) p.set("from", tol);
        return `/api/halaszatok/${hid}/tokezelesek?${p}`;
    }, [hid, toSzuro, tipusSzuro, idoszak]);

    const betolt = useCallback(async () => {
        setToltes(true);
        setHiba(null);
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült betölteni a tókezeléseket.");
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
        const res = await fetch(`/api/halaszatok/${hid}/tokezelesek/${torlendo.id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        if (!res.ok) { toast.error(json?.error ?? "Nem sikerült törölni."); return; }
        toast.success("Kezelés törölve", { description: "A halászati naplóban érvénytelenítve marad meg." });
        setTorlendo(null);
        void betolt();
    }

    const ujGomb = (
        <Button onClick={() => { setSzerkesztett(null); setModalNyitva(true); }} disabled={toak.length === 0}>
            <Plus />
            Kezelés rögzítése
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
                <PageHeader className="mb-0" title="Tókezelések" />
                <ErrorState title="Nem sikerült betölteni" message={hiba} onRetry={() => void betolt()} />
            </div>
        );
    }
    if (!adat) return null;

    const o = adat.osszesites.osszesen;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Tókezelések"
                description="Szervestrágya, meszezés, klórmész, gyógyszer, antibiotikum és vitamin tavanként."
                actions={ujGomb}
            />

            {/* Még tartó várakozási idők — a szűrőktől függetlenül mindig látszanak. */}
            {adat.aktivVarakozasok.length > 0 && (
                <Alert variant="destructive">
                    <Clock />
                    <AlertTitle>Élelmezés-egészségügyi várakozási idő tart</AlertTitle>
                    <AlertDescription>
                        <ul className="mt-1 grid gap-0.5">
                            {adat.aktivVarakozasok.map((v) => (
                                <li key={v.toId}>
                                    <span className="font-medium">{v.toNev}</span>: {datumIg(v.veg)}
                                    {" "}({v.hatraNap} nap van hátra{v.keszitmeny ? ` · ${v.keszitmeny}` : ""}) — innen hal nem értékesíthető.
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Select value={toSzuro} onValueChange={setToSzuro}>
                    <SelectTrigger size="sm" aria-label="Tóegység szűrő" className="min-w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="osszes">Minden tóegység</SelectItem>
                        {toak.map((t) => <SelectItem key={t.azonosito} value={String(t.azonosito)}>{t.nev}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={tipusSzuro} onValueChange={(v) => setTipusSzuro(v as "osszes" | TokezelesTipus)}>
                    <SelectTrigger size="sm" aria-label="Típus szűrő" className="min-w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="osszes">Minden típus</SelectItem>
                        {TOKEZELES_TIPUSOK.map((t) => <SelectItem key={t} value={t}>{TIPUS_META[t].cimke}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={idoszak} onValueChange={setIdoszak}>
                    <SelectTrigger size="sm" aria-label="Időszak"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {IDOSZAKOK.map((i) => <SelectItem key={i.ertek} value={i.ertek}>{i.cimke}</SelectItem>)}
                    </SelectContent>
                </Select>
                <IconButton label="Frissítés" icon={<RefreshCw className={cn(toltes && "animate-spin")} />} variant="outline" size="icon-sm" onClick={() => void betolt()} disabled={toltes} />
            </div>

            <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-6 transition-opacity", toltes && "opacity-60")} aria-busy={toltes}>
                <StatGrid oszlopok={{ lg: 4 }}>
                    <StatCard cim={"Szerves­trágya"} ertek={tomeg(o.szervestragyaKg)} alcim="bejuttatva" ikon={Sprout} tonus="warning" />
                    <StatCard cim="Mész" ertek={tomeg(o.meszKg)} alcim="meszezés + klórmész" ikon={Mountain} tonus="info" />
                    <StatCard cim={"Gyógy­kezelések"} ertek={o.gyogykezelesDb} alcim="gyógyszer, antibiotikum, vitamin" ikon={Pill} tonus="danger" />
                    <StatCard cim="Költség" ertek={ft(o.koltsegFt)} alcim={`${o.db} kezelés`} ikon={Coins} />
                </StatGrid>

                {adat.kezelesek.length === 0 ? (
                    <EmptyState
                        icon={<FlaskConical />}
                        title="Nincs rögzített kezelés"
                        description={toak.length === 0 ? "Előbb hozz létre tóegységet." : "A választott szűrőkkel nincs kezelés. Rögzítsd az elsőt."}
                        action={toak.length > 0 ? ujGomb : undefined}
                    />
                ) : (
                    <>
                        <div className="grid gap-4 2xl:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tavanként</CardTitle>
                                    <CardDescription>Bejuttatott anyagok a választott időszakban (trágya kg/ha, ha ismert a terület).</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tóegység</TableHead>
                                                <TableHead className="text-right">Szervestrágya</TableHead>
                                                <TableHead className="text-right">kg/ha</TableHead>
                                                <TableHead className="text-right">Mész</TableHead>
                                                <TableHead className="text-right">Gyógykez.</TableHead>
                                                <TableHead className="text-right">Költség</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {adat.osszesites.tavankent.map((t) => (
                                                <TableRow key={t.toId}>
                                                    <TableCell className="font-medium">{t.toNev}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{t.szervestragyaKg > 0 ? tomeg(t.szervestragyaKg) : "–"}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{t.szervestragyaKgPerHa != null ? hu(t.szervestragyaKgPerHa) : "–"}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{t.meszKg > 0 ? tomeg(t.meszKg) : "–"}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{t.gyogykezelesDb || "–"}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{t.koltsegFt ? ft(t.koltsegFt) : "–"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Típusonként</CardTitle>
                                    <CardDescription>Kezelések száma, mennyisége és költsége.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Típus</TableHead>
                                                <TableHead className="text-right">Db</TableHead>
                                                <TableHead className="text-right">Mennyiség</TableHead>
                                                <TableHead className="text-right">Költség</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {adat.osszesites.tipusonkent.map((t) => (
                                                <TableRow key={t.tipus}>
                                                    <TableCell><Badge variant={TIPUS_BADGE[t.tipus]}>{t.cimke}</Badge></TableCell>
                                                    <TableCell className="text-right tabular-nums">{t.db}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{tipusMennyiseg(t)}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">{t.koltsegFt ? ft(t.koltsegFt) : "–"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Kezelések</CardTitle>
                                <CardDescription>{adat.kezelesek.length} kezelés, a legfrissebb elöl.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y">
                                    {adat.kezelesek.map((k) => (
                                        <li key={k.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]">
                                            <div className="grid gap-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant={TIPUS_BADGE[k.tipus]}>{TIPUS_META[k.tipus].cimke}</Badge>
                                                    <span className="font-semibold">{k.keszitmeny ?? k.hatoanyag ?? TIPUS_META[k.tipus].cimke}</span>
                                                    <Badge variant="outline">{k.toNev}</Badge>
                                                    <span className="text-sm text-muted-foreground">{datumFmt.format(new Date(k.datum))}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                    <span><span className="text-muted-foreground">Mennyiség:</span> {hu(k.mennyiseg, 3)} {k.egyseg}</span>
                                                    {k.hatoanyag && k.keszitmeny && <span><span className="text-muted-foreground">Hatóanyag:</span> {k.hatoanyag}</span>}
                                                    {k.koltsegFt != null && <span><span className="text-muted-foreground">Költség:</span> {ft(k.koltsegFt)}</span>}
                                                    {k.kezelesOka && <span><span className="text-muted-foreground">Ok:</span> {k.kezelesOka}</span>}
                                                </div>
                                                {k.varakozasVege && (
                                                    <p className={cn("flex items-center gap-1.5 text-sm", k.varakozasTart ? "font-medium text-destructive" : "text-muted-foreground")}>
                                                        <Clock className="size-3.5" aria-hidden="true" />
                                                        Várakozási idő: {k.varakozasiIdoNap} nap — {datumIg(k.varakozasVege)}
                                                        {k.varakozasTart ? " (még tart)" : " (lejárt)"}
                                                    </p>
                                                )}
                                                {k.megjegyzes && <p className="text-sm whitespace-pre-line text-muted-foreground">{k.megjegyzes}</p>}
                                                {k.rogzitoNev && <p className="text-xs text-muted-foreground">Rögzítette: {k.rogzitoNev}</p>}
                                            </div>
                                            {k.modosithato && (
                                                <div className="flex items-start gap-1 sm:justify-end">
                                                    <IconButton label="Szerkesztés" icon={<Pencil />} variant="ghost" size="icon-sm" onClick={() => { setSzerkesztett(k); setModalNyitva(true); }} />
                                                    <IconButton label="Törlés" icon={<Trash2 />} variant="ghost" size="icon-sm" onClick={() => setTorlendo(k)} />
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

            <TokezelesModal
                hid={hid}
                open={modalNyitva}
                onOpenChange={setModalNyitva}
                toak={toak}
                kezeles={szerkesztett}
                alapToId={toSzuro !== "osszes" ? Number(toSzuro) : null}
                alapTipus={tipusSzuro !== "osszes" ? tipusSzuro : null}
                onMentve={() => void betolt()}
            />

            <ConfirmDialog
                open={torlendo != null}
                onOpenChange={(nyitva) => !nyitva && setTorlendo(null)}
                title="Törlöd a kezelést?"
                description="A kezelés törlődik (a várakozási idő is vele). A halászati naplóban érvénytelenítve megmarad (audit)."
                confirmLabel="Törlés"
                destructive
                onConfirm={torles}
            />
        </div>
    );
}
