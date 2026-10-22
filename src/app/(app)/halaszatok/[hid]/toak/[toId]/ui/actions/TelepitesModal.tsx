"use client";

import { useEffect, useState } from "react";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";

import { HibaAlert, MertekegysegesInput } from "@/components/app/urlap";

import { apiHiba, MuveletLablec, type MuveletModalProps } from "./kozos";

type Halfaj = { azonosito: number; nev: string };

export default function TelepitesModal({ open, onOpenChange, hid, toId, onMentve }: MuveletModalProps) {
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);
    const [halfajBetoltve, setHalfajBetoltve] = useState(false);
    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState("100");
    const [minKg, setMinKg] = useState("");
    const [maxKg, setMaxKg] = useState("");
    const [forras, setForras] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setErr(null);
        setHalfajBetoltve(false);
        fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                const items: Halfaj[] = j?.items ?? j ?? [];
                setHalfajok(items);
                if (items.length) setHalfajId((prev) => (prev ? prev : items[0].azonosito));
            })
            .catch(() => {})
            .finally(() => setHalfajBetoltve(true));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const darabSzam = Math.floor(Number(darab));
        const min = Number(minKg.replace(",", "."));
        const max = Number(maxKg.replace(",", "."));
        if (!Number.isFinite(darabSzam) || darabSzam <= 0) return setErr("A darabszám legyen pozitív egész.");
        if (min > 0 && max > 0 && min > max) return setErr("A minimum tömeg nem lehet nagyobb a maximumnál.");

        setSaving(true);
        setErr(null);
        try {
            const payload: Record<string, unknown> = {
                halfajId,
                darab: darabSzam,
                forras: forras || null,
                megjegyzes: megjegyzes || null,
            };

            if (min > 0 && max > 0) {
                payload.minTomegKg = min;
                payload.maxTomegKg = max;
            }

            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/telepites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiHiba(json, "Hiba a telepítés mentésekor."));

            const nev = halfajok.find((h) => h.azonosito === halfajId)?.nev;
            toast.success("Telepítés rögzítve", { description: `${darabSzam.toLocaleString("hu-HU")} db ${nev ?? ""}`.trim() });
            onOpenChange(false);
            await onMentve();
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    const nincsHalfaj = halfajBetoltve && halfajok.length === 0;

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Hal telepítése"
            description="Válassz halfajt, add meg a darabszámot és opcionálisan a tömegtartományt."
            preventClose={saving}
            footer={<MuveletLablec formId="telepites-urlap" saving={saving} onMegse={() => onOpenChange(false)} disabled={!halfajId} />}
        >
            <form id="telepites-urlap" onSubmit={submit}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="telepites-halfaj">Halfaj</FieldLabel>
                            <NativeSelect
                                id="telepites-halfaj"
                                value={halfajId}
                                onChange={(e) => setHalfajId(Number(e.target.value))}
                                disabled={saving || halfajok.length === 0}
                            >
                                {halfajok.length ? (
                                    halfajok.map((h) => (
                                        <NativeSelectOption key={h.azonosito} value={h.azonosito}>{h.nev}</NativeSelectOption>
                                    ))
                                ) : (
                                    <NativeSelectOption value={0}>{halfajBetoltve ? "Nincs halfaj" : "Betöltés…"}</NativeSelectOption>
                                )}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="telepites-darab">Darabszám</FieldLabel>
                            <MertekegysegesInput
                                id="telepites-darab"
                                egyseg="db"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                value={darab}
                                onChange={(e) => setDarab(e.target.value)}
                                disabled={saving}
                                required
                            />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel>Tömegtartomány (egyedenként, opcionális)</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                            <MertekegysegesInput
                                aria-label="Minimum tömeg"
                                egyseg="kg"
                                step="0.01"
                                min={0}
                                placeholder="min"
                                value={minKg}
                                onChange={(e) => setMinKg(e.target.value)}
                                disabled={saving}
                            />
                            <MertekegysegesInput
                                aria-label="Maximum tömeg"
                                egyseg="kg"
                                step="0.01"
                                min={0}
                                placeholder="max"
                                value={maxKg}
                                onChange={(e) => setMaxKg(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <FieldDescription>Ebből becsüljük a tó halállományát kilogrammban.</FieldDescription>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="telepites-forras">Forrás (opcionális)</FieldLabel>
                            <Input id="telepites-forras" value={forras} onChange={(e) => setForras(e.target.value)} disabled={saving} placeholder="pl. saját keltető" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="telepites-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                            <Input id="telepites-megjegyzes" value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={saving} />
                        </Field>
                    </div>

                    {nincsHalfaj && (
                        <FieldDescription>
                            Nincs halfaj ehhez a halászathoz. Előbb vegyél fel halfajt a <a href={`/halaszatok/${hid}/halfajok`}>Halfajok</a> oldalon.
                        </FieldDescription>
                    )}
                    <HibaAlert uzenet={err} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
