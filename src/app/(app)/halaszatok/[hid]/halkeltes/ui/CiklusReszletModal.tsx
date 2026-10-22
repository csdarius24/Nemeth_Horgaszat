"use client";

import { useCallback, useEffect, useState } from "react";

import { halkeltesStatuszCimke } from "@/lib/halkeltes/szamitas";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { CiklusOsszegzesPanel } from "./CiklusOsszegzes";
import { fmt, HALKELTES_STATUSZOK, type CiklusReszlet } from "./halkeltes";

function ReszletTabla({ cim, oszlopok, sorok }: { cim: string; oszlopok: string[]; sorok: (string | number)[][] }) {
    return (
        <section className="grid gap-2" aria-label={cim}>
            <p className="text-sm font-semibold">{cim} <span className="font-normal text-muted-foreground">· {sorok.length} hal</span></p>
            {sorok.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs rögzített hal.</p>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {oszlopok.map((o, i) => <TableHead key={o} className={i >= 3 ? "text-right" : undefined}>{o}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorok.map((sor, i) => (
                                <TableRow key={i}>
                                    {sor.map((cella, j) => (
                                        <TableCell key={j} className={j >= 3 ? "text-right tabular-nums" : j === 0 ? "text-muted-foreground" : undefined}>{cella}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}

/** Egy keltetési ciklus részletei: fejadatok, státuszváltás, halankénti táblák, összegzés. */
export function CiklusReszletModal({ hid, id, onClose, onValtozas }: {
    hid: string;
    /** null = zárva */
    id: number | null;
    onClose: () => void;
    onValtozas: () => void;
}) {
    const [data, setData] = useState<CiklusReszlet | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);
    const [statuszMent, setStatuszMent] = useState(false);

    const betolt = useCallback(async () => {
        if (id == null) return;
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok/${id}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Hiba");
        }
    }, [hid, id]);

    useEffect(() => {
        setData(null);
        void betolt();
    }, [betolt]);

    async function statuszValt(uj: string) {
        if (!id || uj === data?.ciklus.statusz) return;
        setStatuszMent(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusz: uj }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült módosítani.");
            toast.success("Státusz módosítva", { description: halkeltesStatuszCimke(uj) });
            await betolt();
            onValtozas();
        } catch (e) {
            toast.error("Nem sikerült módosítani", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setStatuszMent(false);
        }
    }

    const c = data?.ciklus;

    return (
        <Modal
            open={id != null}
            onOpenChange={(v) => !v && onClose()}
            size="xl"
            title={c ? c.nev || `Ciklus #${c.id}` : "Keltetési ciklus"}
            description={
                c ? [
                    new Date(c.datum).toLocaleDateString("hu-HU"),
                    c.homersekletC != null && `${fmt(c.homersekletC)} °C`,
                    c.halfajNev,
                    c.oltasIdopont && `oltás: ${new Date(c.oltasIdopont).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
                    `rögzítette: ${c.rogzitoNev ?? "nincs adat"}`,
                ].filter(Boolean).join(" · ") : undefined
            }
        >
            {hiba ? (
                <ErrorState message={hiba} onRetry={() => betolt()} />
            ) : !data || !c ? (
                <div className="grid gap-3" role="status" aria-label="Ciklus betöltése">
                    <Skeleton className="h-10 w-72 rounded-lg" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>
            ) : (
                <div className="grid gap-5">
                    <FieldSet>
                        <FieldLegend variant="label">Státusz</FieldLegend>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={2}
                            value={c.statusz}
                            onValueChange={(v) => v && void statuszValt(v)}
                            disabled={statuszMent}
                            aria-label="Ciklus státusza"
                        >
                            {HALKELTES_STATUSZOK.map((st) => (
                                <ToggleGroupItem key={st} value={st} className="px-3">{halkeltesStatuszCimke(st)}</ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </FieldSet>

                    <ReszletTabla
                        cim="Ikrás halak"
                        oszlopok={["#", "Chip", "Fajta", "Tömeg (kg)", "Ikra (kg)", "Előadag (mg)", "Döntő (mg)", "Oldat (ml)"]}
                        sorok={data.ikrasSorok.map((s) => [s.sorszam ?? "", s.chipAzonosito ?? "—", s.fajtaJeloles ?? "—", fmt(s.tomegKg), fmt(s.ikraKg), fmt(s.szamitott.eloadagMg), fmt(s.szamitott.dontoMg), fmt(s.szamitott.ml)])}
                    />
                    <ReszletTabla
                        cim="Tejes halak"
                        oszlopok={["#", "Chip", "Fajta", "Tömeg (kg)", "Tej (ml)", "Adag (mg)", "Oldat (ml)"]}
                        sorok={data.tejesSorok.map((s) => [s.sorszam ?? "", s.chipAzonosito ?? "—", s.fajtaJeloles ?? "—", fmt(s.tomegKg), fmt(s.tejMl), fmt(s.szamitott.mg), fmt(s.szamitott.ml)])}
                    />

                    <CiklusOsszegzesPanel o={data.osszegzes} />

                    {c.megjegyzes && (
                        <p className="text-sm"><span className="text-muted-foreground">Megjegyzés:</span> {c.megjegyzes}</p>
                    )}
                </div>
            )}
        </Modal>
    );
}
