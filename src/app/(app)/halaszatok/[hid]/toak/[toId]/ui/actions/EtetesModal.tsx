"use client";

import { useEffect, useState } from "react";
import { Wheat } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";

import { HibaAlert, MertekegysegesInput } from "@/components/app/urlap";

import { apiHiba, MuveletLablec, type MuveletModalProps } from "./kozos";

type TakarmanyOpcio = {
    azonosito: number;
    nev: string;
    egyseg: string;
    keszlet: number;
};

type TakarmanyApiTetel = { azonosito: number; nev: string; egyseg: string; keszlet: unknown };

export default function EtetesModal({ open, onOpenChange, hid, toId, onMentve }: MuveletModalProps) {
    const [mennyiseg, setMennyiseg] = useState("10");
    const [tipus, setTipus] = useState("Pellet");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Opcionális takarmány-kötés: ha választunk, az etetés levon a készletből.
    const [takarmanyok, setTakarmanyok] = useState<TakarmanyOpcio[]>([]);
    const [takarmanyId, setTakarmanyId] = useState<number | null>(null);

    useEffect(() => {
        if (!open) return;
        setErr(null);
        let aktiv = true;
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/takarmanyok?active=1`);
                const json = await res.json().catch(() => ({}));
                if (!aktiv) return;
                if (res.ok && Array.isArray(json?.items)) {
                    setTakarmanyok(
                        (json.items as TakarmanyApiTetel[]).map((t) => ({
                            azonosito: t.azonosito,
                            nev: t.nev,
                            egyseg: t.egyseg,
                            keszlet: Number(t.keszlet),
                        }))
                    );
                }
            } catch {
                // a takarmánylista opcionális — hiba esetén marad a sima etetés
            }
        })();
        return () => {
            aktiv = false;
        };
    }, [open, hid]);

    const mennyisegKg = Number(mennyiseg.replace(",", "."));
    const valasztott = takarmanyok.find((t) => t.azonosito === takarmanyId) ?? null;
    const nincsEleg = valasztott != null && mennyisegKg > valasztott.keszlet;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!Number.isFinite(mennyisegKg) || mennyisegKg <= 0) return setErr("A mennyiség legyen pozitív szám.");
        if (nincsEleg) return setErr("Nincs elég készlet ehhez a mennyiséghez.");

        setSaving(true);
        setErr(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/etetes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mennyisegKg,
                    // Az API `tipus` mezőt vár (korábban `takarmanyTipus` ment, ami elveszett).
                    tipus: tipus.trim() || null,
                    megjegyzes: megjegyzes || null,
                    ...(takarmanyId != null ? { takarmanyId } : {}),
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiHiba(json, "Hiba az etetés mentésekor."));

            toast.success("Etetés rögzítve", {
                description: valasztott
                    ? `${mennyisegKg} ${valasztott.egyseg} levonva: ${valasztott.nev}`
                    : `${mennyisegKg} kg`,
            });
            onOpenChange(false);
            await onMentve();
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Etetés rögzítése"
            description="Add meg a takarmány mennyiségét. Ha a készletből választasz, a mentés levonja."
            preventClose={saving}
            footer={<MuveletLablec formId="etetes-urlap" saving={saving} onMegse={() => onOpenChange(false)} disabled={nincsEleg} />}
        >
            <form id="etetes-urlap" onSubmit={submit}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={nincsEleg || undefined}>
                            <FieldLabel htmlFor="etetes-mennyiseg">Mennyiség</FieldLabel>
                            <MertekegysegesInput
                                id="etetes-mennyiseg"
                                egyseg={valasztott?.egyseg ?? "kg"}
                                step="0.1"
                                min={0}
                                value={mennyiseg}
                                onChange={(e) => setMennyiseg(e.target.value)}
                                disabled={saving}
                                aria-invalid={nincsEleg || undefined}
                                autoFocus
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="etetes-tipus">Takarmány típusa</FieldLabel>
                            <Input id="etetes-tipus" value={tipus} onChange={(e) => setTipus(e.target.value)} disabled={saving} placeholder="pl. Pellet" />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="etetes-takarmany">Takarmány a készletből (opcionális)</FieldLabel>
                        <NativeSelect
                            id="etetes-takarmany"
                            value={takarmanyId ?? ""}
                            onChange={(e) => setTakarmanyId(e.target.value ? Number(e.target.value) : null)}
                            disabled={saving}
                        >
                            <NativeSelectOption value="">Nincs – csak az etetést rögzítem</NativeSelectOption>
                            {takarmanyok.map((t) => (
                                <NativeSelectOption key={t.azonosito} value={t.azonosito}>
                                    {t.nev} ({t.keszlet.toLocaleString("hu-HU")} {t.egyseg})
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        {!valasztott && <FieldDescription>Készlet nélkül az etetés nem von le semmit.</FieldDescription>}
                    </Field>

                    {valasztott && (
                        <Alert variant={nincsEleg ? "destructive" : "info"}>
                            <Wheat />
                            <AlertTitle>
                                Készlet: {valasztott.keszlet.toLocaleString("hu-HU")} {valasztott.egyseg}
                            </AlertTitle>
                            <AlertDescription>
                                {nincsEleg
                                    ? "Nincs elég készlet ehhez a mennyiséghez."
                                    : `Mentés után marad: ${(Math.round((valasztott.keszlet - (mennyisegKg || 0)) * 100) / 100).toLocaleString("hu-HU")} ${valasztott.egyseg}.`}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Field>
                        <FieldLabel htmlFor="etetes-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                        <Input id="etetes-megjegyzes" value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={saving} />
                    </Field>

                    <HibaAlert uzenet={err} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
