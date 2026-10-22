"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { fmtMennyiseg, type Mozgas, type Takarmany } from "./takarmany";

const CHART_CONFIG = {
    be: { label: "Bevétel", color: "var(--success)" },
    ki: { label: "Felhasználás", color: "var(--warning)" },
};

/** Egy takarmány mozgásainak listája + az utolsó 20 mozgás grafikonja. */
export function MozgasNaploModal({ hid, takarmany, onOpenChange }: {
    hid: string;
    takarmany: Takarmany | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [mozgasok, setMozgasok] = useState<Mozgas[] | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);
    const [ujra, setUjra] = useState(0);
    const id = takarmany?.azonosito;

    useEffect(() => {
        if (id == null) return;
        let aktiv = true;
        setMozgasok(null);
        setHiba(null);
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${id}/mozgasok`, { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? "Nem sikerült betölteni a mozgásokat.");
                if (aktiv) setMozgasok(data.mozgasok ?? []);
            } catch (e) {
                if (aktiv) setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
            }
        })();
        return () => { aktiv = false; };
    }, [hid, id, ujra]);

    if (!takarmany) return null;

    const chartAdat = (mozgasok ?? []).slice(0, 20).reverse().map((m) => ({
        datum: new Date(m.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
        be: m.tipus === "BEVETEL" ? Number(m.mennyiseg) : 0,
        ki: m.tipus === "FELHASZNALVA" ? Number(m.mennyiseg) : 0,
    }));

    return (
        <Modal
            open
            onOpenChange={onOpenChange}
            size="lg"
            title={`Mozgásnapló — ${takarmany.nev}`}
            description={`Aktuális készlet: ${fmtMennyiseg(Number(takarmany.keszlet), takarmany.egyseg)}`}
        >
            <div className="grid gap-5">
                {hiba ? (
                    <ErrorState message={hiba} onRetry={() => setUjra((n) => n + 1)} />
                ) : mozgasok === null ? (
                    <div className="grid gap-2" role="status" aria-label="Mozgások betöltése">
                        <Skeleton className="h-40 rounded-xl" />
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                    </div>
                ) : mozgasok.length === 0 ? (
                    <EmptyState
                        className="p-6 md:p-8"
                        icon={<History />}
                        title="Még nincs mozgás"
                        description="A bevételek, felhasználások és az etetésből származó levonások itt jelennek meg."
                    />
                ) : (
                    <>
                        {chartAdat.length > 1 && (
                            <div>
                                <p className="mb-2 text-sm font-semibold">Utolsó {chartAdat.length} mozgás</p>
                                <ChartContainer config={CHART_CONFIG} className="aspect-auto h-44 w-full">
                                    <BarChart data={chartAdat} margin={{ left: -16, right: 4 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="datum" tickLine={false} axisLine={false} minTickGap={12} />
                                        <YAxis tickLine={false} axisLine={false} width={44} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Bar dataKey="be" fill="var(--color-be)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                        <Bar dataKey="ki" fill="var(--color-ki)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Időpont</TableHead>
                                    <TableHead>Típus</TableHead>
                                    <TableHead className="text-right">Mennyiség</TableHead>
                                    <TableHead className="hidden sm:table-cell">Megjegyzés</TableHead>
                                    <TableHead className="hidden sm:table-cell">Rögzítette</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mozgasok.map((m) => {
                                    const be = m.tipus === "BEVETEL";
                                    return (
                                        <TableRow key={m.azonosito}>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(m.datum).toLocaleString("hu-HU", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={be ? "success" : "warning"}>{be ? "Bevétel" : "Felhasználás"}</Badge>
                                            </TableCell>
                                            <TableCell className={be ? "text-right font-semibold text-success tabular-nums" : "text-right font-semibold text-warning tabular-nums"}>
                                                {be ? "+" : "−"}{fmtMennyiseg(Number(m.mennyiseg), takarmany.egyseg)}
                                            </TableCell>
                                            <TableCell className="hidden max-w-48 truncate text-muted-foreground sm:table-cell" title={m.megjegyzes ?? undefined}>
                                                {m.megjegyzes ?? "—"}
                                            </TableCell>
                                            <TableCell className="hidden text-muted-foreground sm:table-cell">{m.rogzitoNev ?? "—"}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </>
                )}
            </div>
        </Modal>
    );
}
