"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { bevitelKgBan, type TomegEgyseg } from "@/lib/toak/kapacitas";
import { bevitelHaBan, type TeruletEgyseg } from "@/lib/toak/terulet";

import { EltartokepessegMezo, SzamMezo, TeruletMezo } from "./MuszakiMezok";

export const VIZEGYSEG_TIPUSOK = [
    { ertek: "TO", cimke: "Tó" },
    { ertek: "TELELO", cimke: "Telelő" },
    { ertek: "IVADEKNEVELO", cimke: "Ivadéknevelő" },
    { ertek: "KELTETO_MEDENCE", cimke: "Keltető medence" },
] as const;

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
    const [terulet, setTerulet] = useState("");
    const [teruletEgyseg, setTeruletEgyseg] = useState<TeruletEgyseg>("ha");
    const [melyseg, setMelyseg] = useState("");
    const [kapacitas, setKapacitas] = useState("");
    const [kapacitasEgyseg, setKapacitasEgyseg] = useState<TomegEgyseg>("kg");
    const [vizkapacitas, setVizkapacitas] = useState("");
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    function alaphelyzet() {
        setNev("");
        setTipus("TO");
        setTerulet("");
        setTeruletEgyseg("ha");
        setMelyseg("");
        setKapacitas("");
        setKapacitasEgyseg("kg");
        setVizkapacitas("");
        setHiba(null);
    }

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (nev.trim().length < 2) { setHiba("A név legalább 2 karakter legyen."); return; }
        if (!(Number(vizkapacitas) > 0)) { setHiba("A vízkapacitás (m³) megadása kötelező."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev: nev.trim(),
                    tipus,
                    teruletHa: bevitelHaBan(terulet, teruletEgyseg),
                    atlagMelysegMeter: melyseg || null,
                    kapacitasKg: bevitelKgBan(kapacitas, kapacitasEgyseg),
                    vizkapacitasM3: vizkapacitas,
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

                    <div className="grid gap-4 sm:grid-cols-2">
                        <SzamMezo
                            id="vizegyseg-vizkapacitas"
                            cimke="Vízkapacitás"
                            egyseg="m³"
                            ertek={vizkapacitas}
                            onChange={setVizkapacitas}
                            disabled={saving}
                            required
                        />
                        <SzamMezo id="vizegyseg-melyseg" cimke="Átl. mélység" egyseg="m" ertek={melyseg} onChange={setMelyseg} disabled={saving} />
                    </div>

                    <TeruletMezo
                        id="vizegyseg-terulet"
                        ertek={terulet}
                        egyseg={teruletEgyseg}
                        onChange={(e, egy) => { setTerulet(e); setTeruletEgyseg(egy); }}
                        disabled={saving}
                    />

                    <EltartokepessegMezo
                        ertek={kapacitas}
                        egyseg={kapacitasEgyseg}
                        onChange={(e, egy) => { setKapacitas(e); setKapacitasEgyseg(egy); }}
                        disabled={saving}
                    />

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
