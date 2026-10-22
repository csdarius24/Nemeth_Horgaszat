import * as React from "react";

import { cn } from "@/lib/utils";
import { esemenyMeta } from "@/components/app/esemenyek";

/**
 * Egy napló-esemény sora (ikon + cím + részletek + időpont). A Dashboard
 * „Legutóbbi tevékenységek” és a tó részletező idővonala is ezt használja.
 */
export function EsemenyElem({
    tipus,
    cimKiegeszites,
    reszletek,
    leiras,
    datum,
    rogzito,
}: {
    tipus: string;
    /** A típus után, halványan (pl. tó neve vagy halfaj). */
    cimKiegeszites?: React.ReactNode;
    /** Rövid tények (pl. „1200 db”, „35 kg”). */
    reszletek?: React.ReactNode[];
    leiras?: string | null;
    datum: string;
    rogzito?: string | null;
}) {
    const meta = esemenyMeta(tipus);
    const Ikon = meta.ikon;
    const tenyek = (reszletek ?? []).filter(Boolean);

    return (
        <li className="flex items-start gap-3 py-2.5">
            <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", meta.ikonOsztaly)}>
                <Ikon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm">
                    <span className="font-semibold">{meta.cimke}</span>
                    {cimKiegeszites && <span className="text-muted-foreground"> · {cimKiegeszites}</span>}
                    {tenyek.length > 0 && (
                        <span className="font-medium tabular-nums"> · {tenyek.map((t, i) => (
                            <React.Fragment key={i}>{i > 0 && " · "}{t}</React.Fragment>
                        ))}</span>
                    )}
                </p>
                {leiras && <p className="truncate text-sm text-muted-foreground" title={leiras}>{leiras}</p>}
                <p className="text-xs text-muted-foreground">
                    <time dateTime={datum}>
                        {new Date(datum).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </time>
                    {rogzito !== undefined && <> · {rogzito ?? "Rögzítő: nincs adat"}</>}
                </p>
            </div>
        </li>
    );
}
