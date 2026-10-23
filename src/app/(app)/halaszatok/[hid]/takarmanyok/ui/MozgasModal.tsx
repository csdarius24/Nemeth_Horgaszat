"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { HibaAlert, MertekegysegesInput } from "@/components/app/urlap";
import { fmtMennyiseg, type Takarmany } from "./takarmany";

type Tipus = "BEVETEL" | "FELHASZNALVA";

function mostHelyiIdo() {
    // datetime-local mezőhöz: helyi idő, másodperc nélkül
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

/** Bevétel vagy felhasználás rögzítése egy takarmányhoz. */
export function MozgasModal({ hid, takarmany, kezdoTipus = "BEVETEL", onOpenChange, onMentve }: {
    hid: string;
    /** null = zárva */
    takarmany: Takarmany | null;
    kezdoTipus?: Tipus;
    onOpenChange: (open: boolean) => void;
    onMentve: () => void;
}) {
    const open = takarmany != null;
    const [tipus, setTipus] = useState<Tipus>(kezdoTipus);
    const [mennyiseg, setMennyiseg] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [datum, setDatum] = useState(mostHelyiIdo);
    const [kuldFut, setKuldFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    // Minden megnyitáskor tiszta űrlap.
    useEffect(() => {
        if (!open) return;
        setTipus(kezdoTipus);
        setMennyiseg("");
        setMegjegyzes("");
        setDatum(mostHelyiIdo());
        setHiba(null);
    }, [open, kezdoTipus, takarmany?.azonosito]);

    if (!takarmany) return null;

    const keszlet = Number(takarmany.keszlet);
    const m = parseFloat(mennyiseg.replace(",", "."));
    const ervenyes = Number.isFinite(m) && m > 0;
    const ujKeszlet = ervenyes ? (tipus === "BEVETEL" ? keszlet + m : keszlet - m) : keszlet;
    const tulSok = tipus === "FELHASZNALVA" && ervenyes && ujKeszlet < 0;

    async function kuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!takarmany) return;
        if (!ervenyes) return setHiba("Érvényes mennyiséget adj meg.");
        if (tulSok) return setHiba("Nincs ennyi a készleten.");
        setKuldFut(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${takarmany.azonosito}/mozgasok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipus, mennyiseg: m, megjegyzes: megjegyzes.trim() || null, datum }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(data.error ?? "Nem sikerült rögzíteni."); return; }
            toast.success(tipus === "BEVETEL" ? "Bevétel rögzítve" : "Felhasználás rögzítve", {
                description: `${takarmany.nev}: ${tipus === "BEVETEL" ? "+" : "−"}${fmtMennyiseg(m, takarmany.egyseg)}`,
            });
            onOpenChange(false);
            onMentve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setKuldFut(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Készletmozgás rögzítése"
            description={takarmany.nev}
            preventClose={kuldFut}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={kuldFut}>Mégse</Button>
                    <Button
                        type="submit"
                        form="mozgas-urlap"
                        variant={tipus === "BEVETEL" ? "success" : "default"}
                        loading={kuldFut}
                        disabled={tulSok}
                    >
                        Rögzítés
                    </Button>
                </>
            }
        >
            <form id="mozgas-urlap" onSubmit={kuldes}>
                <FieldGroup>
                    <FieldSet>
                        <FieldLegend variant="label">Mozgás típusa</FieldLegend>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            spacing={2}
                            value={tipus}
                            onValueChange={(v) => v && setTipus(v as Tipus)}
                            aria-label="Mozgás típusa"
                            className="grid w-full grid-cols-2"
                        >
                            <ToggleGroupItem
                                value="BEVETEL"
                                className="h-11 data-[state=on]:border-success/40 data-[state=on]:bg-success/10 data-[state=on]:text-success"
                            >
                                <Plus />
                                Bevétel
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="FELHASZNALVA"
                                className="h-11 data-[state=on]:border-warning/40 data-[state=on]:bg-warning/10 data-[state=on]:text-warning"
                            >
                                <Minus />
                                Felhasználás
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </FieldSet>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={tulSok || undefined}>
                            <FieldLabel htmlFor="mozgas-mennyiseg">Mennyiség</FieldLabel>
                            <MertekegysegesInput
                                id="mozgas-mennyiseg"
                                egyseg={takarmany.egyseg}
                                min="0.01"
                                step="0.01"
                                placeholder="0"
                                value={mennyiseg}
                                onChange={(e) => setMennyiseg(e.target.value)}
                                disabled={kuldFut}
                                aria-invalid={tulSok || undefined}
                                autoFocus
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="mozgas-datum">Időpont</FieldLabel>
                            <DateTimePicker id="mozgas-datum" value={datum} onChange={setDatum} disabled={kuldFut} />
                        </Field>
                    </div>

                    {/* Készlet előnézet: most → mentés után */}
                    <Alert variant={tulSok ? "destructive" : "default"} className="bg-muted/50">
                        <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-foreground">
                            <span className="text-muted-foreground">Készlet</span>
                            <span className="font-medium tabular-nums">
                                {fmtMennyiseg(keszlet, takarmany.egyseg)}
                                <span className="mx-2 text-muted-foreground">→</span>
                                <span className={cn("font-bold", tulSok ? "text-destructive" : tipus === "BEVETEL" && ervenyes && "text-success")}>
                                    {fmtMennyiseg(Math.round(ujKeszlet * 100) / 100, takarmany.egyseg)}
                                </span>
                            </span>
                        </AlertDescription>
                    </Alert>

                    <Field>
                        <FieldLabel htmlFor="mozgas-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                        <Input
                            id="mozgas-megjegyzes"
                            value={megjegyzes}
                            onChange={(e) => setMegjegyzes(e.target.value)}
                            placeholder="pl. szállító, számlaszám"
                            disabled={kuldFut}
                        />
                    </Field>

                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
