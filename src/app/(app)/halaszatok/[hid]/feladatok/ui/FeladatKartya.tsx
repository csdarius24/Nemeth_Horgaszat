"use client";

import { useState } from "react";
import { CalendarClock, Check, Flag, MoreHorizontal, Pause, Play, RotateCcw, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import { ALAP_SZIN, feladatPrioritasCimke, feladatStatuszCimke, hatralevoNap } from "@/lib/feladatok/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { monogram } from "@/components/app/monogram";

import { hataridoSzoveg, PRIORITAS_OSZTALY, STATUSZ_BADGE, type Feladat } from "./feladat";

const SIKER_UZENET: Record<string, string> = {
    FOLYAMATBAN: "Feladat elindítva",
    KESZ: "Feladat kész",
    ELHALASZTVA: "Feladat elhalasztva",
};

export function FeladatKartya({ f, hid, canManage, onValtozas }: {
    f: Feladat;
    hid: string;
    canManage: boolean;
    onValtozas: () => void;
}) {
    const [fut, setFut] = useState<string | null>(null);
    const csik = f.szin || ALAP_SZIN;
    const hatarido = hataridoSzoveg(f, hatralevoNap(f.hatarido));
    const kesz = f.statusz === "KESZ";
    const torolve = f.statusz === "TOROLVE";

    async function statuszValt(uj: string) {
        setFut(uj);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/feladatok/${f.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusz: uj }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                // Pl. 403: dolgozó csak a neki kiosztott feladat státuszát állíthatja.
                toast.error("Nem sikerült módosítani", {
                    description: json?.error ?? (res.status === 403 ? "Ehhez a feladathoz nincs jogosultságod." : undefined),
                });
                return;
            }
            toast.success(uj === "FOLYAMATBAN" && kesz ? "Feladat újranyitva" : SIKER_UZENET[uj] ?? "Státusz frissítve", { description: f.cim });
            onValtozas();
        } catch {
            toast.error("Hálózati hiba");
        } finally {
            setFut(null);
        }
    }

    return (
        <Card
            className={cn(
                // Bal oldali színcsík a feladat saját színével.
                "relative gap-3 overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--csik)",
                (kesz || torolve) && "opacity-70"
            )}
            style={{ "--csik": csik } as React.CSSProperties}
        >
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className={cn("text-base", kesz && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                        {f.cim}
                    </CardTitle>
                    <Badge variant={STATUSZ_BADGE[f.statusz] ?? "secondary"} className="shrink-0">
                        {kesz && <Check aria-hidden="true" />}
                        {feladatStatuszCimke(f.statusz)}
                    </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className={cn("inline-flex items-center gap-1 font-medium", PRIORITAS_OSZTALY[f.prioritas])}>
                        <Flag className="size-3.5" aria-hidden="true" />
                        {feladatPrioritasCimke(f.prioritas)}
                    </span>
                    {hatarido && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1",
                                f.lejart ? "font-semibold text-destructive" : hatarido.surgos && !kesz ? "font-medium text-warning" : "text-muted-foreground"
                            )}
                            title={`Határidő: ${new Date(f.hatarido!).toLocaleDateString("hu-HU")}`}
                        >
                            <CalendarClock className="size-3.5" aria-hidden="true" />
                            {hatarido.rovid === hatarido.datum ? hatarido.datum : `${hatarido.rovid} · ${hatarido.datum}`}
                        </span>
                    )}
                    {f.toNev && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Waves className="size-3.5" aria-hidden="true" />
                            {f.toNev}
                        </span>
                    )}
                </div>
            </CardHeader>

            {f.leiras && (
                <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground" title={f.leiras}>{f.leiras}</p>
                </CardContent>
            )}

            <CardFooter className="mt-auto flex-wrap justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                    <Avatar className="size-7">
                        <AvatarFallback className={cn("text-[11px] font-bold", f.felelosNev ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            {f.felelosNev ? monogram(f.felelosNev) : "–"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                        <span className={f.felelosNev ? "font-medium" : "text-muted-foreground"}>{f.felelosNev ?? "Nincs kiosztva"}</span>
                    </span>
                </div>

                {!torolve && (
                    <div className="flex items-center gap-1.5">
                        {(f.statusz === "UJ" || f.statusz === "ELHALASZTVA") && (
                            <Button size="sm" variant="outline" loading={fut === "FOLYAMATBAN"} disabled={!!fut} onClick={() => statuszValt("FOLYAMATBAN")}>
                                <Play />
                                Indítás
                            </Button>
                        )}
                        {!kesz && (
                            <Button size="sm" variant="success" loading={fut === "KESZ"} disabled={!!fut} onClick={() => statuszValt("KESZ")}>
                                <Check />
                                Kész
                            </Button>
                        )}
                        {kesz && (
                            <Button size="sm" variant="outline" loading={fut === "FOLYAMATBAN"} disabled={!!fut} onClick={() => statuszValt("FOLYAMATBAN")}>
                                <RotateCcw />
                                Újranyitás
                            </Button>
                        )}
                        {canManage && f.statusz !== "ELHALASZTVA" && !kesz && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" aria-label={`További műveletek: ${f.cim}`} disabled={!!fut}>
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => statuszValt("ELHALASZTVA")}>
                                        <Pause />
                                        Halasztás
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
