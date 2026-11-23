"use client";

import * as React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

/*
 * Kis, újrahasznosítható űrlap-elemek a modálokhoz.
 */

/** Űrlap-szintű hibaüzenet (pl. az API válasza). Üres üzenetnél nem renderel semmit. */
export function HibaAlert({ uzenet }: { uzenet: string | null }) {
    if (!uzenet) return null;
    return (
        <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{uzenet}</AlertDescription>
        </Alert>
    );
}

/** Szám bemenet mértékegységgel a mező jobb oldalán (pl. „kg”, „db”). */
export function MertekegysegesInput({
    egyseg,
    ...props
}: React.ComponentProps<typeof InputGroupInput> & { egyseg: string }) {
    return (
        <InputGroup>
            <InputGroupInput type="number" inputMode="decimal" {...props} />
            <InputGroupAddon align="inline-end">
                <InputGroupText>{egyseg}</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    );
}


/**
 * Szám bemenet VÁLASZTHATÓ mértékegységgel (pl. kg / mázsa / tonna) a mező
 * jobb szélén — ugyanaz a kinézet, mint a `MertekegysegesInput`, így a szám
 * kapja a helyet, nem egy külön legördülő doboz.
 */
export function MertekegysegValasztoInput<E extends string>({
    egyseg,
    egysegek,
    onEgysegChange,
    egysegCimke = (e) => e,
    egysegLabel,
    disabled,
    ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, "type"> & {
    egyseg: E;
    egysegek: readonly E[];
    onEgysegChange: (e: E) => void;
    egysegCimke?: (e: E) => string;
    /** A mértékegység-választó akadálymentes neve, pl. „Össztömeg mértékegysége”. */
    egysegLabel: string;
}) {
    return (
        <InputGroup data-disabled={disabled ? "true" : undefined}>
            <InputGroupInput type="number" inputMode="decimal" disabled={disabled} {...props} />
            <div className="relative order-last flex h-full shrink-0 items-center border-l border-input">
                <select
                    data-slot="input-group-control"
                    aria-label={egysegLabel}
                    value={egyseg}
                    onChange={(e) => onEgysegChange(e.target.value as E)}
                    disabled={disabled}
                    className="h-full cursor-pointer appearance-none rounded-r-lg bg-transparent pr-7 pl-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {egysegek.map((e) => (
                        <option key={e} value={e} className="bg-[Canvas] text-[CanvasText]">
                            {egysegCimke(e)}
                        </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
        </InputGroup>
    );
}
