"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
    ALAP_RAHAGYAS,
    ciklusOsszegzes,
    ikrasSorSzamitas,
    tejesSorSzamitas,
    type Protokoll,
} from "@/lib/halkeltes/szamitas";
import { HibaAlert, MertekegysegesInput } from "@/components/app/urlap";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { CiklusOsszegzesPanel } from "./CiklusOsszegzes";
import { fmt, num } from "./halkeltes";

type Halfaj = { azonosito: number; nev: string };

type IkrasSor = { chipAzonosito: string; fajtaJeloles: string; tomegKg: string; ikraKg: string; megjegyzes: string };
type TejesSor = { chipAzonosito: string; fajtaJeloles: string; tomegKg: string; tejMl: string; megjegyzes: string };

function ujIkrasSor(): IkrasSor { return { chipAzonosito: "", fajtaJeloles: "", tomegKg: "", ikraKg: "", megjegyzes: "" }; }
function ujTejesSor(): TejesSor { return { chipAzonosito: "", fajtaJeloles: "", tomegKg: "", tejMl: "", megjegyzes: "" }; }

// ─── Sorszerkesztő ───────────────────────────────────────────────────────────

type Oszlop<T> = { kulcs: keyof T & string; cimke: string; egyseg?: string; szam?: boolean };

/**
 * Halankénti sorok szerkesztése. sm-től táblázatszerű rács közös fejléccel,
 * mobilon minden sor egy kis kártya saját feliratokkal.
 */
function SorSzerkeszto<T extends Record<string, string>>({ cim, leiras, idPrefix, oszlopok, sorok, adag, onAdd, onRemove, onMod }: {
    cim: string;
    leiras: string;
    idPrefix: string;
    oszlopok: Oszlop<T>[];
    sorok: T[];
    adag: (sor: T) => string;
    onAdd: () => void;
    onRemove: (i: number) => void;
    onMod: (i: number, patch: Partial<T>) => void;
}) {
    const racs = "sm:grid-cols-[1fr_1fr_110px_110px_1.2fr_auto]";
    return (
        <FieldSet>
            <div className="flex items-end justify-between gap-3">
                <div>
                    <FieldLegend className="mb-0">{cim}</FieldLegend>
                    <FieldDescription>{leiras}</FieldDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}>
                    <Plus />
                    Hal hozzáadása
                </Button>
            </div>

            {/* Közös fejléc (csak sm-től) */}
            <div className={`hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid ${racs}`} aria-hidden="true">
                {oszlopok.map((o) => <span key={o.kulcs}>{o.cimke}{o.egyseg ? ` (${o.egyseg})` : ""}</span>)}
                <span className="w-9" />
            </div>

            <ol className="grid gap-2">
                {sorok.map((s, i) => (
                    <li key={i} className="rounded-lg border bg-card p-3 sm:p-2">
                        <div className={`grid grid-cols-2 items-end gap-2 ${racs}`}>
                            {oszlopok.map((o) => {
                                const id = `${idPrefix}-${i}-${o.kulcs}`;
                                return (
                                    <div key={o.kulcs} className={o.kulcs === "megjegyzes" ? "col-span-2 grid gap-1 sm:col-span-1" : "grid gap-1"}>
                                        <label htmlFor={id} className="text-xs text-muted-foreground sm:sr-only">
                                            {o.cimke} ({i + 1}. hal)
                                        </label>
                                        {o.szam && o.egyseg ? (
                                            <MertekegysegesInput
                                                id={id}
                                                egyseg={o.egyseg}
                                                min={0}
                                                step="0.01"
                                                value={s[o.kulcs]}
                                                onChange={(e) => onMod(i, { [o.kulcs]: e.target.value } as Partial<T>)}
                                            />
                                        ) : (
                                            <Input
                                                id={id}
                                                value={s[o.kulcs]}
                                                onChange={(e) => onMod(i, { [o.kulcs]: e.target.value } as Partial<T>)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                            <IconButton
                                label={`${i + 1}. hal törlése`}
                                icon={<Trash2 />}
                                variant="ghost-destructive"
                                size="icon-sm"
                                className="col-span-2 justify-self-end sm:col-span-1"
                                onClick={() => onRemove(i)}
                                disabled={sorok.length === 1}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground tabular-nums sm:px-1">
                            <span className="font-medium text-foreground">{i + 1}. hal adagja:</span> {adag(s)}
                        </p>
                    </li>
                ))}
            </ol>
        </FieldSet>
    );
}

// ─── Modál ───────────────────────────────────────────────────────────────────

export function UjCiklusModal({ hid, open, onOpenChange, onLetrehozva }: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLetrehozva: () => void;
}) {
    const [nev, setNev] = useState("");
    const [halfajId, setHalfajId] = useState("");
    const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
    const [oltas, setOltas] = useState("");
    const [homerseklet, setHomerseklet] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);

    // Protokoll értékek (konfigurálható; alap üres, ráhagyás 1,10)
    const [ikrasEloadag, setIkrasEloadag] = useState("");
    const [ikrasDonto, setIkrasDonto] = useState("");
    const [ikrasMl, setIkrasMl] = useState("");
    const [tejesMg, setTejesMg] = useState("");
    const [tejesMl, setTejesMl] = useState("");
    const [rahagyas, setRahagyas] = useState(String(ALAP_RAHAGYAS));

    const [ikrasSorok, setIkrasSorok] = useState<IkrasSor[]>([ujIkrasSor()]);
    const [tejesSorok, setTejesSorok] = useState<TejesSor[]>([ujTejesSor()]);

    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(json?.items)) setHalfajok(json.items);
            } catch { /* opcionális */ }
        })();
    }, [hid, open]);

    const protokoll: Protokoll = useMemo(() => ({
        ikrasEloadagMgPerKg: num(ikrasEloadag),
        ikrasDontoMgPerKg: num(ikrasDonto),
        ikrasMlPerKg: num(ikrasMl),
        tejesMgPerKg: num(tejesMg),
        tejesMlPerKg: num(tejesMl),
        rahagyasSzorzo: num(rahagyas) ?? ALAP_RAHAGYAS,
    }), [ikrasEloadag, ikrasDonto, ikrasMl, tejesMg, tejesMl, rahagyas]);

    const elonezet = useMemo(() => ciklusOsszegzes(
        ikrasSorok.map((s) => ({ tomegKg: num(s.tomegKg), ikraKg: num(s.ikraKg) })),
        tejesSorok.map((s) => ({ tomegKg: num(s.tomegKg), tejMl: num(s.tejMl) })),
        protokoll,
    ), [ikrasSorok, tejesSorok, protokoll]);

    function alaphelyzet() {
        setNev(""); setHalfajId(""); setDatum(new Date().toISOString().slice(0, 10)); setOltas("");
        setHomerseklet(""); setMegjegyzes(""); setIkrasEloadag(""); setIkrasDonto(""); setIkrasMl("");
        setTejesMg(""); setTejesMl(""); setRahagyas(String(ALAP_RAHAGYAS));
        setIkrasSorok([ujIkrasSor()]); setTejesSorok([ujTejesSor()]); setHiba(null);
    }

    async function mentes(e: React.FormEvent) {
        e.preventDefault();
        if (!datum) return setHiba("A dátum kötelező.");
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev: nev.trim() || null,
                    halfajId: halfajId || null,
                    datum,
                    oltasIdopont: oltas || null,
                    homersekletC: num(homerseklet),
                    megjegyzes: megjegyzes.trim() || null,
                    protokoll: {
                        ikrasEloadagMgPerKg: num(ikrasEloadag), ikrasDontoMgPerKg: num(ikrasDonto), ikrasMlPerKg: num(ikrasMl),
                        tejesMgPerKg: num(tejesMg), tejesMlPerKg: num(tejesMl), rahagyasSzorzo: num(rahagyas),
                    },
                    ikrasSorok: ikrasSorok.map((s, i) => ({
                        sorszam: i + 1, chipAzonosito: s.chipAzonosito || null, fajtaJeloles: s.fajtaJeloles || null,
                        tomegKg: num(s.tomegKg), ikraKg: num(s.ikraKg), megjegyzes: s.megjegyzes || null,
                    })),
                    tejesSorok: tejesSorok.map((s, i) => ({
                        sorszam: i + 1, chipAzonosito: s.chipAzonosito || null, fajtaJeloles: s.fajtaJeloles || null,
                        tomegKg: num(s.tomegKg), tejMl: num(s.tejMl), megjegyzes: s.megjegyzes || null,
                    })),
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return setHiba(json?.error ?? "Nem sikerült menteni.");
            toast.success("Keltetési ciklus létrehozva", { description: nev.trim() || undefined });
            alaphelyzet();
            onOpenChange(false);
            onLetrehozva();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    const protokollMezo = (id: string, cimke: string, egyseg: string, ertek: string, set: (v: string) => void) => (
        <Field>
            <FieldLabel htmlFor={id} className="text-xs">{cimke}</FieldLabel>
            <MertekegysegesInput id={id} egyseg={egyseg} min={0} step="0.01" value={ertek} onChange={(e) => set(e.target.value)} disabled={saving} />
        </Field>
    );

    return (
        <Modal
            open={open}
            onOpenChange={(v) => { if (!v) setHiba(null); onOpenChange(v); }}
            title="Új halkeltetési ciklus"
            description="Ikráztatás, oltási adagok és az ikrás/tejes halak rögzítése."
            size="xl"
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="uj-ciklus" loading={saving}>Ciklus mentése</Button>
                </>
            }
        >
            <form id="uj-ciklus" onSubmit={mentes}>
                <FieldGroup>
                    {/* Alapadatok */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field className="lg:col-span-2">
                            <FieldLabel htmlFor="ciklus-nev">Ciklus neve</FieldLabel>
                            <Input id="ciklus-nev" value={nev} onChange={(e) => setNev(e.target.value)} placeholder="pl. Ponty 2026 tavasz" disabled={saving} autoFocus />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="ciklus-faj">Halfaj</FieldLabel>
                            <NativeSelect id="ciklus-faj" value={halfajId} onChange={(e) => setHalfajId(e.target.value)} disabled={saving}>
                                <NativeSelectOption value="">Nincs megadva</NativeSelectOption>
                                {halfajok.map((h) => <NativeSelectOption key={h.azonosito} value={h.azonosito}>{h.nev}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="ciklus-datum">Dátum</FieldLabel>
                            <DatePicker id="ciklus-datum" value={datum} onChange={setDatum} disabled={saving} required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="ciklus-oltas">Oltás időpontja</FieldLabel>
                            <DateTimePicker id="ciklus-oltas" value={oltas} onChange={setOltas} disabled={saving} clearable />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="ciklus-homerseklet">Vízhőmérséklet</FieldLabel>
                            <MertekegysegesInput id="ciklus-homerseklet" egyseg="°C" step="0.1" value={homerseklet} onChange={(e) => setHomerseklet(e.target.value)} disabled={saving} placeholder="pl. 20,5" />
                        </Field>
                    </div>

                    <Separator />

                    {/* Protokoll */}
                    <FieldSet>
                        <FieldLegend className="mb-0">Oltási protokoll</FieldLegend>
                        <FieldDescription>Testtömeg-kilogrammonkénti adagok — ezekből számoljuk halanként az oltóanyagot.</FieldDescription>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {protokollMezo("p-ikras-elo", "Ikrás előadag", "mg/kg", ikrasEloadag, setIkrasEloadag)}
                            {protokollMezo("p-ikras-donto", "Ikrás döntőadag", "mg/kg", ikrasDonto, setIkrasDonto)}
                            {protokollMezo("p-ikras-ml", "Ikrás oldat", "ml/kg", ikrasMl, setIkrasMl)}
                            {protokollMezo("p-tejes-mg", "Tejes adag", "mg/kg", tejesMg, setTejesMg)}
                            {protokollMezo("p-tejes-ml", "Tejes oldat", "ml/kg", tejesMl, setTejesMl)}
                            {protokollMezo("p-rahagyas", "Ráhagyás", "×", rahagyas, setRahagyas)}
                        </div>
                    </FieldSet>

                    <Separator />

                    <SorSzerkeszto<IkrasSor>
                        cim="Ikrás (nőstény) halak"
                        leiras="Halanként: chip, jelölés, testtömeg és a lefejt ikra."
                        idPrefix="ikras"
                        oszlopok={[
                            { kulcs: "chipAzonosito", cimke: "Chip" },
                            { kulcs: "fajtaJeloles", cimke: "Fajta / jelölés" },
                            { kulcs: "tomegKg", cimke: "Tömeg", egyseg: "kg", szam: true },
                            { kulcs: "ikraKg", cimke: "Ikra", egyseg: "kg", szam: true },
                            { kulcs: "megjegyzes", cimke: "Megjegyzés" },
                        ]}
                        sorok={ikrasSorok}
                        adag={(s) => {
                            const sz = ikrasSorSzamitas({ tomegKg: num(s.tomegKg) }, protokoll);
                            return `előadag ${fmt(sz.eloadagMg, "mg")} · döntő ${fmt(sz.dontoMg, "mg")} · ${fmt(sz.ml, "ml")}`;
                        }}
                        onAdd={() => setIkrasSorok((v) => [...v, ujIkrasSor()])}
                        onRemove={(i) => setIkrasSorok((v) => v.filter((_, idx) => idx !== i))}
                        onMod={(i, patch) => setIkrasSorok((v) => v.map((s, idx) => idx === i ? { ...s, ...patch } : s))}
                    />

                    <SorSzerkeszto<TejesSor>
                        cim="Tejes (hím) halak"
                        leiras="Halanként: chip, jelölés, testtömeg és a lefejt tej."
                        idPrefix="tejes"
                        oszlopok={[
                            { kulcs: "chipAzonosito", cimke: "Chip" },
                            { kulcs: "fajtaJeloles", cimke: "Fajta / jelölés" },
                            { kulcs: "tomegKg", cimke: "Tömeg", egyseg: "kg", szam: true },
                            { kulcs: "tejMl", cimke: "Tej", egyseg: "ml", szam: true },
                            { kulcs: "megjegyzes", cimke: "Megjegyzés" },
                        ]}
                        sorok={tejesSorok}
                        adag={(s) => {
                            const sz = tejesSorSzamitas({ tomegKg: num(s.tomegKg) }, protokoll);
                            return `${fmt(sz.mg, "mg")} · ${fmt(sz.ml, "ml")}`;
                        }}
                        onAdd={() => setTejesSorok((v) => [...v, ujTejesSor()])}
                        onRemove={(i) => setTejesSorok((v) => v.filter((_, idx) => idx !== i))}
                        onMod={(i, patch) => setTejesSorok((v) => v.map((s, idx) => idx === i ? { ...s, ...patch } : s))}
                    />

                    <CiklusOsszegzesPanel o={elonezet} cim="Összegzés (előnézet)" />

                    <Field>
                        <FieldLabel htmlFor="ciklus-megjegyzes">Megjegyzés</FieldLabel>
                        <Textarea id="ciklus-megjegyzes" rows={2} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={saving} />
                    </Field>

                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
