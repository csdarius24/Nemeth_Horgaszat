"use client";

import { Ban, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { esemenyMeta, ESEMENY_TIPUSOK } from "@/components/app/esemenyek";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { idoSzoveg, type NaploBejegyzes } from "./tipusok";

function szam(x: number) {
    return x.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
}

/** Egy naplóbejegyzés sora: ikon, cím, tények, leírás, érvénytelenítés adatai, műveletek. */
export function NaploSor({ e, canModosit, onSzerkeszt, onErvenytelenit, onVisszaallit }: {
    e: NaploBejegyzes;
    canModosit: boolean;
    onSzerkeszt: () => void;
    onErvenytelenit: () => void;
    onVisszaallit: () => void;
}) {
    const meta = esemenyMeta(e.tipus);
    const Ikon = meta.ikon;
    const tipusCimke = e.tipus in ESEMENY_TIPUSOK ? meta.cimke : e.tipusCimke;

    // Kontextus (tó, faj) halványan, a mennyiségek kiemelve.
    const tenyek: Array<{ szoveg: string; kiemelt: boolean }> = [
        e.toNev && { szoveg: e.toNev, kiemelt: false },
        e.halfajNev && { szoveg: e.halfajNev, kiemelt: false },
        e.darab != null && { szoveg: `${szam(e.darab)} db`, kiemelt: true },
        e.mennyisegKg != null && { szoveg: `${szam(e.mennyisegKg)} kg`, kiemelt: true },
    ].filter((t): t is { szoveg: string; kiemelt: boolean } => Boolean(t));

    // Ha a cím már a típussal kezdődik (pl. „Etetés — Nagy-tó”), a típus-badge felesleges.
    const cimbenATipus = [tipusCimke, e.tipusCimke].some((c) => c && e.cim.startsWith(c));

    return (
        <li className={cn("flex gap-3 py-4", !e.ervenyes && "opacity-75")}>
            <span
                className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                    e.ervenyes ? meta.ikonOsztaly : "bg-muted text-muted-foreground"
                )}
            >
                <Ikon className="size-4" aria-hidden="true" />
            </span>

            <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className={cn("font-semibold", !e.ervenyes && "line-through decoration-muted-foreground/60")}>{e.cim}</p>
                    {!cimbenATipus && <Badge variant="outline" className="font-medium">{tipusCimke}</Badge>}
                    {!e.ervenyes && <Badge variant="danger">Érvénytelenítve</Badge>}
                </div>

                {tenyek.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        {tenyek.map((t, i) => (
                            <span key={i}>
                                {i > 0 && <span aria-hidden="true"> · </span>}
                                <span className={t.kiemelt ? "font-medium text-foreground tabular-nums" : undefined}>{t.szoveg}</span>
                            </span>
                        ))}
                    </p>
                )}

                {e.leiras && (
                    <p className={cn("text-sm text-muted-foreground", !e.ervenyes && "line-through")}>{e.leiras}</p>
                )}

                {!e.ervenyes && (
                    <div className="mt-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs">
                        <span className="font-semibold text-destructive">Érvénytelenítve</span>
                        <span className="text-muted-foreground">
                            {e.ervenytelenitveAt && <> · {idoSzoveg(e.ervenytelenitveAt)}</>}
                            {e.ervenytelenitoNev && <> · {e.ervenytelenitoNev}</>}
                        </span>
                        {e.ervenytelenitesOka && <p className="mt-0.5 text-foreground">Indok: {e.ervenytelenitesOka}</p>}
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    <time dateTime={e.datum}>
                        {new Date(e.datum).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                    {" · "}
                    {e.rogzitoNev ?? "Rögzítő: nincs adat"}
                    {e.szerkesztveAt && (
                        <span className="italic">
                            {" · "}szövege javítva {idoSzoveg(e.szerkesztveAt)}{e.szerkesztoNev ? ` (${e.szerkesztoNev})` : ""}
                        </span>
                    )}
                </p>
            </div>

            {canModosit && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`Műveletek: ${e.cim}`}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={onSzerkeszt}>
                            <Pencil />
                            Szöveg javítása
                        </DropdownMenuItem>
                        {e.ervenyes ? (
                            <DropdownMenuItem variant="destructive" onSelect={onErvenytelenit}>
                                <Ban />
                                Érvénytelenítés
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onSelect={onVisszaallit}>
                                <RotateCcw />
                                Visszaállítás érvényesre
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </li>
    );
}
