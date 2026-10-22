"use client";

import { useEffect, useMemo, useState } from "react";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { HibaAlert, MertekegysegesInput } from "@/components/app/urlap";

import { apiHiba, MuveletLablec, type AllomanyTetel, type MuveletModalProps } from "./kozos";

type HalfajItem = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
};

export default function KivetelModal({ open, onOpenChange, hid, toId, onMentve, allomany }: MuveletModalProps & {
    allomany: AllomanyTetel[];
}) {
    const [halfajok, setHalfajok] = useState<HalfajItem[]>([]);
    const [loadingHalfajok, setLoadingHalfajok] = useState(false);

    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState<string>("");
    const [ok, setOk] = useState<string>("");
    const [megjegyzes, setMegjegyzes] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const halfajUrl = useMemo(() => `/api/halaszatok/${hid}/halfajok?active=1`, [hid]);

    useEffect(() => {
        if (!open) return;

        // reset
        setError(null);
        setSaving(false);
        setDarab("");
        setOk("");
        setMegjegyzes("");

        (async () => {
            setLoadingHalfajok(true);
            try {
                const res = await fetch(halfajUrl, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(apiHiba(json, "Hiba a halfajok lekérésekor."));

                const items: HalfajItem[] = Array.isArray(json?.items) ? json.items : [];
                // A tóban ténylegesen lévő fajok kerülnek előre.
                const vanBenne = new Set(allomany.filter((a) => a.darab > 0).map((a) => a.halfajId));
                items.sort((a, b) => Number(vanBenne.has(b.azonosito)) - Number(vanBenne.has(a.azonosito)));
                setHalfajok(items);
                setHalfajId(items.length ? items[0].azonosito : 0);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Ismeretlen hiba");
                setHalfajok([]);
                setHalfajId(0);
            } finally {
                setLoadingHalfajok(false);
            }
        })();
        // Csak nyitáskor töltünk (az állomány ugyanarra a nyitásra fix).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, halfajUrl]);

    const keszlet = allomany.find((a) => a.halfajId === halfajId)?.darab ?? 0;
    const darabInt = Math.floor(Number(String(darab).replace(",", ".")));
    const tulSok = Number.isFinite(darabInt) && darabInt > keszlet;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!halfajId) return setError("Válassz halfajt.");
        if (!Number.isFinite(darabInt) || darabInt <= 0) return setError("A darab legyen pozitív egész.");
        if (tulSok) return setError(`A tóban csak ${keszlet.toLocaleString("hu-HU")} db van ebből a fajból.`);

        setSaving(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/kivetel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    halfajId,
                    darab: darabInt,
                    ok: ok.trim() ? ok.trim() : null,
                    megjegyzes: megjegyzes.trim() ? megjegyzes.trim() : null,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiHiba(json, "Hiba a kivét mentésekor."));

            toast.success("Kivétel rögzítve", {
                description: `${darabInt.toLocaleString("hu-HU")} db ${halfajok.find((h) => h.azonosito === halfajId)?.nev ?? ""}`.trim(),
            });
            onOpenChange(false);
            await onMentve();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Hal kivétele"
            description="A tó készletéből csökkentjük a darabszámot (pl. eladás, pusztulás)."
            preventClose={saving}
            footer={
                <MuveletLablec
                    formId="kivetel-urlap"
                    saving={saving}
                    onMegse={() => onOpenChange(false)}
                    disabled={loadingHalfajok || halfajok.length === 0}
                />
            }
        >
            <form id="kivetel-urlap" onSubmit={submit}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="kivetel-halfaj">Halfaj</FieldLabel>
                            <NativeSelect
                                id="kivetel-halfaj"
                                value={halfajId}
                                onChange={(e) => setHalfajId(Number(e.target.value))}
                                disabled={loadingHalfajok || saving || halfajok.length === 0}
                            >
                                {halfajok.length === 0 ? (
                                    <NativeSelectOption value={0}>{loadingHalfajok ? "Betöltés…" : "Nincs halfaj"}</NativeSelectOption>
                                ) : (
                                    halfajok.map((h) => {
                                        const db = allomany.find((a) => a.halfajId === h.azonosito)?.darab ?? 0;
                                        return (
                                            <NativeSelectOption key={h.azonosito} value={h.azonosito}>
                                                {h.nev} ({db.toLocaleString("hu-HU")} db)
                                            </NativeSelectOption>
                                        );
                                    })
                                )}
                            </NativeSelect>
                        </Field>
                        <Field data-invalid={tulSok || undefined}>
                            <FieldLabel htmlFor="kivetel-darab">Darabszám</FieldLabel>
                            <MertekegysegesInput
                                id="kivetel-darab"
                                egyseg="db"
                                inputMode="numeric"
                                min={1}
                                max={keszlet || undefined}
                                step={1}
                                placeholder="pl. 120"
                                value={darab}
                                onChange={(e) => setDarab(e.target.value)}
                                disabled={saving}
                                aria-invalid={tulSok || undefined}
                                aria-describedby="kivetel-darab-sugo"
                                required
                            />
                            <FieldDescription id="kivetel-darab-sugo">
                                A tóban: {keszlet.toLocaleString("hu-HU")} db
                            </FieldDescription>
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="kivetel-ok">Ok (opcionális)</FieldLabel>
                        <Input
                            id="kivetel-ok"
                            value={ok}
                            onChange={(e) => setOk(e.target.value)}
                            placeholder="pl. eladás / pusztulás / verseny"
                            disabled={saving}
                            maxLength={120}
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="kivetel-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                        <Textarea
                            id="kivetel-megjegyzes"
                            value={megjegyzes}
                            onChange={(e) => setMegjegyzes(e.target.value)}
                            placeholder="Opcionális részletek"
                            disabled={saving}
                            rows={3}
                        />
                    </Field>

                    <HibaAlert uzenet={error} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
