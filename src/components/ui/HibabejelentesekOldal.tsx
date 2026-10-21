"use client";

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

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
    const statuszSzinek: Record<string, string> = {
        UJ: "text-blue-600 font-semibold",
        FOLYAMATBAN: "text-amber-600 font-semibold",
        MEGOLDVA: "text-emerald-600 font-semibold",
        ELUTASITVA: "text-slate-500 font-semibold",
    };

    return (
        <div className="grid gap-6">
            
            {/* Fejléc */}
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold text-foreground">Hibabejelentések</h1>
                    <p className="text-slate-500 mt-1">
                        Az adott halászathoz tartozó beküldött hibák és észrevételek listája.
                    </p>
                </CardContent>
            </Card>

            {/* Tartalom */}
            {loading ? (
                <Card><CardContent><Loading text="Hibabejelentések betöltése..." /></CardContent></Card>
            ) : hiba ? (
                <ErrorState message={hiba} />
            ) : adatok.length === 0 ? (
                <EmptyState 
                    title="Nincs hibabejelentés" 
                    description="Ehhez a halászathoz még senki nem küldött be hibajelentést vagy észrevételt."
                    icon={<Bug />} 
                />
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Dátum</th>
                                    <th className="px-6 py-4 font-semibold">Státusz</th>
                                    <th className="px-6 py-4 font-semibold">Tárgy</th>
                                    <th className="px-6 py-4 font-semibold">Bejelentő</th>
                                    <th className="px-6 py-4 font-semibold">Oldal</th>
                                    <th className="px-6 py-4 font-semibold">Leírás</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {adatok.map((sor) => (
                                    <tr key={sor.azonosito} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                            {new Date(sor.letrehozva).toLocaleString("hu-HU", {
                                                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Select
                                                value={sor.statusz}
                                                className={`min-w-[150px] !py-2 ${statuszSzinek[sor.statusz]}`}
                                                onChange={async (e) => {
                                                    const ujStatusz = e.target.value;

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
                                                                elem.azonosito === sor.azonosito
                                                                    ? {...elem, statusz: ujStatusz as Hibabejelentes["statusz"]}
                                                                    : elem
                                                            )
                                                        );
                                                    } catch (err) {
                                                        alert(err instanceof Error ? err.message : "Ismeretlen hiba");
                                                    }
                                                }}
                                            >
                                                <option value="UJ">ÚJ</option>
                                                <option value="FOLYAMATBAN">FOLYAMATBAN</option>
                                                <option value="MEGOLDVA">MEGOLDVA</option>
                                                <option value="ELUTASITVA">ELUTASÍTVA</option>
                                            </Select>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-foreground">
                                            {sor.targy}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-slate-800">{sor.felhasznalo?.nev || "Ismeretlen"}</div>
                                            <div className="text-slate-500 text-xs mt-0.5">{sor.felhasznalo?.email || "—"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[180px] truncate text-slate-500" title={sor.oldalUrl || ""}>
                                                {sor.oldalUrl || "—"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="max-w-[320px] text-slate-600 line-clamp-2" title={sor.leiras}>
                                                {sor.leiras}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
