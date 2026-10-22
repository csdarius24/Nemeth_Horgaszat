"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { HibaAlert } from "@/components/app/urlap";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { naploModositas, type NaploBejegyzes } from "./tipusok";

type Props = {
    hid: string;
    /** null = zárva */
    bejegyzes: NaploBejegyzes | null;
    onClose: () => void;
    onMentve: () => void;
};

/** A bejegyzés szövegének (cím, leírás) javítása. A mennyiségek nem módosíthatók. */
export function SzovegJavitasModal({ hid, bejegyzes, onClose, onMentve }: Props) {
    const [cim, setCim] = useState("");
    const [leiras, setLeiras] = useState("");
    const [fut, setFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    useEffect(() => {
        if (!bejegyzes) return;
        setCim(bejegyzes.cim);
        setLeiras(bejegyzes.leiras ?? "");
        setHiba(null);
    }, [bejegyzes]);

    async function mentes(e: React.FormEvent) {
        e.preventDefault();
        if (!bejegyzes) return;
        if (!cim.trim()) return setHiba("A cím nem lehet üres.");
        setFut(true);
        setHiba(null);
        try {
            await naploModositas(hid, bejegyzes.id, { cim: cim.trim(), leiras: leiras.trim() });
            toast.success("Bejegyzés javítva");
            onClose();
            onMentve();
        } catch (err) {
            setHiba(err instanceof Error ? err.message : "Hálózati hiba.");
        } finally {
            setFut(false);
        }
    }

    return (
        <Modal
            open={bejegyzes != null}
            onOpenChange={(v) => !v && onClose()}
            title="Szöveg javítása"
            description="Csak a cím és a leírás módosítható — a mennyiségek a tényleges műveletet tükrözik."
            preventClose={fut}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={fut}>Mégse</Button>
                    <Button type="submit" form="naplo-javitas" loading={fut}>Mentés</Button>
                </>
            }
        >
            <form id="naplo-javitas" onSubmit={mentes}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="naplo-cim">Cím</FieldLabel>
                        <Input id="naplo-cim" value={cim} onChange={(e) => setCim(e.target.value)} disabled={fut} required autoFocus />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="naplo-leiras">Leírás</FieldLabel>
                        <Textarea id="naplo-leiras" value={leiras} onChange={(e) => setLeiras(e.target.value)} rows={3} disabled={fut} />
                    </Field>
                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}

/** Érvénytelenítés kötelező indokkal. A sor megmarad (áthúzva), és kimarad az összegzésekből. */
export function ErvenytelenitesModal({ hid, bejegyzes, onClose, onMentve }: Props) {
    const [oka, setOka] = useState("");
    const [fut, setFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    useEffect(() => {
        if (!bejegyzes) return;
        setOka("");
        setHiba(null);
    }, [bejegyzes]);

    async function mentes(e: React.FormEvent) {
        e.preventDefault();
        if (!bejegyzes) return;
        if (oka.trim().length < 3) return setHiba("Az indok kötelező (legalább 3 karakter).");
        setFut(true);
        setHiba(null);
        try {
            await naploModositas(hid, bejegyzes.id, { ervenyes: false, ervenytelenitesOka: oka.trim() });
            toast.success("Bejegyzés érvénytelenítve", { description: bejegyzes.cim });
            onClose();
            onMentve();
        } catch (err) {
            setHiba(err instanceof Error ? err.message : "Hálózati hiba.");
        } finally {
            setFut(false);
        }
    }

    return (
        <Modal
            open={bejegyzes != null}
            onOpenChange={(v) => !v && onClose()}
            title="Bejegyzés érvénytelenítése"
            description={bejegyzes?.cim}
            preventClose={fut}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={fut}>Mégse</Button>
                    <Button type="submit" form="naplo-ervenytelenites" variant="destructive" loading={fut}>Érvénytelenítés</Button>
                </>
            }
        >
            <form id="naplo-ervenytelenites" onSubmit={mentes}>
                <FieldGroup>
                    <Alert variant="warning">
                        <TriangleAlert />
                        <AlertDescription>
                            <p>
                                Az érvénytelenítés csak a naplóbejegyzést jelöli meg — a hal- vagy takarmánykészletet{" "}
                                <strong>nem</strong> állítja vissza. Ahhoz kompenzáló műveletet kell rögzíteni.
                            </p>
                        </AlertDescription>
                    </Alert>
                    <Field>
                        <FieldLabel htmlFor="naplo-oka">Indok</FieldLabel>
                        <Textarea
                            id="naplo-oka"
                            value={oka}
                            onChange={(e) => setOka(e.target.value)}
                            rows={3}
                            placeholder="pl. hibás tóra rögzítve, duplikált bejegyzés"
                            disabled={fut}
                            required
                            minLength={3}
                            autoFocus
                        />
                        <FieldDescription>Kötelező, a napló része marad.</FieldDescription>
                    </Field>
                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
