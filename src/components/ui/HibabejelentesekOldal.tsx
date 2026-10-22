"use client";

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

type Hibabejelentes = {
    azonosito: number;
    targy: string;
    leiras: string;
    oldalUrl: string | null;
    statusz: "UJ" | "FOLYAMATBAN" | "MEGOLDVA" | "ELUTASITVA";
    letrehozva: string;
    felhasznalo: {
        azonosito: number;
        nev: string | null;
        email: string;
    } | null;
};

export default function HibabejelentesekOldal({ hid }: { hid: string }) {
    const [adatok, setAdatok] = useState<Hibabejelentes[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState("");

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setHiba("");

                const res = await fetch(`/api/halaszatok/${hid}/hibabejelentesek`, {
                    cache: "no-store",
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.hiba || "Lekérési hiba");
                }

                if (!mounted) return;
                setAdatok(data?.adatok ?? []);
            } catch (err) {
                if (!mounted) return;
                setHiba(err instanceof Error ? err.message : "Ismeretlen hiba");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [hid]);

    // Státuszokhoz tartozó vizuális jelzések a Select mezőhöz
    const statuszSzinek: Record<Hibabejelentes["statusz"], string> = {
        UJ: "text-primary",
        FOLYAMATBAN: "text-warning",
        MEGOLDVA: "text-success",
        ELUTASITVA: "text-muted-foreground",
    };

    async function statuszValtas(sor: Hibabejelentes, ujStatusz: Hibabejelentes["statusz"]) {
        try {
            const res = await fetch(`/api/hibabejelentesek/${sor.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusz: ujStatusz }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.hiba || "Nem sikerült frissíteni a státuszt.");
            }

            setAdatok((elozo) =>
                elozo.map((elem) =>
                    elem.azonosito === sor.azonosito ? { ...elem, statusz: ujStatusz } : elem
                )
            );
            toast.success("Státusz frissítve");
        } catch (err) {
            toast.error("Nem sikerült a státuszváltás", {
                description: err instanceof Error ? err.message : "Ismeretlen hiba",
            });
        }
    }

    return (
        <div>
            <PageHeader
                title="Hibabejelentések"
                description="Az adott halászathoz tartozó beküldött hibák és észrevételek listája."
            />

            {loading ? (
                <LoadingState text="Hibabejelentések betöltése…" />
            ) : hiba ? (
                <ErrorState message={hiba} />
            ) : adatok.length === 0 ? (
                <EmptyState
                    title="Nincs hibabejelentés"
                    description="Ehhez a halászathoz még senki nem küldött be hibajelentést vagy észrevételt."
                    icon={<Bug />}
                />
            ) : (
                <Card className="py-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dátum</TableHead>
                                <TableHead>Státusz</TableHead>
                                <TableHead>Tárgy</TableHead>
                                <TableHead>Bejelentő</TableHead>
                                <TableHead>Oldal</TableHead>
                                <TableHead>Leírás</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adatok.map((sor) => (
                                <TableRow key={sor.azonosito}>
                                    <TableCell className="font-medium text-muted-foreground">
                                        {new Date(sor.letrehozva).toLocaleString("hu-HU", {
                                            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <NativeSelect
                                            size="sm"
                                            value={sor.statusz}
                                            aria-label={`Státusz: ${sor.targy}`}
                                            className={cn("min-w-40 font-semibold", statuszSzinek[sor.statusz])}
                                            onChange={(e) => statuszValtas(sor, e.target.value as Hibabejelentes["statusz"])}
                                        >
                                            <NativeSelectOption value="UJ">Új</NativeSelectOption>
                                            <NativeSelectOption value="FOLYAMATBAN">Folyamatban</NativeSelectOption>
                                            <NativeSelectOption value="MEGOLDVA">Megoldva</NativeSelectOption>
                                            <NativeSelectOption value="ELUTASITVA">Elutasítva</NativeSelectOption>
                                        </NativeSelect>
                                    </TableCell>
                                    <TableCell className="font-semibold text-foreground">{sor.targy}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{sor.felhasznalo?.nev || "Ismeretlen"}</div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">{sor.felhasznalo?.email || "—"}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-44 truncate text-muted-foreground" title={sor.oldalUrl || ""}>
                                            {sor.oldalUrl || "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-normal">
                                        <p className="line-clamp-2 max-w-80 text-muted-foreground" title={sor.leiras}>
                                            {sor.leiras}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
