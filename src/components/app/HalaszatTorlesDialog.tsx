"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { torlesNevEgyezik, torlesTetelek, type TorlesElonezet } from "@/lib/halaszat/torles";

/**
 * Halászat VÉGLEGES törlése — kétlépcsős megerősítéssel:
 *  1. lépés: mi fog törlődni (darabszámokkal) → „Tovább a törléshez”
 *  2. lépés: a halászat pontos nevének begépelése → „Végleges törlés”
 * Az AlertDialog nem zárul be mellékattintásra; a fókusz a „Mégse” gombon kezd.
 * A nevet a szerver is ellenőrzi.
 */
export function HalaszatTorlesDialog({ halaszatId, nev, open, onOpenChange, onTorolve }: {
    halaszatId: number;
    nev: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTorolve: () => void;
}) {
    const [lepes, setLepes] = useState<1 | 2>(1);
    const [elonezet, setElonezet] = useState<TorlesElonezet | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);
    const [beirt, setBeirt] = useState("");
    const [torles, setTorles] = useState(false);

    // Minden megnyitás az első lépésről, üres mezővel indul.
    useEffect(() => {
        if (!open) return;
        setLepes(1);
        setBeirt("");
        setHiba(null);
        setElonezet(null);
        fetch(`/api/halaszatok/${halaszatId}/torles`, { cache: "no-store" })
            .then(async (r) => {
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error(j?.error ?? "Nem sikerült lekérni a törlés előnézetét.");
                setElonezet(j.elonezet as TorlesElonezet);
            })
            .catch((e) => setHiba(e instanceof Error ? e.message : "Ismeretlen hiba"));
    }, [open, halaszatId]);

    const egyezik = torlesNevEgyezik(beirt, nev);

    async function vegrehajt() {
        if (!egyezik) return;
        setTorles(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${halaszatId}/torles`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ megerositoNev: beirt }),
            });
            const j = await res.json().catch(() => null);
            if (!res.ok) { setHiba(j?.error ?? "Nem sikerült törölni."); return; }
            toast.success("Halászat törölve", { description: nev });
            onOpenChange(false);
            onTorolve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setTorles(false);
        }
    }

    const tetelek = elonezet ? torlesTetelek(elonezet) : [];

    return (
        <AlertDialog open={open} onOpenChange={(o) => !torles && onOpenChange(o)}>
            <AlertDialogContent>
                {lepes === 1 ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
                                Törlöd a(z) „{nev}” halászatot?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                A törlés <strong>végleges, nem vonható vissza</strong>. A halászattal együtt törlődik:
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {hiba ? (
                            <Alert variant="destructive"><AlertDescription>{hiba}</AlertDescription></Alert>
                        ) : !elonezet ? (
                            <div className="grid gap-2" role="status" aria-label="Előnézet betöltése">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ) : (
                            <ul className="grid list-disc gap-1 pl-5 text-sm">
                                {tetelek.length > 0 ? tetelek.map((t) => <li key={t}>{t}</li>) : <li>a halászat (még nincs benne adat)</li>}
                            </ul>
                        )}

                        <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <Button variant="destructive" onClick={() => setLepes(2)} disabled={!!hiba || !elonezet}>
                                Tovább a törléshez
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <Trash2 className="size-5 text-destructive" aria-hidden="true" />
                                Utolsó megerősítés
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                A végleges törléshez írd be a halászat pontos nevét: <strong className="text-foreground">{nev}</strong>
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <form
                            id="halaszat-torles"
                            onSubmit={(e) => { e.preventDefault(); void vegrehajt(); }}
                        >
                            <Field>
                                <FieldLabel htmlFor="halaszat-torles-nev" className="sr-only">A halászat neve</FieldLabel>
                                <Input
                                    id="halaszat-torles-nev"
                                    value={beirt}
                                    onChange={(e) => setBeirt(e.target.value)}
                                    placeholder={nev}
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={torles}
                                    aria-invalid={beirt.length > 0 && !egyezik ? true : undefined}
                                    // A mező NEM kap automatikus fókuszt és beillesztés-tiltás sincs:
                                    // a szándékos begépelés a cél, nem a nehezítés.
                                />
                                <FieldDescription>
                                    {beirt.length > 0 && !egyezik ? "A név nem egyezik (a kis- és nagybetű is számít)." : "A kis- és nagybetű is számít."}
                                </FieldDescription>
                            </Field>
                        </form>

                        {hiba && <Alert variant="destructive"><AlertDescription>{hiba}</AlertDescription></Alert>}

                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={torles}>Mégse</AlertDialogCancel>
                            <Button type="submit" form="halaszat-torles" variant="destructive" disabled={!egyezik} loading={torles}>
                                <Trash2 />
                                Végleges törlés
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
}
