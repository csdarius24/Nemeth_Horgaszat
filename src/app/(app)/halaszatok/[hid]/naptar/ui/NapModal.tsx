"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Pencil, Trash2 } from "lucide-react";

import { CIMKE_SZINEK, cimkeSzinHex } from "@/components/app/szinPaletta";
import { SzinValaszto } from "@/components/app/SzinValaszto";
import { HibaAlert } from "@/components/app/urlap";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { napNev, type Bejegyzes } from "./naptar";

type Nezet = "lista" | "uj" | "szerkeszt";

/**
 * Egy nap bejegyzései: lista, új bejegyzés, szerkesztés és törlés egy modálban.
 * Ha a napon nincs bejegyzés (vagy konkrét bejegyzésre kattintottak), egyből az űrlap nyílik.
 */
export function NapModal({ hid, datum, kezdoBejegyzes, napiBejegyzesek, onClose, onValtozas }: {
    hid: string;
    /** YYYY-MM-DD; null = zárva */
    datum: string | null;
    kezdoBejegyzes: Bejegyzes | null;
    napiBejegyzesek: Bejegyzes[];
    onClose: () => void;
    onValtozas: () => void;
}) {
    const [nezet, setNezet] = useState<Nezet>("lista");
    const [aktualis, setAktualis] = useState<Bejegyzes | null>(null);
    const [cim, setCim] = useState("");
    const [tartalom, setTartalom] = useState("");
    const [szin, setSzin] = useState("narancs");
    const [mentes, setMentes] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);
    const [torlendo, setTorlendo] = useState<Bejegyzes | null>(null);
    const [torlesFut, setTorlesFut] = useState(false);

    function urlap(b: Bejegyzes | null, uj: Nezet) {
        setAktualis(b);
        setCim(b?.cim ?? "");
        setTartalom(b?.tartalom ?? "");
        setSzin(b?.szin ?? "narancs");
        setHiba(null);
        setNezet(uj);
    }

    // Nyitáskor a kiinduló nézet
    useEffect(() => {
        if (!datum) return;
        if (kezdoBejegyzes) urlap(kezdoBejegyzes, "szerkeszt");
        else if (napiBejegyzesek.length === 0) urlap(null, "uj");
        else urlap(null, "lista");
        // csak nyitáskor
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datum, kezdoBejegyzes]);

    async function kuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!datum) return;
        if (!cim.trim()) return setHiba("A cím kötelező.");
        setMentes(true);
        setHiba(null);
        try {
            const isUj = nezet === "uj";
            const url = isUj ? `/api/halaszatok/${hid}/naptar` : `/api/halaszatok/${hid}/naptar/${aktualis!.azonosito}`;
            const res = await fetch(url, {
                method: isUj ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ datum, cim: cim.trim(), tartalom: tartalom.trim() || null, szin }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Mentési hiba.");
            toast.success(isUj ? "Bejegyzés létrehozva" : "Bejegyzés mentve", { description: cim.trim() });
            onValtozas();
            onClose();
        } catch (err) {
            setHiba(err instanceof Error ? err.message : "Ismeretlen hiba.");
        } finally {
            setMentes(false);
        }
    }

    async function torles(b: Bejegyzes) {
        setTorlesFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/naptar/${b.azonosito}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error ?? "Törlési hiba.");
            }
            toast.success("Bejegyzés törölve", { description: b.cim });
            setTorlendo(null);
            onValtozas();
            // Ha ez volt az utolsó, zárjuk; különben marad a lista.
            if (napiBejegyzesek.length <= 1) onClose();
            else setNezet("lista");
        } catch (err) {
            toast.error("Nem sikerült törölni", { description: err instanceof Error ? err.message : undefined });
        } finally {
            setTorlesFut(false);
        }
    }

    const urlapNezet = nezet === "uj" || nezet === "szerkeszt";

    return (
        <>
            <Modal
                open={datum != null}
                onOpenChange={(v) => !v && onClose()}
                title={nezet === "lista" ? "Napi bejegyzések" : nezet === "uj" ? "Új bejegyzés" : "Bejegyzés szerkesztése"}
                description={datum ? napNev(datum, { year: "numeric", month: "long", day: "numeric", weekday: "long" }) : undefined}
                preventClose={mentes}
                formKey={`${nezet}-${aktualis?.azonosito ?? "uj"}`}
                footer={urlapNezet ? (
                    <>
                        {napiBejegyzesek.length > 0 && (
                            <Button variant="ghost" className="sm:mr-auto" onClick={() => setNezet("lista")} disabled={mentes}>
                                <ArrowLeft />
                                Vissza a listához
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose} disabled={mentes}>Mégse</Button>
                        <Button type="submit" form="naptar-urlap" loading={mentes}>{nezet === "uj" ? "Létrehozás" : "Mentés"}</Button>
                    </>
                ) : (
                    <Button onClick={() => urlap(null, "uj")} className="w-full sm:w-auto">
                        <CalendarPlus />
                        Új bejegyzés erre a napra
                    </Button>
                )}
            >
                {nezet === "lista" ? (
                    <ul className="grid gap-2">
                        {napiBejegyzesek.map((b) => (
                            <li
                                key={b.azonosito}
                                className="flex items-start gap-3 rounded-lg border border-l-4 p-3"
                                style={{ borderLeftColor: cimkeSzinHex(b.szin) }}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">{b.cim}</p>
                                    {b.tartalom && <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">{b.tartalom}</p>}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <IconButton label={`Szerkesztés: ${b.cim}`} icon={<Pencil />} size="icon-sm" onClick={() => urlap(b, "szerkeszt")} />
                                    <IconButton label={`Törlés: ${b.cim}`} icon={<Trash2 />} size="icon-sm" variant="ghost-destructive" onClick={() => setTorlendo(b)} />
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <form id="naptar-urlap" onSubmit={kuldes}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="naptar-cim">Cím</FieldLabel>
                                <Input
                                    id="naptar-cim"
                                    value={cim}
                                    onChange={(e) => setCim(e.target.value)}
                                    placeholder="pl. Ponty telepítés, versenynap…"
                                    disabled={mentes}
                                    required
                                    autoFocus
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="naptar-tartalom">Megjegyzés (opcionális)</FieldLabel>
                                <Textarea id="naptar-tartalom" value={tartalom} onChange={(e) => setTartalom(e.target.value)} placeholder="Részletek, teendők…" rows={3} disabled={mentes} />
                            </Field>
                            <FieldSet>
                                <FieldLegend variant="label">Szín / kategória</FieldLegend>
                                <SzinValaszto szinek={CIMKE_SZINEK} value={szin} onChange={setSzin} />
                            </FieldSet>
                            {nezet === "szerkeszt" && aktualis && (
                                <Button type="button" variant="ghost-destructive" className="justify-self-start" onClick={() => setTorlendo(aktualis)}>
                                    <Trash2 />
                                    Bejegyzés törlése
                                </Button>
                            )}
                            <HibaAlert uzenet={hiba} />
                        </FieldGroup>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={torlendo != null}
                onOpenChange={(v) => !v && setTorlendo(null)}
                title={`Törlöd: „${torlendo?.cim ?? ""}”?`}
                description="A bejegyzés véglegesen törlődik a naptárból."
                confirmLabel="Törlés"
                destructive
                loading={torlesFut}
                onConfirm={() => { if (torlendo) void torles(torlendo); }}
            />
        </>
    );
}
