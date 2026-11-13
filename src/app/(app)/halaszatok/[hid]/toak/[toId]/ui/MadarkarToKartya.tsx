"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bird } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Osszeg } from "@/lib/madarkar/madarkar";

const hu = (n: number, t = 0) => n.toLocaleString("hu-HU", { maximumFractionDigits: t });

/** A tóegység madárkár-összesítése (elmúlt 1 év) + link a részletes, tóra szűrt nézethez. */
export function MadarkarToKartya({ hid, toId, frissites }: { hid: string; toId: string; frissites: unknown }) {
    const [osszeg, setOsszeg] = useState<Osszeg | null>(null);
    const [utolso, setUtolso] = useState<{ datum: string; madarfaj: string } | null>(null);

    useEffect(() => {
        const tol = new Date();
        tol.setFullYear(tol.getFullYear() - 1);
        fetch(`/api/halaszatok/${hid}/madarkar?toId=${toId}&from=${encodeURIComponent(tol.toISOString())}&limit=500`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                setOsszeg(j?.osszesites?.osszesen ?? null);
                const e = j?.esemenyek?.[0];
                setUtolso(e ? { datum: e.datum, madarfaj: e.madarfaj } : null);
            })
            .catch(() => setOsszeg(null));
    }, [hid, toId, frissites]);

    if (!osszeg) return null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <Bird className="size-5 text-muted-foreground" aria-hidden="true" />
                        Madárkár
                    </CardTitle>
                    <CardDescription>
                        Elmúlt 1 év
                        {utolso && ` · utolsó: ${new Date(utolso.datum).toLocaleDateString("hu-HU", { timeZone: "UTC" })} (${utolso.madarfaj})`}
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/halaszatok/${hid}/madarkar?toId=${toId}`}>
                        {osszeg.esemenyDb === 0 ? "Rögzítés" : "Részletek"}
                        <ArrowRight />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {osszeg.esemenyDb === 0 ? (
                    <p className="text-sm text-muted-foreground">Ehhez a tóegységhez az elmúlt évben nem rögzítettek madárkárt.</p>
                ) : (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            ["Események", `${osszeg.esemenyDb}`],
                            ["Madarak (becsült)", `${hu(osszeg.egyedszam)} db`],
                            ["Halveszteség", `${hu(osszeg.halvesztesegKg, 2)} kg`],
                            ["Kár", `${hu(osszeg.karFt)} Ft`],
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
