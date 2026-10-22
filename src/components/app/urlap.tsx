"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

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

