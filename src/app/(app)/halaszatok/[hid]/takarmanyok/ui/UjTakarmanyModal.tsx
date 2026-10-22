"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { SzinValaszto } from "@/components/app/SzinValaszto";
import { HibaAlert } from "@/components/app/urlap";
import { EGYSEGEK, TAKARMANY_SZINEK } from "./takarmany";

export function UjTakarmanyModal({ hid, open, onOpenChange, onLetrehozva }: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLetrehozva: () => void;
}) {
    const [nev, setNev] = useState("");
    const [egyseg, setEgyseg] = useState("kg");
    const [egyebEgyseg, setEgyebEgyseg] = useState("");
    const [szin, setSzin] = useState<string>("narancs");
    const [kuldFut, setKuldFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    const vegsoEgyseg = egyseg === "egyeb" ? egyebEgyseg.trim() : egyseg;

    async function kuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!vegsoEgyseg) return setHiba("Add meg a mértékegységet.");
        setKuldFut(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: nev.trim(), egyseg: vegsoEgyseg, szin }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(data.error ?? "Nem sikerült létrehozni."); return; }
            toast.success("Takarmány létrehozva", { description: nev.trim() });
            setNev("");
            setEgyseg("kg");
            setEgyebEgyseg("");
            onOpenChange(false);
            onLetrehozva();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setKuldFut(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(v) => { if (!v) setHiba(null); onOpenChange(v); }}
            title="Új takarmány"
            description="A készlet nulláról indul — a bevételt utána rögzítheted."
            preventClose={kuldFut}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={kuldFut}>Mégse</Button>
                    <Button type="submit" form="uj-takarmany" loading={kuldFut} disabled={!nev.trim()}>Létrehozás</Button>
                </>
            }
        >
            <form id="uj-takarmany" onSubmit={kuldes}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="takarmany-nev">Megnevezés</FieldLabel>
                        <Input
                            id="takarmany-nev"
                            value={nev}
                            onChange={(e) => setNev(e.target.value)}
                            placeholder="pl. Ponty granulátum"
                            disabled={kuldFut}
                            required
                            autoFocus
                        />
                    </Field>

                    <FieldSet>
                        <FieldLegend variant="label">Mértékegység</FieldLegend>
                        <div className="flex flex-wrap items-center gap-2">
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                spacing={2}
                                value={egyseg}
                                onValueChange={(v) => v && setEgyseg(v)}
                                aria-label="Mértékegység"
                                className="flex-wrap"
                            >
                                {EGYSEGEK.map((e) => (
                                    <ToggleGroupItem key={e} value={e} className="min-w-12">{e}</ToggleGroupItem>
                                ))}
                                <ToggleGroupItem value="egyeb">Egyéb…</ToggleGroupItem>
                            </ToggleGroup>
                            {egyseg === "egyeb" && (
                                <Input
                                    aria-label="Egyéb mértékegység"
                                    value={egyebEgyseg}
                                    onChange={(e) => setEgyebEgyseg(e.target.value)}
                                    placeholder="pl. vödör"
                                    className="h-9 w-32"
                                    autoFocus
                                />
                            )}
                        </div>
                    </FieldSet>

                    <FieldSet>
                        <FieldLegend variant="label">Szín a grafikonokon</FieldLegend>
                        <SzinValaszto szinek={TAKARMANY_SZINEK} value={szin} onChange={setSzin} label="Szín a grafikonokon" />
                    </FieldSet>

                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
