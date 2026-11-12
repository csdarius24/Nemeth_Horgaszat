"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { bevitelKgBan, kgToTonna, type TomegEgyseg } from "@/lib/toak/kapacitas";
import { bevitelHaBan, haToM2, type TeruletEgyseg } from "@/lib/toak/terulet";

// MEGJEGYZÉS: a számmezőkön `step="any"` van — fix lépésköz (pl. 0.01) mellett a
// böngésző érvénytelennek jelölné a több tizedest (pl. 0,175 ha), és nem küldené el
// az űrlapot. A kerekítést a szerver / a tiszta helperek végzik.

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
                    step="any"
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

type EgysegOpcio<E extends string> = { ertek: E; gomb: string; utotag: string };

/**
 * Szám mező, amelynek mértékegysége gombbal váltható. Váltáskor a beírt értéket
 * átváltja (`atvalt`), alatta pedig `leiras` mutatja a másik egységet.
 */
function EgysegValtoMezo<E extends string>({ id, cimke, ertek, egyseg, opciok, atvalt, leiras, onChange, disabled }: {
    id: string;
    cimke: string;
    ertek: string;
    egyseg: E;
    opciok: [EgysegOpcio<E>, EgysegOpcio<E>];
    atvalt: (ertek: string, honnan: E, hova: E) => string;
    leiras: React.ReactNode;
    onChange: (ertek: string, egyseg: E) => void;
    disabled: boolean;
}) {
    const aktualis = opciok.find((o) => o.ertek === egyseg) ?? opciok[0];
    return (
        <Field>
            <FieldLabel htmlFor={id}>{cimke}</FieldLabel>
            <div className="flex gap-2">
                <InputGroup>
                    <InputGroupInput
                        id={id}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={ertek}
                        onChange={(e) => onChange(e.target.value, egyseg)}
                        disabled={disabled}
                        placeholder="–"
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>{aktualis.utotag}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={egyseg}
                    onValueChange={(v) => {
                        if (!v || v === egyseg) return;
                        onChange(atvalt(ertek, egyseg, v as E), v as E);
                    }}
                    aria-label={`${cimke} mértékegysége`}
                    disabled={disabled}
                >
                    {opciok.map((o) => <ToggleGroupItem key={o.ertek} value={o.ertek}>{o.gomb}</ToggleGroupItem>)}
                </ToggleGroup>
            </div>
            <FieldDescription>{leiras}</FieldDescription>
        </Field>
    );
}

/** Terület hektárban VAGY m²-ben (tárolás: ha, 4 tizedes). */
export function TeruletMezo({ id = "terulet", ertek, egyseg, onChange, disabled }: {
    id?: string;
    ertek: string;
    egyseg: TeruletEgyseg;
    onChange: (ertek: string, egyseg: TeruletEgyseg) => void;
    disabled: boolean;
}) {
    const ha = bevitelHaBan(ertek, egyseg);
    return (
        <EgysegValtoMezo
            id={id}
            cimke="Terület"
            ertek={ertek}
            egyseg={egyseg}
            opciok={[
                { ertek: "ha", gomb: "ha", utotag: "ha" },
                { ertek: "m2", gomb: "m²", utotag: "m²" },
            ]}
            atvalt={(e, honnan, hova) => {
                const h = bevitelHaBan(e, honnan);
                if (h == null) return e;
                return String(hova === "m2" ? haToM2(h) : h);
            }}
            leiras={ha != null
                ? `= ${ha.toLocaleString("hu-HU", { maximumFractionDigits: 4 })} ha = ${haToM2(ha).toLocaleString("hu-HU")} m²`
                : "Hektárban vagy négyzetméterben (pl. 0,175 ha = 1750 m²)."}
            onChange={onChange}
            disabled={disabled}
        />
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
    return (
        <EgysegValtoMezo
            id="eltartokepesseg"
            cimke="Eltartóképesség (max. tervezett állomány)"
            ertek={ertek}
            egyseg={egyseg}
            opciok={[
                { ertek: "kg", gomb: "kg", utotag: "kg" },
                { ertek: "t", gomb: "t", utotag: "tonna" },
            ]}
            atvalt={(e, honnan, hova) => {
                const k = bevitelKgBan(e, honnan);
                if (k == null) return e;
                return String(hova === "t" ? kgToTonna(k) : k);
            }}
            leiras={kg != null
                ? `= ${kg.toLocaleString("hu-HU")} kg = ${kgToTonna(kg).toLocaleString("hu-HU")} tonna`
                : "Ehhez viszonyítjuk a tényleges állományt (kihasználtság, figyelmeztetés)."}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
