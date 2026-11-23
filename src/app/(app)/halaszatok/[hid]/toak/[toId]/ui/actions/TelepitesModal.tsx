"use client";

import { useEffect, useState } from "react";
import { Calculator, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    ATLAG_EGYSEGEK,
    becsultKg,
    darabSulybol,
    OSSZTOMEG_CIMKE,
    OSSZTOMEG_EGYSEGEK,
    type AtlagEgyseg,
    type OsszTomegEgyseg,
} from "@/lib/allomany/tomeg";

import { HibaAlert, MertekegysegesInput, MertekegysegValasztoInput } from "@/components/app/urlap";

import { apiHiba, MuveletLablec, type MuveletModalProps } from "./kozos";

type Halfaj = { azonosito: number; nev: string };
type Mod = "suly" | "darab";

const hu = (n: number, t = 2) => n.toLocaleString("hu-HU", { maximumFractionDigits: t });

/**
 * Hal telepítése. Alapból SÚLY alapján: össztömeg (kg / mázsa / tonna) +
 * átlagsúly (g / kg) → a darabszámot a rendszer számolja. Darab alapján is
 * rögzíthető (opcionális tömegtartománnyal). Új halfaj közvetlenül itt is felvehető.
 */
export default function TelepitesModal({ open, onOpenChange, hid, toId, onMentve }: MuveletModalProps) {
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);
    const [halfajBetoltve, setHalfajBetoltve] = useState(false);
    const [halfajId, setHalfajId] = useState<number>(0);

    const [ujHalfajNyitva, setUjHalfajNyitva] = useState(false);
    const [ujHalfajNev, setUjHalfajNev] = useState("");
    const [ujHalfajMentes, setUjHalfajMentes] = useState(false);

    const [mod, setMod] = useState<Mod>("suly");
    // Súly alapú
    const [osszTomeg, setOsszTomeg] = useState("");
    const [osszEgyseg, setOsszEgyseg] = useState<OsszTomegEgyseg>("kg");
    const [atlagSuly, setAtlagSuly] = useState("");
    const [atlagEgyseg, setAtlagEgyseg] = useState<AtlagEgyseg>("kg");
    // Darab alapú
    const [darab, setDarab] = useState("");
    const [minKg, setMinKg] = useState("");
    const [maxKg, setMaxKg] = useState("");

    const [forras, setForras] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setErr(null);
        setOsszTomeg("");
        setAtlagSuly("");
        setDarab("");
        setMinKg("");
        setMaxKg("");
        setForras("");
        setMegjegyzes("");
        setUjHalfajNyitva(false);
        setUjHalfajNev("");
        setHalfajBetoltve(false);
        fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                const items: Halfaj[] = j?.items ?? j ?? [];
                setHalfajok(items);
                // A korábban választott faj marad, ha még létezik; különben az első.
                setHalfajId((prev) => (items.some((h) => h.azonosito === prev) ? prev : items[0]?.azonosito ?? 0));
                if (items.length === 0) setUjHalfajNyitva(true);
            })
            .catch(() => {})
            .finally(() => setHalfajBetoltve(true));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function ujHalfajMentese() {
        const nev = ujHalfajNev.trim();
        if (nev.length < 2) { setErr("A halfaj neve legalább 2 karakter legyen."); return; }
        setUjHalfajMentes(true);
        setErr(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErr(res.status === 409
                    ? "Ilyen nevű halfaj már van (lehet, hogy archiválva) — a Halfajok oldalon tudod újra aktiválni."
                    : apiHiba(json, "Nem sikerült felvenni a halfajt."));
                return;
            }
            const item: Halfaj = json.item;
            setHalfajok((r) => [...r, item].sort((a, b) => a.nev.localeCompare(b.nev, "hu")));
            setHalfajId(item.azonosito);
            setUjHalfajNyitva(false);
            setUjHalfajNev("");
            toast.success("Halfaj felvéve", { description: item.nev });
        } finally {
            setUjHalfajMentes(false);
        }
    }

    // ── Számolt értékek ────────────────────────────────────────────────────
    const sulyEredmeny = mod === "suly" && osszTomeg && atlagSuly ? darabSulybol(osszTomeg, osszEgyseg, atlagSuly, atlagEgyseg) : null;
    const darabSzam = Math.floor(Number(darab));
    const min = Number(minKg.replace(",", "."));
    const max = Number(maxKg.replace(",", "."));
    const darabModKg = mod === "darab" && darabSzam > 0 && min > 0 && max > 0 ? becsultKg({ darab: darabSzam, minTomegKg: min, maxTomegKg: max }) : null;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!halfajId) return setErr("Válassz halfajt (vagy vegyél fel újat).");

        let payload: Record<string, unknown>;
        let osszegzes: string;
        if (mod === "suly") {
            const r = darabSulybol(osszTomeg, osszEgyseg, atlagSuly, atlagEgyseg);
            if (!r.ok) return setErr(r.hiba);
            payload = { darab: r.darab, minTomegKg: r.atlagTomegKg, maxTomegKg: r.atlagTomegKg, osszTomegKg: r.osszTomegKg };
            osszegzes = `${hu(r.osszTomegKg)} kg · ${r.darab.toLocaleString("hu-HU")} db`;
        } else {
            if (!Number.isFinite(darabSzam) || darabSzam <= 0) return setErr("A darabszám legyen pozitív egész.");
            if (min > 0 && max > 0 && min > max) return setErr("A minimum tömeg nem lehet nagyobb a maximumnál.");
            payload = { darab: darabSzam, ...(min > 0 && max > 0 ? { minTomegKg: min, maxTomegKg: max } : {}) };
            osszegzes = `${darabSzam.toLocaleString("hu-HU")} db`;
        }

        setSaving(true);
        setErr(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/telepites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ halfajId, ...payload, forras: forras || null, megjegyzes: megjegyzes || null }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(apiHiba(json, "Hiba a telepítés mentésekor."));

            const nev = halfajok.find((h) => h.azonosito === halfajId)?.nev;
            toast.success("Telepítés rögzítve", { description: `${nev ?? ""} — ${osszegzes}`.trim() });
            onOpenChange(false);
            await onMentve();
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    const foglalt = saving || ujHalfajMentes;

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Hal telepítése"
            description="Súly alapján (össztömeg + átlagsúly → darab) vagy darabszám alapján."
            preventClose={saving}
            footer={<MuveletLablec formId="telepites-urlap" saving={saving} onMegse={() => onOpenChange(false)} disabled={!halfajId || ujHalfajMentes} />}
        >
            <form id="telepites-urlap" onSubmit={submit}>
                <FieldGroup>
                    {/* ── Halfaj ── */}
                    <Field>
                        <FieldLabel htmlFor={ujHalfajNyitva ? "telepites-uj-halfaj" : "telepites-halfaj"}>Halfaj</FieldLabel>
                        {ujHalfajNyitva ? (
                            <div className="flex gap-2">
                                <Input
                                    id="telepites-uj-halfaj"
                                    value={ujHalfajNev}
                                    onChange={(e) => setUjHalfajNev(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); void ujHalfajMentese(); }
                                    }}
                                    placeholder="pl. Amur, Busa, Csuka…"
                                    disabled={foglalt}
                                    autoFocus
                                    maxLength={100}
                                />
                                <Button type="button" onClick={() => void ujHalfajMentese()} loading={ujHalfajMentes}>
                                    Felvétel
                                </Button>
                                {halfajok.length > 0 && (
                                    <IconButton
                                        type="button"
                                        label="Vissza a halfajlistához"
                                        icon={<X />}
                                        onClick={() => setUjHalfajNyitva(false)}
                                        disabled={foglalt}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <NativeSelect
                                    id="telepites-halfaj"
                                    value={halfajId}
                                    onChange={(e) => setHalfajId(Number(e.target.value))}
                                    disabled={foglalt || halfajok.length === 0}
                                    className="flex-1"
                                >
                                    {halfajok.length ? (
                                        halfajok.map((h) => (
                                            <NativeSelectOption key={h.azonosito} value={h.azonosito}>{h.nev}</NativeSelectOption>
                                        ))
                                    ) : (
                                        <NativeSelectOption value={0}>{halfajBetoltve ? "Nincs halfaj" : "Betöltés…"}</NativeSelectOption>
                                    )}
                                </NativeSelect>
                                <Button type="button" variant="outline" onClick={() => setUjHalfajNyitva(true)} disabled={foglalt}>
                                    <Plus />
                                    Új halfaj
                                </Button>
                            </div>
                        )}
                        {halfajBetoltve && halfajok.length === 0 && (
                            <FieldDescription>Még nincs halfaj ennél a halászatnál — vedd fel az elsőt itt.</FieldDescription>
                        )}
                    </Field>

                    {/* ── Mód ── */}
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        spacing={2}
                        value={mod}
                        onValueChange={(v) => v && setMod(v as Mod)}
                        aria-label="Telepítés módja"
                        className="grid w-full grid-cols-2"
                        disabled={foglalt}
                    >
                        <ToggleGroupItem value="suly">Súly alapján</ToggleGroupItem>
                        <ToggleGroupItem value="darab">Darab alapján</ToggleGroupItem>
                    </ToggleGroup>

                    {mod === "suly" ? (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="telepites-ossztomeg">Telepített össztömeg</FieldLabel>
                                    <MertekegysegValasztoInput
                                        id="telepites-ossztomeg"
                                        step="any"
                                        min="0"
                                        value={osszTomeg}
                                        onChange={(e) => setOsszTomeg(e.target.value)}
                                        egyseg={osszEgyseg}
                                        egysegek={OSSZTOMEG_EGYSEGEK}
                                        onEgysegChange={setOsszEgyseg}
                                        egysegCimke={(e) => OSSZTOMEG_CIMKE[e]}
                                        egysegLabel="Össztömeg mértékegysége"
                                        disabled={foglalt}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="telepites-atlagsuly">Átlagsúly (egyedenként)</FieldLabel>
                                    <MertekegysegValasztoInput
                                        id="telepites-atlagsuly"
                                        step="any"
                                        min="0"
                                        value={atlagSuly}
                                        onChange={(e) => setAtlagSuly(e.target.value)}
                                        egyseg={atlagEgyseg}
                                        egysegek={ATLAG_EGYSEGEK}
                                        onEgysegChange={setAtlagEgyseg}
                                        egysegLabel="Átlagsúly mértékegysége"
                                        disabled={foglalt}
                                        required
                                    />
                                </Field>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm" aria-live="polite">
                                <Calculator className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                {sulyEredmeny?.ok ? (
                                    <span>
                                        Számolt darabszám: <span className="font-semibold tabular-nums">{sulyEredmeny.darab.toLocaleString("hu-HU")} db</span>
                                        <span className="text-muted-foreground"> ({hu(sulyEredmeny.osszTomegKg)} kg ÷ {hu(sulyEredmeny.atlagTomegKg * 1000, 1)} g)</span>
                                    </span>
                                ) : sulyEredmeny && !sulyEredmeny.ok ? (
                                    <span className="text-destructive">{sulyEredmeny.hiba}</span>
                                ) : (
                                    <span className="text-muted-foreground">Add meg az össztömeget és az átlagsúlyt — a darabszámot a rendszer számolja.</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Field>
                                <FieldLabel htmlFor="telepites-darab">Darabszám</FieldLabel>
                                <MertekegysegesInput
                                    id="telepites-darab"
                                    egyseg="db"
                                    inputMode="numeric"
                                    min={1}
                                    step={1}
                                    value={darab}
                                    onChange={(e) => setDarab(e.target.value)}
                                    disabled={foglalt}
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Tömegtartomány (egyedenként, opcionális)</FieldLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <MertekegysegesInput aria-label="Minimum tömeg" egyseg="kg" step="any" min={0} placeholder="min" value={minKg} onChange={(e) => setMinKg(e.target.value)} disabled={foglalt} />
                                    <MertekegysegesInput aria-label="Maximum tömeg" egyseg="kg" step="any" min={0} placeholder="max" value={maxKg} onChange={(e) => setMaxKg(e.target.value)} disabled={foglalt} />
                                </div>
                                <FieldDescription>
                                    {darabModKg != null
                                        ? `Becsült össztömeg: ${hu(darabModKg)} kg`
                                        : "Ebből becsüljük a tó halállományát kilogrammban. Ivadéknál grammot kg-ban add meg (pl. 5 g = 0,005 kg)."}
                                </FieldDescription>
                            </Field>
                        </>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="telepites-forras">Forrás (opcionális)</FieldLabel>
                            <Input id="telepites-forras" value={forras} onChange={(e) => setForras(e.target.value)} disabled={foglalt} placeholder="pl. saját keltető" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="telepites-megjegyzes">Megjegyzés (opcionális)</FieldLabel>
                            <Input id="telepites-megjegyzes" value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={foglalt} />
                        </Field>
                    </div>

                    <HibaAlert uzenet={err} />
                </FieldGroup>
            </form>
        </Modal>
    );
}
