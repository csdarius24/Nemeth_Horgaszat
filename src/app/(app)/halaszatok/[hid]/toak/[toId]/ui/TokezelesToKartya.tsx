"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, FlaskConical } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { datumIg, TIPUS_META, type AktivVarakozas, type TokezelesTipus } from "@/lib/tokezeles/tokezeles";

type Osszesen = { db: number; koltsegFt: number; szervestragyaKg: number; meszKg: number; gyogykezelesDb: number };

const hu = (n: number, t = 0) => n.toLocaleString("hu-HU", { maximumFractionDigits: t });
const tomeg = (kg: number) => (kg >= 1000 ? `${hu(kg / 1000, 2)} t` : `${hu(kg, 1)} kg`);
const datum = (iso: string) => new Date(iso).toLocaleDateString("hu-HU", { timeZone: "UTC" });

/**
 * A tóegység kezelései (elmúlt 1 év) + a még tartó élelmezés-egészségügyi
 * várakozási idő kiemelve. A várakozást a szülő is megkapja (kivétel figyelmeztetés).
 */
export function TokezelesToKartya({ hid, toId, frissites, onVarakozas }: {
    hid: string;
    toId: string;
    frissites: unknown;
    onVarakozas?: (v: AktivVarakozas | null) => void;
}) {
    const [osszeg, setOsszeg] = useState<Osszesen | null>(null);
    const [utolso, setUtolso] = useState<{ datum: string; tipus: TokezelesTipus; nev: string | null } | null>(null);
    const [varakozas, setVarakozas] = useState<AktivVarakozas | null>(null);

    useEffect(() => {
        const tol = new Date();
        tol.setFullYear(tol.getFullYear() - 1);
        fetch(`/api/halaszatok/${hid}/tokezelesek?toId=${toId}&from=${encodeURIComponent(tol.toISOString())}&limit=1000`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                setOsszeg(j?.osszesites?.osszesen ?? null);
                const k = j?.kezelesek?.[0];
                setUtolso(k ? { datum: k.datum, tipus: k.tipus, nev: k.keszitmeny ?? k.hatoanyag } : null);
                const v: AktivVarakozas | null = j?.aktivVarakozasok?.[0] ?? null;
                setVarakozas(v);
                onVarakozas?.(v);
            })
            .catch(() => setOsszeg(null));
        // Az onVarakozas callback a szülőé; csak a tó / frissítés változásakor töltünk újra.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hid, toId, frissites]);

    if (!osszeg) return null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="size-5 text-muted-foreground" aria-hidden="true" />
                        Tókezelések
                    </CardTitle>
                    <CardDescription>
                        Elmúlt 1 év
                        {utolso && ` · utolsó: ${datum(utolso.datum)} (${TIPUS_META[utolso.tipus].cimke}${utolso.nev ? `, ${utolso.nev}` : ""})`}
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/halaszatok/${hid}/tokezelesek?toId=${toId}`}>
                        {osszeg.db === 0 ? "Rögzítés" : "Részletek"}
                        <ArrowRight />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
                {varakozas && (
                    <Alert variant="destructive">
                        <Clock />
                        <AlertTitle>Várakozási idő tart: {datumIg(varakozas.veg)} ({varakozas.hatraNap} nap)</AlertTitle>
                        <AlertDescription>
                            {TIPUS_META[varakozas.tipus].cimke}{varakozas.keszitmeny ? ` (${varakozas.keszitmeny})` : ""} miatt ebből a tóból hal addig nem értékesíthető.
                        </AlertDescription>
                    </Alert>
                )}
                {osszeg.db === 0 ? (
                    <p className="text-sm text-muted-foreground">Ehhez a tóegységhez az elmúlt évben nem rögzítettek kezelést.</p>
                ) : (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            ["Szervestrágya", osszeg.szervestragyaKg > 0 ? tomeg(osszeg.szervestragyaKg) : "–"],
                            ["Mész", osszeg.meszKg > 0 ? tomeg(osszeg.meszKg) : "–"],
                            ["Gyógykezelések", `${osszeg.gyogykezelesDb}`],
                            ["Költség", `${hu(osszeg.koltsegFt)} Ft`],
                        ].map(([c, e]) => (
                            <div key={c}>
                                <dt className="text-xs text-muted-foreground">{c}</dt>
                                <dd className="font-semibold tabular-nums">{e}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}
