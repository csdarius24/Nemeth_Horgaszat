import type { CiklusOsszegzes as Osszegzes } from "@/lib/halkeltes/szamitas";

import { fmt } from "./halkeltes";

/** Ciklus-összegzés: ikrás / tejes összesítő és az oltandó mennyiség (ráhagyással). */
export function CiklusOsszegzesPanel({ o, cim = "Összegzés" }: { o: Osszegzes; cim?: string }) {
    return (
        <section className="grid gap-3 rounded-xl border bg-muted/40 p-4" aria-label={cim}>
            <p className="text-sm font-semibold">{cim}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-xs text-muted-foreground">Ikrás (nőstény)</dt>
                    <dd className="font-medium tabular-nums">{o.ikrasDarab} db · {fmt(o.ikrasOsszKg, "kg")}</dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">
                        előadag {fmt(o.ikrasEloadagOsszMg, "mg")} · döntő {fmt(o.ikrasDontoOsszMg, "mg")} · {fmt(o.ikrasOsszMl, "ml")}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Tejes (hím)</dt>
                    <dd className="font-medium tabular-nums">{o.tejesDarab} db · {fmt(o.tejesOsszKg, "kg")}</dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">{fmt(o.tejesOsszMg, "mg")} · {fmt(o.tejesOsszMl, "ml")}</dd>
                </div>
            </dl>
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                <span className="font-medium text-primary">Oltandó (×{fmt(o.rahagyasSzorzo)} ráhagyással)</span>
                <span className="font-semibold tabular-nums">
                    előadag {fmt(o.oltandoEloadagMg, "mg")} · döntő {fmt(o.oltandoDontoMg, "mg")}
                </span>
            </div>
            {o.ikraOsszKg > 0 && <p className="text-xs text-muted-foreground">Ikra összesen: {fmt(o.ikraOsszKg, "kg")}</p>}
        </section>
    );
}
