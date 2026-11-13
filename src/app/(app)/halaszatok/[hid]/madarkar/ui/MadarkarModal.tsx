"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Trash2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Modal } from "@/components/ui/modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MADARFAJ_JAVASLATOK, MAX_FOTO_DB } from "@/lib/madarkar/madarkar";

import { feltolt, fotoUrl, kicsinyit, type KicsinyitettKep } from "./kep";

export type ToOpcio = { azonosito: number; nev: string };

export type MadarkarEsemenyUI = {
    id: number;
    datum: string;
    toId: number;
    toNev: string;
    madarfaj: string;
    egyedszam: number | null;
    halvesztesegKg: number | null;
    karFt: number | null;
    megjegyzes: string | null;
    rogzitoNev: string | null;
    fotok: Array<{ id: number; szelesseg: number | null; magassag: number | null }>;
    modosithato: boolean;
};

const maISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const str = (x: number | null) => (x == null ? "" : String(x));

function SzamMezo({ id, cimke, egyseg, ertek, onChange, disabled, egesz }: {
    id: string; cimke: string; egyseg: string; ertek: string; onChange: (v: string) => void; disabled: boolean; egesz?: boolean;
}) {
    return (
        <Field>
            <FieldLabel htmlFor={id}>{cimke}</FieldLabel>
            <InputGroup>
                <InputGroupInput
                    id={id}
                    type="number"
                    inputMode={egesz ? "numeric" : "decimal"}
                    step={egesz ? 1 : "any"}
                    min="0"
                    value={ertek}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="–"
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>{egyseg}</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}

/**
 * Madárkár-bejegyzés létrehozása / szerkesztése, fényképekkel.
 * A képek mentés UTÁN töltődnek fel (az új bejegyzés azonosítójához).
 */
export function MadarkarModal({ hid, open, onOpenChange, toak, esemeny, alapToId, onMentve }: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    toak: ToOpcio[];
    /** Szerkesztésnél a meglévő bejegyzés; létrehozásnál undefined. */
    esemeny?: MadarkarEsemenyUI | null;
    /** Létrehozáskor előre kiválasztott tó (pl. szűrőből). */
    alapToId?: number | null;
    onMentve: () => void;
}) {
    const listaId = useId();
    const fajlRef = useRef<HTMLInputElement>(null);

    const [toId, setToId] = useState("");
    const [datum, setDatum] = useState(maISO());
    const [madarfaj, setMadarfaj] = useState("");
    const [egyedszam, setEgyedszam] = useState("");
    const [halveszteseg, setHalveszteseg] = useState("");
    const [kar, setKar] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [meglevoFotok, setMeglevoFotok] = useState<MadarkarEsemenyUI["fotok"]>([]);
    const [ujFotok, setUjFotok] = useState<KicsinyitettKep[]>([]);
    const [feldolgozas, setFeldolgozas] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    // Megnyitáskor feltöltés (szerkesztés) / alaphelyzet (új).
    useEffect(() => {
        if (!open) return;
        setToId(esemeny ? String(esemeny.toId) : alapToId ? String(alapToId) : toak.length === 1 ? String(toak[0].azonosito) : "");
        setDatum(esemeny ? esemeny.datum.slice(0, 10) : maISO());
        setMadarfaj(esemeny?.madarfaj ?? "");
        setEgyedszam(str(esemeny?.egyedszam ?? null));
        setHalveszteseg(str(esemeny?.halvesztesegKg ?? null));
        setKar(str(esemeny?.karFt ?? null));
        setMegjegyzes(esemeny?.megjegyzes ?? "");
        setMeglevoFotok(esemeny?.fotok ?? []);
        setUjFotok((r) => { r.forEach((f) => URL.revokeObjectURL(f.elonezet)); return []; });
        setHiba(null);
    }, [open, esemeny, alapToId, toak]);

    // Az előnézeti object URL-ek felszabadítása a modál megszűnésekor.
    const ujFotokRef = useRef(ujFotok);
    useEffect(() => { ujFotokRef.current = ujFotok; }, [ujFotok]);
    useEffect(() => () => ujFotokRef.current.forEach((f) => URL.revokeObjectURL(f.elonezet)), []);

    function ujFotoEltavolitasa(i: number) {
        setUjFotok((r) => {
            const torolt = r[i];
            if (torolt) URL.revokeObjectURL(torolt.elonezet);
            return r.filter((_, j) => j !== i);
        });
    }

    const szabadHely = MAX_FOTO_DB - meglevoFotok.length - ujFotok.length;

    async function fajlokValasztva(fajlok: FileList | null) {
        if (!fajlok?.length) return;
        const lista = [...fajlok].slice(0, Math.max(0, szabadHely));
        if (fajlok.length > lista.length) toast.warning(`Legfeljebb ${MAX_FOTO_DB} kép csatolható.`);
        setFeldolgozas(true);
        const kesz: KicsinyitettKep[] = [];
        for (const f of lista) {
            try {
                kesz.push(await kicsinyit(f));
            } catch {
                toast.error(`Nem sikerült beolvasni: ${f.name}`, { description: "JPEG, PNG vagy WebP kép tölthető fel." });
            }
        }
        setUjFotok((r) => [...r, ...kesz]);
        setFeldolgozas(false);
        if (fajlRef.current) fajlRef.current.value = "";
    }

    async function meglevoTorlese(fotoId: number) {
        const res = await fetch(fotoUrl(hid, fotoId), { method: "DELETE" });
        if (!res.ok) { toast.error("Nem sikerült törölni a képet."); return; }
        setMeglevoFotok((r) => r.filter((f) => f.id !== fotoId));
        onMentve();
    }

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (!toId) { setHiba("Válaszd ki az érintett tóegységet."); return; }
        if (madarfaj.trim().length < 2) { setHiba("Add meg a madárfajt."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const body = {
                toId: Number(toId),
                // Dél (UTC): bármely időzónában ugyanarra a napra esik.
                datum: `${datum}T12:00:00.000Z`,
                madarfaj: madarfaj.trim(),
                egyedszam: egyedszam || null,
                halvesztesegKg: halveszteseg || null,
                karFt: kar || null,
                megjegyzes: megjegyzes.trim() || null,
            };
            const res = await fetch(
                esemeny ? `/api/halaszatok/${hid}/madarkar/${esemeny.id}` : `/api/halaszatok/${hid}/madarkar`,
                { method: esemeny ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.error ?? "Nem sikerült menteni."); return; }

            const esemenyId: number = esemeny ? esemeny.id : json.id;
            let hibasKep = 0;
            for (const kep of ujFotok) {
                try { await feltolt(hid, esemenyId, kep); } catch { hibasKep++; }
            }

            if (hibasKep > 0) toast.warning("A bejegyzés elmentve, de néhány kép feltöltése nem sikerült.", { description: `${hibasKep} kép hiányzik.` });
            else toast.success(esemeny ? "Madárkár-bejegyzés frissítve" : "Madárkár rögzítve", { description: madarfaj.trim() });

            onOpenChange(false);
            onMentve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    const foglalt = saving || feldolgozas;

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={esemeny ? "Madárkár-bejegyzés szerkesztése" : "Madárkár rögzítése"}
            description="Érintett tóegység, madárfaj, becsült egyedszám és kár, fényképek."
            size="lg"
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="madarkar-urlap" loading={saving} disabled={feldolgozas}>
                        {esemeny ? "Mentés" : "Rögzítés"}
                    </Button>
                </>
            }
        >
            <form id="madarkar-urlap" onSubmit={kuldes}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="madarkar-to">
                                Tóegység <span className="text-destructive" aria-hidden="true">*</span>
                            </FieldLabel>
                            <NativeSelect id="madarkar-to" value={toId} onChange={(e) => setToId(e.target.value)} disabled={foglalt} required>
                                <NativeSelectOption value="">Válassz…</NativeSelectOption>
                                {toak.map((t) => <NativeSelectOption key={t.azonosito} value={t.azonosito}>{t.nev}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="madarkar-datum">
                                Dátum <span className="text-destructive" aria-hidden="true">*</span>
                            </FieldLabel>
                            <DatePicker id="madarkar-datum" value={datum} onChange={setDatum} disabled={foglalt} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                        <Field>
                            <FieldLabel htmlFor="madarkar-faj">
                                Madárfaj <span className="text-destructive" aria-hidden="true">*</span>
                            </FieldLabel>
                            <Input
                                id="madarkar-faj"
                                list={listaId}
                                value={madarfaj}
                                onChange={(e) => setMadarfaj(e.target.value)}
                                placeholder="pl. Nagy kárókatona"
                                disabled={foglalt}
                                required
                                minLength={2}
                                maxLength={100}
                                autoComplete="off"
                            />
                            <datalist id={listaId}>
                                {MADARFAJ_JAVASLATOK.map((f) => <option key={f} value={f} />)}
                            </datalist>
                        </Field>
                        <SzamMezo id="madarkar-egyedszam" cimke="Becsült egyedszám" egyseg="db" ertek={egyedszam} onChange={setEgyedszam} disabled={foglalt} egesz />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <SzamMezo id="madarkar-veszteseg" cimke="Becsült halveszteség" egyseg="kg" ertek={halveszteseg} onChange={setHalveszteseg} disabled={foglalt} />
                        <SzamMezo id="madarkar-kar" cimke="Becsült pénzügyi kár" egyseg="Ft" ertek={kar} onChange={setKar} disabled={foglalt} egesz />
                    </div>

                    <Field>
                        <FieldLabel htmlFor="madarkar-megjegyzes">Megjegyzés</FieldLabel>
                        <Textarea id="madarkar-megjegyzes" rows={3} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={foglalt} maxLength={2000} />
                    </Field>

                    <Field>
                        <FieldLabel>Fényképek</FieldLabel>
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {meglevoFotok.map((f) => (
                                <li key={`m-${f.id}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                                    {/* Hitelesített API-ról jövő kép → sima <img> (a next/image optimalizáló nem fér hozzá). */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={fotoUrl(hid, f.id)} alt="Csatolt fénykép" className="size-full object-cover" loading="lazy" />
                                    {esemeny?.modosithato && (
                                        <button
                                            type="button"
                                            onClick={() => void meglevoTorlese(f.id)}
                                            disabled={foglalt}
                                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                                            aria-label="Kép törlése"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </li>
                            ))}
                            {ujFotok.map((f, i) => (
                                <li key={f.elonezet} className="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-primary/50 bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={f.elonezet} alt="Feltöltendő fénykép" className="size-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => ujFotoEltavolitasa(i)}
                                        disabled={foglalt}
                                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                                        aria-label="Kép eltávolítása"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                            {szabadHely > 0 && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => fajlRef.current?.click()}
                                        disabled={foglalt}
                                        className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                                    >
                                        <ImagePlus className="size-5" aria-hidden="true" />
                                        {feldolgozas ? "Feldolgozás…" : "Kép hozzáadása"}
                                    </button>
                                </li>
                            )}
                        </ul>
                        <input
                            ref={fajlRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => void fajlokValasztva(e.target.files)}
                        />
                        <FieldDescription>
                            Legfeljebb {MAX_FOTO_DB} kép. Feltöltés előtt automatikusan lekicsinyítjük (max. 1600 px), így mobilnetről is gyors.
                        </FieldDescription>
                    </Field>

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
