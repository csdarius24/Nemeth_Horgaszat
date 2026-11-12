"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { bevitelKgBan, type TomegEgyseg } from "@/lib/toak/kapacitas";
import { bevitelHaBan, type TeruletEgyseg } from "@/lib/toak/terulet";

import { EltartokepessegMezo, SzamMezo, TeruletMezo } from "../../ui/MuszakiMezok";

export type ToAdatok = {
    nev: string;
    teruletHa: number | null;
    atlagMelysegMeter: number | null;
    kapacitasKg: number | null;
    vizkapacitasM3: number | null;
};

const str = (x: number | null) => (x == null ? "" : String(x));

/** Tóegység alap- és műszaki adatainak szerkesztése (ADMIN+). */
export default function ToAdatokModal({ hid, toId, open, onOpenChange, adatok, onMentve }: {
    hid: string;
    toId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    adatok: ToAdatok;
    onMentve: () => void;
}) {
    const [nev, setNev] = useState("");
    const [terulet, setTerulet] = useState("");
    const [teruletEgyseg, setTeruletEgyseg] = useState<TeruletEgyseg>("ha");
    const [melyseg, setMelyseg] = useState("");
    const [vizkapacitas, setVizkapacitas] = useState("");
    const [kapacitas, setKapacitas] = useState("");
    const [egyseg, setEgyseg] = useState<TomegEgyseg>("kg");
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    // Megnyitáskor az aktuális értékekkel töltjük fel.
    useEffect(() => {
        if (!open) return;
        setNev(adatok.nev);
        setTerulet(str(adatok.teruletHa));
        setTeruletEgyseg("ha");
        setMelyseg(str(adatok.atlagMelysegMeter));
        setVizkapacitas(str(adatok.vizkapacitasM3));
        setKapacitas(str(adatok.kapacitasKg));
        setEgyseg("kg");
        setHiba(null);
    }, [open, adatok]);

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (nev.trim().length < 2) { setHiba("A név legalább 2 karakter legyen."); return; }
        if (!(Number(vizkapacitas) > 0)) { setHiba("A vízkapacitás (m³) megadása kötelező."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev: nev.trim(),
                    teruletHa: bevitelHaBan(terulet, teruletEgyseg),
                    atlagMelysegMeter: melyseg || null,
                    vizkapacitasM3: vizkapacitas,
                    kapacitasKg: bevitelKgBan(kapacitas, egyseg),
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.error ?? json?.hiba ?? "Nem sikerült menteni."); return; }
            toast.success("Adatok mentve");
            onOpenChange(false);
            onMentve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Tóegység adatai"
            description="Név, vízkapacitás, eltartóképesség és egyéb műszaki adatok."
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="to-adatok" loading={saving}>Mentés</Button>
                </>
            }
        >
            <form id="to-adatok" onSubmit={kuldes}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="to-adatok-nev">Név</FieldLabel>
                        <Input id="to-adatok-nev" value={nev} onChange={(e) => setNev(e.target.value)} disabled={saving} required minLength={2} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SzamMezo id="to-adatok-viz" cimke="Vízkapacitás" egyseg="m³" ertek={vizkapacitas} onChange={setVizkapacitas} disabled={saving} required />
                        <SzamMezo id="to-adatok-melyseg" cimke="Átl. mélység" egyseg="m" ertek={melyseg} onChange={setMelyseg} disabled={saving} />
                    </div>
                    <TeruletMezo
                        id="to-adatok-terulet"
                        ertek={terulet}
                        egyseg={teruletEgyseg}
                        onChange={(e, egy) => { setTerulet(e); setTeruletEgyseg(egy); }}
                        disabled={saving}
                    />
                    <EltartokepessegMezo
                        ertek={kapacitas}
                        egyseg={egyseg}
                        onChange={(e, egy) => { setKapacitas(e); setEgyseg(egy); }}
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
