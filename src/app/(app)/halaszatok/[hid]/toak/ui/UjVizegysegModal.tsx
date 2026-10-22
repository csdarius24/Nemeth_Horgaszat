"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";

export const VIZEGYSEG_TIPUSOK = [
    { ertek: "TO", cimke: "Tó" },
    { ertek: "TELELO", cimke: "Telelő" },
    { ertek: "IVADEKNEVELO", cimke: "Ivadéknevelő" },
    { ertek: "KELTETO_MEDENCE", cimke: "Keltető medence" },
] as const;

/** Opcionális szám mező mértékegységgel (ha, m, kg). */
function SzamMezo({ id, cimke, egyseg, ertek, onChange, disabled }: {
    id: string;
    cimke: string;
    egyseg: string;
    ertek: string;
    onChange: (v: string) => void;
    disabled: boolean;
}) {
    return (
        <Field>
            <FieldLabel htmlFor={id}>{cimke}</FieldLabel>
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
                    placeholder="–"
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>{egyseg}</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}

/**
 * Új vízegység (tó, telelő, ivadéknevelő, keltető medence) létrehozása.
 * Közös a Tavak oldalon és a Dashboardon, hogy mindkét helyen ugyanazt tudja.
 */
export function UjVizegysegModal({
    hid,
    open,
    onOpenChange,
    onLetrehozva,
}: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLetrehozva?: () => void;
}) {
    const [nev, setNev] = useState("");
    const [tipus, setTipus] = useState("TO");
    const [teruletHa, setTeruletHa] = useState("");
    const [melyseg, setMelyseg] = useState("");
    const [kapacitas, setKapacitas] = useState("");
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    function alaphelyzet() {
        setNev("");
        setTipus("TO");
        setTeruletHa("");
        setMelyseg("");
        setKapacitas("");
        setHiba(null);
    }

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (nev.trim().length < 2) { setHiba("A név legalább 2 karakter legyen."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev: nev.trim(),
                    tipus,
                    teruletHa: teruletHa || null,
                    atlagMelysegMeter: melyseg || null,
                    kapacitasKg: kapacitas || null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.hiba ?? json?.error ?? "Nem sikerült létrehozni."); return; }
            toast.success("Vízegység létrehozva", { description: nev.trim() });
            alaphelyzet();
            onOpenChange(false);
            onLetrehozva?.();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(nyitva) => {
                if (!nyitva) setHiba(null);
                onOpenChange(nyitva);
            }}
            title="Új vízegység"
            description="Tó, telelő, ivadéknevelő vagy keltető medence."
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="uj-vizegyseg" loading={saving}>Létrehozás</Button>
                </>
            }
        >
            <form id="uj-vizegyseg" onSubmit={kuldes}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                        <Field data-invalid={!!hiba || undefined}>
                            <FieldLabel htmlFor="vizegyseg-nev">Név</FieldLabel>
                            <Input
                                id="vizegyseg-nev"
                                value={nev}
                                onChange={(e) => setNev(e.target.value)}
                                placeholder="pl. Nagy-tó"
                                disabled={saving}
                                aria-invalid={!!hiba || undefined}
                                autoFocus
                                required
                                minLength={2}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="vizegyseg-tipus">Típus</FieldLabel>
                            <NativeSelect
                                id="vizegyseg-tipus"
                                value={tipus}
                                onChange={(e) => setTipus(e.target.value)}
                                disabled={saving}
                            >
                                {VIZEGYSEG_TIPUSOK.map((t) => (
                                    <NativeSelectOption key={t.ertek} value={t.ertek}>{t.cimke}</NativeSelectOption>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <SzamMezo id="vizegyseg-terulet" cimke="Terület" egyseg="ha" ertek={teruletHa} onChange={setTeruletHa} disabled={saving} />
                        <SzamMezo id="vizegyseg-melyseg" cimke="Átl. mélység" egyseg="m" ertek={melyseg} onChange={setMelyseg} disabled={saving} />
                        <SzamMezo id="vizegyseg-kapacitas" cimke="Kapacitás" egyseg="kg" ertek={kapacitas} onChange={setKapacitas} disabled={saving} />
                    </div>
                    <FieldDescription>
                        A műszaki adatok opcionálisak. A kapacitásból számoljuk a telítettséget.
                    </FieldDescription>

                    {hiba && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertDescription>{hiba}</AlertDescription>
                        </Alert>
                    )}
                </FieldGroup>
            </form>
        </Modal>
    );
}
