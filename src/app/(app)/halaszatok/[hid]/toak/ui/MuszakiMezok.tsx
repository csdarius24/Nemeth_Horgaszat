"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { bevitelKgBan, kgToTonna, type TomegEgyseg } from "@/lib/toak/kapacitas";

/** Szám mező mértékegységgel (ha, m, m³, kg). */
export function SzamMezo({ id, cimke, egyseg, ertek, onChange, disabled, required, leiras }: {
    id: string;
    cimke: string;
    egyseg: string;
    ertek: string;
    onChange: (v: string) => void;
    disabled: boolean;
    required?: boolean;
    leiras?: React.ReactNode;
}) {
    return (
        <Field>
            <FieldLabel htmlFor={id}>
                {cimke}
                {required && <span className="text-destructive" aria-hidden="true">*</span>}
            </FieldLabel>
            <InputGroup>
                <InputGroupInput
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={ertek}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    required={required}
                    placeholder="–"
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>{egyseg}</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
            {leiras && <FieldDescription>{leiras}</FieldDescription>}
        </Field>
    );
}

/**
 * Eltartóképesség (max. tervezett halállomány) kg-ban VAGY tonnában.
 * Egységváltáskor a beírt értéket átváltja, alatta a másik egységben is mutatja.
 */
export function EltartokepessegMezo({ ertek, egyseg, onChange, disabled }: {
    ertek: string;
    egyseg: TomegEgyseg;
    onChange: (ertek: string, egyseg: TomegEgyseg) => void;
    disabled: boolean;
}) {
    const kg = bevitelKgBan(ertek, egyseg);

    function egysegValtas(uj: TomegEgyseg) {
        if (uj === egyseg) return;
        if (kg == null) { onChange(ertek, uj); return; }
        onChange(String(uj === "t" ? kgToTonna(kg) : kg), uj);
    }

    return (
        <Field>
            <FieldLabel htmlFor="eltartokepesseg">Eltartóképesség (max. tervezett állomány)</FieldLabel>
            <div className="flex gap-2">
                <InputGroup>
                    <InputGroupInput
                        id="eltartokepesseg"
                        type="number"
                        inputMode="decimal"
                        step={egyseg === "t" ? "0.001" : "0.01"}
                        min="0"
                        value={ertek}
                        onChange={(e) => onChange(e.target.value, egyseg)}
                        disabled={disabled}
                        placeholder="–"
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>{egyseg === "t" ? "tonna" : "kg"}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={egyseg}
                    onValueChange={(v) => v && egysegValtas(v as TomegEgyseg)}
                    aria-label="Mértékegység"
                    disabled={disabled}
                >
                    <ToggleGroupItem value="kg">kg</ToggleGroupItem>
                    <ToggleGroupItem value="t">t</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <FieldDescription>
                {kg != null
                    ? `= ${kg.toLocaleString("hu-HU")} kg = ${kgToTonna(kg).toLocaleString("hu-HU")} tonna`
                    : "Ehhez viszonyítjuk a tényleges állományt (kihasználtság, figyelmeztetés)."}
            </FieldDescription>
        </Field>
    );
}
