"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ALAP_SZIN, FELADAT_SZINEK } from "@/lib/feladatok/format";
import { SzinValaszto } from "@/components/app/SzinValaszto";
import { HibaAlert } from "@/components/app/urlap";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { PRIORITASOK, type Tag, type ToOpcio } from "./feladat";

const SZIN_NEV: Record<string, string> = {
    "#2563eb": "Kék", "#16a34a": "Zöld", "#f59e0b": "Borostyán", "#dc2626": "Piros",
    "#7c3aed": "Lila", "#0891b2": "Cián", "#64748b": "Pala",
};

export function UjFeladatModal({ hid, open, onOpenChange, tagok, toak, onLetrehozva }: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tagok: Tag[];
    toak: ToOpcio[];
    onLetrehozva: () => void;
}) {
    const [cim, setCim] = useState("");
    const [leiras, setLeiras] = useState("");
    const [felelos, setFelelos] = useState("");
    const [toId, setToId] = useState("");
    const [hatarido, setHatarido] = useState("");
    const [prioritas, setPrioritas] = useState("NORMAL");
    const [szin, setSzin] = useState<string>(ALAP_SZIN);
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    function alaphelyzet() {
        setCim(""); setLeiras(""); setFelelos(""); setToId(""); setHatarido("");
        setPrioritas("NORMAL"); setSzin(ALAP_SZIN); setHiba(null);
    }

    async function mentes(e: React.FormEvent) {
        e.preventDefault();
        if (cim.trim().length < 2) return setHiba("A cím legalább 2 karakter legyen.");
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/feladatok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cim: cim.trim(),
                    leiras: leiras.trim() || null,
                    felelosFelhasznaloId: felelos || null,
                    toId: toId || null,
                    hatarido: hatarido || null,
                    prioritas,
                    szin,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return setHiba(json?.error ?? "Nem sikerült menteni.");
            toast.success("Feladat létrehozva", { description: cim.trim() });
            alaphelyzet();
            onOpenChange(false);
            onLetrehozva();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(v) => { if (!v) setHiba(null); onOpenChange(v); }}
            title="Új feladat"
            description="A kiosztott feladat a felelősnél és a Halászati naplóban is megjelenik."
            size="lg"
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="uj-feladat" loading={saving}>Létrehozás</Button>
                </>
            }
        >
            <form id="uj-feladat" onSubmit={mentes}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="feladat-cim">Cím</FieldLabel>
                        <Input
                            id="feladat-cim"
                            value={cim}
                            onChange={(e) => setCim(e.target.value)}
                            placeholder="pl. Oxigénszint mérése a Nagy-tavon"
                            disabled={saving}
                            required
                            minLength={2}
                            autoFocus
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="feladat-leiras">Leírás (opcionális)</FieldLabel>
                        <Textarea id="feladat-leiras" rows={3} value={leiras} onChange={(e) => setLeiras(e.target.value)} disabled={saving} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field>
                            <FieldLabel htmlFor="feladat-felelos">Felelős</FieldLabel>
                            <NativeSelect id="feladat-felelos" value={felelos} onChange={(e) => setFelelos(e.target.value)} disabled={saving}>
                                <NativeSelectOption value="">Nincs kiosztva</NativeSelectOption>
                                {tagok.map((t) => <NativeSelectOption key={t.azonosito} value={t.azonosito}>{t.nev || t.email}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="feladat-to">Vízegység</FieldLabel>
                            <NativeSelect id="feladat-to" value={toId} onChange={(e) => setToId(e.target.value)} disabled={saving}>
                                <NativeSelectOption value="">Nincs</NativeSelectOption>
                                {toak.map((t) => <NativeSelectOption key={t.azonosito} value={t.azonosito}>{t.nev}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="feladat-hatarido">Határidő</FieldLabel>
                            <DatePicker id="feladat-hatarido" value={hatarido} onChange={setHatarido} disabled={saving} placeholder="Nincs határidő" clearable />
                        </Field>
                    </div>

                    <FieldSet>
                        <FieldLegend variant="label">Prioritás</FieldLegend>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={2}
                            value={prioritas}
                            onValueChange={(v) => v && setPrioritas(v)}
                            aria-label="Prioritás"
                            className="grid w-full grid-cols-2 sm:grid-cols-4"
                        >
                            {PRIORITASOK.map((p) => (
                                <ToggleGroupItem
                                    key={p.ertek}
                                    value={p.ertek}
                                    className={cn(
                                        p.ertek === "SURGOS" && "data-[state=on]:border-destructive/40 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive",
                                        p.ertek === "MAGAS" && "data-[state=on]:border-warning/40 data-[state=on]:bg-warning/10 data-[state=on]:text-warning"
                                    )}
                                >
                                    {p.cimke}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </FieldSet>

                    <FieldSet>
                        <FieldLegend variant="label">Szín</FieldLegend>
                        <SzinValaszto
                            szinek={FELADAT_SZINEK.map((c) => ({ ertek: c, cimke: SZIN_NEV[c] ?? c, hex: c }))}
                            value={szin}
                            onChange={setSzin}
                        />
                    </FieldSet>

                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
