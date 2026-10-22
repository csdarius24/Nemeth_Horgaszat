"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type Props = {
    open: boolean;
    onClose: () => void;
    felhasznaloId: number | null;
    halaszatId: number | null;
};

export default function HibabejelentesModal({
    open,
    onClose,
    felhasznaloId,
    halaszatId,
}: Props) {
    const pathname = usePathname();

    const [targy, setTargy] = useState("");
    const [leiras, setLeiras] = useState("");
    const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);
    const [hibaUzenet, setHibaUzenet] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setKuldesFolyamatban(true);
        setHibaUzenet("");

        try {
            const res = await fetch("/api/hibabejelentesek", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targy,
                    leiras,
                    oldalUrl: pathname,
                    felhasznaloId,
                    halaszatId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setHibaUzenet(data?.hiba || "Ismeretlen hiba történt.");
                return;
            }

            toast.success("Hibabejelentés elküldve", {
                description: "Köszönjük, hamarosan megnézzük.",
            });
            setTargy("");
            setLeiras("");
            onClose();
        } catch (error) {
            console.error(error);
            setHibaUzenet("Hálózati hiba történt.");
        } finally {
            setKuldesFolyamatban(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(nyitva) => !nyitva && onClose()}
            title="Hibabejelentés"
            description="Írd le röviden és érthetően, mi történt, hogy könnyen vissza tudjuk követni."
            size="lg"
            preventClose={kuldesFolyamatban}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={kuldesFolyamatban}
                    >
                        Mégse
                    </Button>
                    <Button type="submit" form="hibabejelentes-form" loading={kuldesFolyamatban}>
                        {kuldesFolyamatban ? "Küldés…" : "Beküldés"}
                    </Button>
                </>
            }
        >
            <form id="hibabejelentes-form" onSubmit={handleSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="hiba-targy">Tárgy</FieldLabel>
                        <Input
                            id="hiba-targy"
                            type="text"
                            value={targy}
                            onChange={(e) => setTargy(e.target.value)}
                            maxLength={150}
                            required
                            autoFocus
                            placeholder="Pl. Nem mentődik a telepítés"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="hiba-leiras">Leírás</FieldLabel>
                        <Textarea
                            id="hiba-leiras"
                            value={leiras}
                            onChange={(e) => setLeiras(e.target.value)}
                            required
                            rows={5}
                            className="min-h-32"
                            placeholder="Írd le részletesen, mit csináltál, mi történt, és mit vártál volna."
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="hiba-oldal">Oldal</FieldLabel>
                        <Input id="hiba-oldal" type="text" value={pathname} readOnly className="bg-muted text-muted-foreground" />
                        <FieldDescription>Automatikusan kitöltve: az oldal, ahol a hibát észlelted.</FieldDescription>
                    </Field>

                    {hibaUzenet && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertDescription>{hibaUzenet}</AlertDescription>
                        </Alert>
                    )}
                </FieldGroup>
            </form>
        </Modal>
    );
}
