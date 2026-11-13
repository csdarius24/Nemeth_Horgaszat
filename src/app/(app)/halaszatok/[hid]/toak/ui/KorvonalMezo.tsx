"use client";

import { useMemo } from "react";
import { ArrowDownToLine, MapPin } from "lucide-react";

import { KorvonalRajzolo, type ReferenciaTo } from "@/components/terkep";
import { useTerkepAdat } from "@/components/terkep/useTerkepAdat";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { poligonTeruletM2, rajzoltTeruletSzoveg, type PoligonGeometria } from "@/lib/terkep/geo";
import { M2_PER_HA } from "@/lib/toak/terulet";

/**
 * Tóegység körvonala a térképen (kötelező). A halgazdaság helye és a többi tó
 * körvonala tájékozódásként látszik. A rajzolt terület átvehető a „Terület” mezőbe.
 */
export function KorvonalMezo({ hid, ertek, onChange, tipus, kizartToId, onTeruletAtvetel, nyitva = true }: {
    hid: string;
    ertek: PoligonGeometria | null;
    onChange: (g: PoligonGeometria | null) => void;
    tipus: string;
    /** Szerkesztésnél a saját tó ne jelenjen meg referenciaként. */
    kizartToId?: number;
    /** A rajzolt terület (ha) átvétele a terület-mezőbe. */
    onTeruletAtvetel?: (ha: number) => void;
    /** Csak nyitott modálnál töltsön adatot. */
    nyitva?: boolean;
}) {
    const { adat, hely } = useTerkepAdat(hid, nyitva);

    const referenciak: ReferenciaTo[] = useMemo(
        () => (adat?.toak ?? [])
            .filter((t) => t.azonosito !== kizartToId)
            .map((t) => ({ azonosito: t.azonosito, nev: t.nev, tipus: t.tipus, korvonal: t.korvonal })),
        [adat, kizartToId]
    );

    const teruletM2 = ertek ? poligonTeruletM2(ertek) : null;

    return (
        <Field>
            <FieldLabel>
                Körvonal a térképen
                <span className="text-destructive" aria-hidden="true">*</span>
            </FieldLabel>
            {/* Az adat betöltéséig nem rajzoljuk ki, hogy a térkép a halgazdaság helyén nyíljon. */}
            {nyitva && adat ? (
                <KorvonalRajzolo ertek={ertek} onChange={onChange} kozep={hely} referenciak={referenciak} tipus={tipus} />
            ) : (
                <div className="h-80 w-full animate-pulse rounded-xl border bg-muted sm:h-96" aria-label="Térkép betöltése" />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                {teruletM2 != null ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-4 text-primary" aria-hidden="true" />
                        Rajzolt terület: <span className="font-medium text-foreground tabular-nums">{rajzoltTeruletSzoveg(teruletM2)}</span>
                    </span>
                ) : (
                    <span className="text-muted-foreground">Még nincs körvonal.</span>
                )}
                {teruletM2 != null && onTeruletAtvetel && (
                    <Button type="button" variant="outline" size="sm" onClick={() => onTeruletAtvetel(Math.round((teruletM2 / M2_PER_HA) * 10_000) / 10_000)}>
                        <ArrowDownToLine />
                        Átvétel területnek
                    </Button>
                )}
            </div>
            <FieldDescription>
                A bal oldali eszköztáron a <strong>sokszög</strong> ikonnal kattintgatva rajzold körbe a tavat, majd kattints
                az első pontra a lezáráshoz. Utána a <strong>szerkesztés</strong> ikonnal a pontok húzhatók. A jobb felső
                sarokban válthatsz térkép és műholdkép között.
            </FieldDescription>
        </Field>
    );
}
