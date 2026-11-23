"use client";

import { useId, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { keresesHiba, type GeokodTalalat } from "@/lib/terkep/geokod";
import { cn } from "@/lib/utils";

/**
 * Címkereső a térkép fölé: cím, település vagy koordináta ("47.14, 20.20").
 * Csak gombnyomásra / Enterre keres (a Nominatim szabályai nem engedik a
 * gépelés közbeni keresést). Űrlapon belül az Enter NEM küldi el az űrlapot.
 */
export default function CimKereso({ onValaszt, disabled, className }: {
    onValaszt: (t: GeokodTalalat) => void;
    disabled?: boolean;
    className?: string;
}) {
    const listaId = useId();
    const [q, setQ] = useState("");
    const [toltes, setToltes] = useState(false);
    const [talalatok, setTalalatok] = useState<GeokodTalalat[] | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);

    async function keres() {
        const h = keresesHiba(q);
        if (h) { setHiba(h); setTalalatok(null); return; }
        setToltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/geokod?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) { setHiba(json?.hiba ?? "A keresés nem sikerült."); setTalalatok(null); return; }
            const lista = (json?.talalatok ?? []) as GeokodTalalat[];
            if (lista.length === 1) {
                // Egyértelmű találat: rögtön oda ugrunk.
                valaszt(lista[0]);
                return;
            }
            setTalalatok(lista);
            if (lista.length === 0) setHiba("Nincs találat. Próbáld pontosabban (pl. település, utca).");
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setToltes(false);
        }
    }

    function valaszt(t: GeokodTalalat) {
        setTalalatok(null);
        setHiba(null);
        onValaszt(t);
    }

    return (
        <div className={cn("relative grid gap-1.5", className)}>
            <div className="flex gap-2">
                <InputGroup>
                    <InputGroupAddon>
                        <Search aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault(); // ne küldje el a befoglaló űrlapot
                                void keres();
                            }
                        }}
                        placeholder="Cím, település vagy koordináta (pl. 47.14, 20.20)"
                        aria-label="Cím keresése a térképen"
                        aria-controls={talalatok?.length ? listaId : undefined}
                        disabled={disabled}
                    />
                </InputGroup>
                <Button type="button" variant="outline" onClick={() => void keres()} loading={toltes} disabled={disabled}>
                    Keresés
                </Button>
            </div>

            {hiba && <p className="text-sm text-muted-foreground" role="status">{hiba}</p>}

            {talalatok && talalatok.length > 1 && (
                <ul
                    id={listaId}
                    className="absolute top-full right-0 left-0 z-[1100] mt-1 max-h-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
                    aria-label="Találatok"
                >
                    {talalatok.map((t, i) => (
                        <li key={`${t.lat},${t.lng},${i}`}>
                            <button
                                type="button"
                                onClick={() => valaszt(t)}
                                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
                            >
                                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span>{t.nev}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
