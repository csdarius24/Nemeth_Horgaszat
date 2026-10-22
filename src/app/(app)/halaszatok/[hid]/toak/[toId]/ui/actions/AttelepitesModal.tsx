"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { toTipusCimke } from "@/lib/toak/attekintes";
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

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
};

function normalizeItems<T>(json: unknown): T[] {
    if (!json) return [];
    if (Array.isArray(json)) return json as T[];
    const j = json as { items?: T[]; toak?: T[]; data?: T[] };
    if (Array.isArray(j.items)) return j.items;
    if (Array.isArray(j.toak)) return j.toak;
    if (Array.isArray(j.data)) return j.data;
    return [];
}

export default function AttelepitesModal({ open, onOpenChange, hid, toId, onMentve, allomany, forrasNev }: MuveletModalProps & {
    allomany: AllomanyTetel[];
    forrasNev: string;
}) {
    const [halfajok, setHalfajok] = useState<HalfajItem[]>([]);
    const [toak, setToak] = useState<ToItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [celToId, setCelToId] = useState<number>(0);
    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState<string>("");
    const [megjegyzes, setMegjegyzes] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const halfajUrl = useMemo(() => `/api/halaszatok/${hid}/halfajok?active=1`, [hid]);
    const toakUrl = useMemo(() => `/api/halaszatok/${hid}/toak?active=1`, [hid]);

    async function loadLists() {
        setLoading(true);
        setError(null);
        try {
            const [halfajRes, toakRes] = await Promise.all([
                fetch(halfajUrl, { cache: "no-store" }),
                fetch(toakUrl, { cache: "no-store" }),
            ]);

            const halfajJson = await halfajRes.json().catch(() => null);
            const toakJson = await toakRes.json().catch(() => null);

            if (!halfajRes.ok) throw new Error(apiHiba(halfajJson, "Hiba a halfajok lekérésekor."));
            if (!toakRes.ok) throw new Error(apiHiba(toakJson, "Hiba a tavak lekérésekor."));

            const halfajItems = normalizeItems<HalfajItem>(halfajJson);
            const toItemsAll = normalizeItems<ToItem>(toakJson);

            const fromId = Number(toId);
            const filtered = Number.isFinite(fromId) ? toItemsAll.filter((t) => t.azonosito !== fromId) : toItemsAll;

            // Csak a forrás tóban ténylegesen lévő fajokat lehet áttelepíteni — ezek kerülnek előre.
            const vanBenne = new Set(allomany.filter((a) => a.darab > 0).map((a) => a.halfajId));
            halfajItems.sort((a, b) => Number(vanBenne.has(b.azonosito)) - Number(vanBenne.has(a.azonosito)));

            setHalfajok(halfajItems);
            setToak(filtered);

            setHalfajId(halfajItems.length ? halfajItems[0].azonosito : 0);
            setCelToId(filtered.length ? filtered[0].azonosito : 0);

            if (toItemsAll.length > 0 && filtered.length === 0) {
                setError("Nincs másik vízegység, ahová áttelepíthetnél — ehhez legalább két tó/telelő szükséges.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ismeretlen hiba");
            setHalfajok([]);
            setToak([]);
            setHalfajId(0);
            setCelToId(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;
        setSaving(false);
        setDarab("");
        setMegjegyzes("");
        setHalfajId(0);
        setCelToId(0);
        void loadLists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, halfajUrl, toakUrl, toId]);

    const keszlet = allomany.find((a) => a.halfajId === halfajId)?.darab ?? 0;
    const darabInt = Math.floor(Number(String(darab).replace(",", ".")));
    const tulSok = Number.isFinite(darabInt) && darabInt > keszlet;
    const celNev = toak.find((t) => t.azonosito === celToId)?.nev;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!celToId) return setError("Válassz cél tavat/telelőt.");
        if (!halfajId) return setError("Válassz halfajt.");
        if (!Number.isFinite(darabInt) || darabInt <= 0) return setError("A darab legyen pozitív egész.");
        if (tulSok) return setError(`A forrás tóban csak ${keszlet.toLocaleString("hu-HU")} db van ebből a fajból.`);

        setSaving(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/attelepites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    celToId,
                    halfajId,
                    darab: darabInt,
                    megjegyzes: megjegyzes.trim() ? megjegyzes.trim() : null,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiHiba(json, "Hiba az áttelepítés mentésekor."));

            toast.success("Áttelepítés rögzítve", {
                description: `${darabInt.toLocaleString("hu-HU")} db → ${celNev ?? "cél tó"}`,
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
            title="Áttelepítés"
            description="A forrás tóból csökken, a cél tóban nő a készlet."
            preventClose={saving}
            footer={
                <MuveletLablec
                    formId="attelepites-urlap"
                    saving={saving}
                    onMegse={() => onOpenChange(false)}
                    disabled={loading || halfajok.length === 0 || toak.length === 0}
                />
            }
        >
            <form id="attelepites-urlap" onSubmit={submit}>
                <FieldGroup>
                    {/* Honnan → hová */}
                    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                        <Field>
                            <FieldLabel htmlFor="attelepites-forras">Honnan</FieldLabel>
                            <Input id="attelepites-forras" value={forrasNev} readOnly tabIndex={-1} className="bg-muted font-medium" />
                        </Field>
                        <ArrowRight className="mx-auto mb-3 hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
                        <Field>
                            <FieldLabel htmlFor="attelepites-cel">Hová</FieldLabel>
                            <NativeSelect
                                id="attelepites-cel"
                                value={celToId}
                                onChange={(e) => setCelToId(Number(e.target.value))}
                                disabled={loading || saving || toak.length === 0}
                            >
                                {toak.length === 0 ? (
                                    <NativeSelectOption value={0}>{loading ? "Betöltés…" : "Nincs választható cél"}</NativeSelectOption>
                                ) : (
                                    toak.map((t) => (
                                        <NativeSelectOption key={t.azonosito} value={t.azonosito}>
                                            {t.nev} ({toTipusCimke(t.tipus)})
                                        </NativeSelectOption>
                                    ))
                                )}
                            </NativeSelect>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="attelepites-halfaj">Halfaj</FieldLabel>
                            <NativeSelect
                                id="attelepites-halfaj"
                                value={halfajId}
                                onChange={(e) => setHalfajId(Number(e.target.value))}
                                disabled={loading || saving || halfajok.length === 0}
                            >
                                {halfajok.length === 0 ? (
                                    <NativeSelectOption value={0}>{loading ? "Betöltés…" : "Nincs halfaj"}</NativeSelectOption>
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
                            <FieldLabel htmlFor="attelepites-darab">Darabszám</FieldLabel>
                            <MertekegysegesInput
                                id="attelepites-darab"
                                egyseg="db"
                                inputMode="numeric"
                                min={1}
                                max={keszlet || undefined}
                                step={1}
                                placeholder="pl. 300"
                                value={darab}
                                onChange={(e) => setDarab(e.target.value)}
                                disabled={saving}
                                aria-invalid={tulSok || undefined}
                                aria-describedby="attelepites-darab-sugo"
                                required
                            />
                            <FieldDescription id="attelepites-darab-sugo">
                                A forrás tóban: {keszlet.toLocaleString("hu-HU")} db
                            </FieldDescription>
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="attelepites-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                        <Textarea
                            id="attelepites-megjegyzes"
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
