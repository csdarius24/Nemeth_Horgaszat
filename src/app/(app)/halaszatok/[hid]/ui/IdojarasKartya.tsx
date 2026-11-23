"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Cloud,
    CloudDrizzle,
    CloudFog,
    CloudHail,
    CloudLightning,
    CloudMoon,
    CloudRain,
    CloudSnow,
    CloudSun,
    Droplets,
    Gauge,
    MapPin,
    Moon,
    Navigation,
    RefreshCw,
    Sun,
    TriangleAlert,
    Umbrella,
    Wind,
    type LucideIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { egtaj, IDOZONA, type Aktualis, type Nap, type Ora } from "@/lib/idojaras/metno";
import type { Szelsoseg } from "@/lib/idojaras/szelsoseg";
import { szimbolumInfo, type IkonKategoria } from "@/lib/idojaras/szimbolum";
import { cn } from "@/lib/utils";

/** Ennyi időnként frissül magától (a szerver a MET Norway `Expires` szerint gyorsítótáraz). */
const FRISSITES_MS = 30 * 60 * 1000;

type Valasz =
    | { nincsHely: true; viewerRole: "OWNER" | "ADMIN" | "STAFF" }
    | {
        nincsHely: false;
        hely: { lat: number; lng: number };
        frissitve: string | null;
        aktualis: Aktualis | null;
        orak: Ora[];
        napok: Nap[];
        szelsosegek: Szelsoseg[];
        lekerve: string;
        elavult: boolean;
        forras: { nev: string; url: string; licenc: string };
    };

const IKONOK: Record<IkonKategoria, LucideIcon> = {
    derult: Sun,
    derult_ejjel: Moon,
    kisse_felhos: CloudSun,
    kisse_felhos_ejjel: CloudMoon,
    borult: Cloud,
    kod: CloudFog,
    zivatar: CloudLightning,
    ho: CloudSnow,
    havaseso: CloudHail,
    szitalas: CloudDrizzle,
    eso: CloudRain,
};

function IdoIkon({ kod, className }: { kod: string | null; className?: string }) {
    const info = szimbolumInfo(kod);
    const Ikon = info ? IKONOK[info.ikon] : Cloud;
    return <Ikon className={className} aria-label={info?.cimke ?? "Nincs adat"} role="img" />;
}

const fok = (x: number | null) => (x == null ? "–" : `${Math.round(x)}°`);
const mm = (x: number | null) => (x == null ? "–" : `${x.toLocaleString("hu-HU", { maximumFractionDigits: 1 })} mm`);

const oraFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: IDOZONA, hour: "2-digit", minute: "2-digit" });
const napFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "UTC", weekday: "short" });
const datumFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "UTC", month: "short", day: "numeric", weekday: "long" });

/** "YYYY-MM-DD" (helyi dátum) → rövid napnév; a mai/holnapi napot szóval. */
function napNev(datum: string, ma: string, holnap: string) {
    if (datum === ma) return "Ma";
    if (datum === holnap) return "Holnap";
    return napFmt.format(new Date(`${datum}T12:00:00Z`));
}

type SzelsosegCsoport = {
    kod: Szelsoseg["kod"];
    cim: string;
    magas: boolean;
    napok: { datum: string; ertek: string }[];
    /** A jelenség közös tanácsa (a részlet „ — ” utáni része), egyszer kiírva. */
    tanacs: string | null;
};

const nagyKezdobetu = (t: string) => t.charAt(0).toLocaleUpperCase("hu-HU") + t.slice(1);

/** Az egymást követő napok azonos jelenségeit (pl. fagy) egy csoportba vonja, az első előfordulás sorrendjében. */
function csoportositSzelsosegek(lista: Szelsoseg[]): SzelsosegCsoport[] {
    const csoportok = new Map<Szelsoseg["kod"], SzelsosegCsoport>();
    for (const s of lista) {
        const [ertek, ...tobbi] = s.reszlet.split(" — ");
        const cs = csoportok.get(s.kod) ?? { kod: s.kod, cim: s.cim, magas: false, napok: [], tanacs: nagyKezdobetu(tobbi.join(" — ")) || null };
        cs.magas ||= s.szint === "magas";
        cs.napok.push({ datum: s.datum, ertek });
        csoportok.set(s.kod, cs);
    }
    return [...csoportok.values()];
}

function Reszlet({ ikon: Ikon, cimke, ertek }: { ikon: LucideIcon; cimke: string; ertek: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Ikon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{cimke}</div>
                <div className="text-sm font-medium tabular-nums">{ertek}</div>
            </div>
        </div>
    );
}

export default function IdojarasKartya({ hid, viewerRole }: { hid: string; viewerRole: "OWNER" | "ADMIN" | "STAFF" }) {
    const [adat, setAdat] = useState<Valasz | null>(null);
    const [toltes, setToltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const utolsoRef = useRef(0);

    const betolt = useCallback(async () => {
        setToltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/idojaras`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült betölteni az időjárást.");
            setAdat(json as Valasz);
            utolsoRef.current = Date.now();
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setToltes(false);
        }
    }, [hid]);

    // Betöltés + automatikus frissítés: időzítővel, és ha a lap újra előtérbe kerül.
    useEffect(() => {
        void betolt();
        const idozito = window.setInterval(() => void betolt(), FRISSITES_MS);
        const lathatosag = () => {
            if (document.visibilityState === "visible" && Date.now() - utolsoRef.current > FRISSITES_MS / 3) void betolt();
        };
        document.addEventListener("visibilitychange", lathatosag);
        return () => {
            window.clearInterval(idozito);
            document.removeEventListener("visibilitychange", lathatosag);
        };
    }, [betolt]);

    const kezelo = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const fejlec = (alcim?: React.ReactNode) => (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1.5">
                {/* Valódi h2, hogy a kártya alcímei (h3) helyes címsorrendben legyenek. */}
                <CardTitle>
                    <h2>Időjárás</h2>
                </CardTitle>
                {alcim && <CardDescription>{alcim}</CardDescription>}
            </div>
            <IconButton
                label="Időjárás frissítése"
                icon={<RefreshCw className={cn(toltes && "animate-spin")} />}
                variant="outline"
                size="icon-sm"
                onClick={() => void betolt()}
                disabled={toltes}
            />
        </CardHeader>
    );

    if (!adat && toltes) {
        return (
            <Card>
                {fejlec()}
                <CardContent className="grid gap-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (hiba && !adat) {
        return (
            <Card>
                {fejlec()}
                <CardContent>
                    <p className="text-sm text-muted-foreground">{hiba}</p>
                </CardContent>
            </Card>
        );
    }

    if (!adat) return null;

    if (adat.nincsHely) {
        return (
            <Card>
                {fejlec()}
                <CardContent>
                    <Alert>
                        <MapPin />
                        <AlertTitle>Nincs megadva a halgazdaság helye</AlertTitle>
                        <AlertDescription>
                            <p>Az időjárás a térképen megjelölt hely alapján jelenik meg.</p>
                            {kezelo && (
                                <Button size="sm" className="mt-2" asChild>
                                    <Link href={`/halaszatok/${hid}/terkep`}>
                                        <MapPin />
                                        Hely megadása
                                    </Link>
                                </Button>
                            )}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const a = adat.aktualis;
    const ma = adat.napok[0]?.datum ?? "";
    const holnap = adat.napok[1]?.datum ?? "";
    const maiNap = adat.napok[0];
    // 24 órás sáv: 3 óránként 8 elem (mobilon is elfér görgetve).
    const orak = adat.orak.filter((_, i) => i % 3 === 0).slice(0, 8);
    const napok = adat.napok.slice(0, 7);
    const szelIrany = egtaj(a?.szelIranyFok);
    const szelsosegCsoportok = csoportositSzelsosegek(adat.szelsosegek);

    return (
        <Card className={cn("transition-opacity", toltes && "opacity-70")} aria-busy={toltes}>
            {fejlec(
                <>
                    Frissítve: {oraFmt.format(new Date(adat.lekerve))}
                    {adat.elavult && <span className="text-warning"> · a szolgáltatás most nem elérhető, a legutóbbi adat látszik</span>}
                </>
            )}
            <CardContent className="grid gap-6">
                {/* ── Most ── */}
                {a && (
                    <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
                        <div className="flex items-center gap-4">
                            <IdoIkon kod={a.szimbolum} className="size-14 text-primary" />
                            <div>
                                <div className="font-heading text-5xl font-bold tabular-nums">
                                    {a.homersekletC == null ? "–" : `${Math.round(a.homersekletC)}°C`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {szimbolumInfo(a.szimbolum)?.cimke ?? "–"}
                                    {maiNap && ` · ma ${fok(maiNap.minC)} / ${fok(maiNap.maxC)}`}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Reszlet ikon={Droplets} cimke="Páratartalom" ertek={a.paratartalomSzazalek == null ? "–" : `${a.paratartalomSzazalek}%`} />
                            <Reszlet
                                ikon={Wind}
                                cimke="Szél"
                                ertek={
                                    <span className="flex flex-wrap items-center gap-x-1">
                                        <span className="whitespace-nowrap">{a.szelSebessegKmh == null ? "–" : `${a.szelSebessegKmh} km/h`}</span>
                                        {a.szelIranyFok != null && (
                                            // A nyíl arra mutat, AMERRE fúj a szél (honnan + 180°).
                                            <Navigation
                                                className="size-3.5 fill-current text-muted-foreground"
                                                style={{ transform: `rotate(${a.szelIranyFok + 180 - 45}deg)` }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {szelIrany && <span className="text-muted-foreground">{szelIrany}</span>}
                                    </span>
                                }
                            />
                            <Reszlet ikon={Umbrella} cimke="Csapadék (1 óra)" ertek={mm(a.csapadekMm)} />
                            <Reszlet ikon={Gauge} cimke="Légnyomás" ertek={a.legnyomasHpa == null ? "–" : `${a.legnyomasHpa} hPa`} />
                        </div>
                    </div>
                )}

                {/* ── Szélsőséges időjárás ── */}
                {szelsosegCsoportok.length > 0 && (
                    <div className="grid gap-2">
                        {/* Jelenségenként EGY doboz (pl. 4 fagyos nap ne 4 külön figyelmeztetés legyen). */}
                        {szelsosegCsoportok.map((cs) => (
                            <Alert key={cs.kod} variant={cs.magas ? "destructive" : "warning"}>
                                <TriangleAlert />
                                <AlertTitle className="flex flex-wrap items-center gap-2">
                                    {cs.cim}
                                    <Badge variant={cs.magas ? "danger" : "warning"}>
                                        {cs.napok.length === 1 ? "1 nap" : `${cs.napok.length} nap`}
                                    </Badge>
                                </AlertTitle>
                                <AlertDescription className="grid gap-1.5">
                                    <ul className="grid gap-0.5">
                                        {cs.napok.map((n, i) => (
                                            <li key={`${n.datum}-${i}`} className="flex flex-wrap gap-x-2">
                                                <span className="font-medium tabular-nums">
                                                    {datumFmt.format(new Date(`${n.datum}T12:00:00Z`))}
                                                </span>
                                                <span>{n.ertek}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {cs.tanacs && <p>{cs.tanacs}</p>}
                                </AlertDescription>
                            </Alert>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            Az előrejelzésből számolt jelzés — nem a HungaroMet hivatalos figyelmeztetése.
                        </p>
                    </div>
                )}

                {/* ── Következő 24 óra ── */}
                {orak.length > 0 && (
                    <div className="grid gap-2">
                        <h3 id="idojaras-orak" className="text-sm font-semibold">Következő 24 óra</h3>
                        {/* Görgethető sáv: billentyűzettel is elérhető (Tab, majd nyilak). */}
                        <ol tabIndex={0} aria-labelledby="idojaras-orak" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                            {orak.map((o) => (
                                <li key={o.ido} className="flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-2 text-center">
                                    <span className="text-xs text-muted-foreground tabular-nums">{oraFmt.format(new Date(o.ido))}</span>
                                    <IdoIkon kod={o.szimbolum} className="size-6" />
                                    <span className="text-sm font-semibold tabular-nums">{fok(o.homersekletC)}</span>
                                    <span className={cn("text-xs tabular-nums", (o.csapadekMm ?? 0) > 0 ? "text-info" : "text-muted-foreground")}>
                                        {(o.csapadekMm ?? 0) > 0 ? mm(o.csapadekMm) : `${o.szelSebessegKmh ?? "–"} km/h`}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* ── Napi előrejelzés ── */}
                {napok.length > 0 && (
                    <div className="grid gap-2">
                        <h3 id="idojaras-napok" className="text-sm font-semibold">Előrejelzés ({napok.length} nap)</h3>
                        {/* Egy sor (keskeny kijelzőn görgethető), hogy a 7. nap ne lógjon egyedül új sorban. */}
                        <ol tabIndex={0} aria-labelledby="idojaras-napok" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                            {napok.map((n) => (
                                <li key={n.datum} className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center">
                                    <span className="text-xs font-medium capitalize">{napNev(n.datum, ma, holnap)}</span>
                                    <IdoIkon kod={n.szimbolum} className="size-7" />
                                    <span className="text-sm tabular-nums">
                                        <span className="font-semibold">{fok(n.maxC)}</span>
                                        <span className="text-muted-foreground"> / {fok(n.minC)}</span>
                                    </span>
                                    <span className={cn("flex items-center gap-1 text-xs tabular-nums", n.csapadekMm > 0 ? "text-info" : "text-muted-foreground")}>
                                        <Droplets className="size-3" aria-hidden="true" />
                                        {mm(n.csapadekMm)}
                                        {n.csapadekValoszinusegSzazalek != null && n.csapadekValoszinusegSzazalek > 0 && ` · ${Math.round(n.csapadekValoszinusegSzazalek)}%`}
                                    </span>
                                    {n.maxSzelKmh != null && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                            <Wind className="size-3" aria-hidden="true" />
                                            {n.maxLokesKmh ?? n.maxSzelKmh} km/h
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Adatforrás:{" "}
                    <a href={adat.forras.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        {adat.forras.nev}
                    </a>{" "}
                    ({adat.forras.licenc}) · a halgazdaság térképen megadott helye alapján · automatikusan frissül.
                </p>
            </CardContent>
        </Card>
    );
}
