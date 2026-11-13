"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

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
import {
    datumIg,
    kgBan,
    TIPUS_META,
    TOKEZELES_TIPUSOK,
    varakozasVege,
    type Egyseg,
    type TokezelesTipus,
} from "@/lib/tokezeles/tokezeles";

export type ToOpcio = { azonosito: number; nev: string; teruletHa: number | null };

export type TokezelesUI = {
    id: number;
    datum: string;
    toId: number;
    toNev: string;
    tipus: TokezelesTipus;
    keszitmeny: string | null;
    hatoanyag: string | null;
    mennyiseg: number;
    egyseg: string;
    koltsegFt: number | null;
    varakozasiIdoNap: number | null;
    varakozasVege: string | null;
    varakozasTart: boolean;
    kezelesOka: string | null;
    megjegyzes: string | null;
    rogzitoNev: string | null;
    modosithato: boolean;
};

const maISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const str = (x: number | null | undefined) => (x == null ? "" : String(x));
const hu = (n: number, t = 1) => n.toLocaleString("hu-HU", { maximumFractionDigits: t });

/** Tókezelés rögzítése / szerkesztése. A mezők a kezelés típusához igazodnak. */
export function TokezelesModal({ hid, open, onOpenChange, toak, kezeles, alapToId, alapTipus, onMentve }: {
    hid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    toak: ToOpcio[];
    kezeles?: TokezelesUI | null;
    alapToId?: number | null;
    alapTipus?: TokezelesTipus | null;
    onMentve: () => void;
}) {
    const [tipus, setTipus] = useState<TokezelesTipus>("SZERVESTRAGYA");
    const [toId, setToId] = useState("");
    const [datum, setDatum] = useState(maISO());
    const [keszitmeny, setKeszitmeny] = useState("");
    const [hatoanyag, setHatoanyag] = useState("");
    const [mennyiseg, setMennyiseg] = useState("");
    const [egyseg, setEgyseg] = useState<Egyseg>("t");
    const [koltseg, setKoltseg] = useState("");
    const [varakozas, setVarakozas] = useState("");
    const [ok, setOk] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const t = kezeles?.tipus ?? alapTipus ?? "SZERVESTRAGYA";
        setTipus(t);
        setToId(kezeles ? String(kezeles.toId) : alapToId ? String(alapToId) : toak.length === 1 ? String(toak[0].azonosito) : "");
        setDatum(kezeles ? kezeles.datum.slice(0, 10) : maISO());
        setKeszitmeny(kezeles?.keszitmeny ?? "");
        setHatoanyag(kezeles?.hatoanyag ?? "");
        setMennyiseg(str(kezeles?.mennyiseg));
        setEgyseg((kezeles?.egyseg as Egyseg) ?? TIPUS_META[t].egysegek[0]);
        setKoltseg(str(kezeles?.koltsegFt));
        setVarakozas(str(kezeles?.varakozasiIdoNap));
        setOk(kezeles?.kezelesOka ?? "");
        setMegjegyzes(kezeles?.megjegyzes ?? "");
        setHiba(null);
    }, [open, kezeles, alapToId, alapTipus, toak]);

    const meta = TIPUS_META[tipus];

    function tipusValtas(uj: TokezelesTipus) {
        setTipus(uj);
        // Ha az eddigi egység az új típusnál nem választható, az alapértelmezettre állunk.
        if (!TIPUS_META[uj].egysegek.includes(egyseg)) setEgyseg(TIPUS_META[uj].egysegek[0]);
    }

    // Segédinfók: kg/ha (ha ismert a terület) és a várakozási idő vége.
    const kivalasztottTo = toak.find((t) => String(t.azonosito) === toId);
    const mennyisegSzam = Number(mennyiseg.replace(",", "."));
    const kg = mennyisegSzam > 0 ? kgBan(mennyisegSzam, egyseg) : null;
    const kgPerHa = kg != null && kivalasztottTo?.teruletHa ? kg / kivalasztottTo.teruletHa : null;
    const varakozasVeg = meta.varakozasiIdo && Number(varakozas) > 0 ? varakozasVege(`${datum}T12:00:00.000Z`, Number(varakozas)) : null;

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (!toId) { setHiba("Válaszd ki a tóegységet."); return; }
        if (!(mennyisegSzam > 0)) { setHiba("Add meg a bejuttatott mennyiséget."); return; }
        if (meta.keszitmenyKotelezo && !keszitmeny.trim() && !hatoanyag.trim()) {
            setHiba(`${meta.cimke} esetén a készítmény vagy a hatóanyag megadása kötelező.`);
            return;
        }
        setSaving(true);
        setHiba(null);
        try {
            const body = {
                toId: Number(toId),
                tipus,
                datum: `${datum}T12:00:00.000Z`,
                keszitmeny: keszitmeny.trim() || null,
                hatoanyag: hatoanyag.trim() || null,
                mennyiseg,
                egyseg,
                koltsegFt: koltseg || null,
                varakozasiIdoNap: meta.varakozasiIdo ? varakozas || null : null,
                kezelesOka: ok.trim() || null,
                megjegyzes: megjegyzes.trim() || null,
            };
            const res = await fetch(
                kezeles ? `/api/halaszatok/${hid}/tokezelesek/${kezeles.id}` : `/api/halaszatok/${hid}/tokezelesek`,
                { method: kezeles ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.error ?? "Nem sikerült menteni."); return; }
            toast.success(kezeles ? "Kezelés frissítve" : "Kezelés rögzítve", { description: `${meta.cimke} · ${kivalasztottTo?.nev ?? ""}` });
            onOpenChange(false);
            onMentve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    const hatoanyagLathato = tipus === "GYOGYSZER" || tipus === "ANTIBIOTIKUM" || tipus === "VITAMIN" || tipus === "EGYEB";

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={kezeles ? "Tókezelés szerkesztése" : "Tókezelés rögzítése"}
            description="Trágyázás, meszezés, gyógyszeres vagy vitaminos kezelés egy tóegységben."
            size="lg"
            preventClose={saving}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Mégse</Button>
                    <Button type="submit" form="tokezeles-urlap" loading={saving}>{kezeles ? "Mentés" : "Rögzítés"}</Button>
                </>
            }
        >
            <form id="tokezeles-urlap" onSubmit={kuldes}>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field>
                            <FieldLabel htmlFor="tk-tipus">Kezelés típusa</FieldLabel>
                            <NativeSelect id="tk-tipus" value={tipus} onChange={(e) => tipusValtas(e.target.value as TokezelesTipus)} disabled={saving}>
                                {TOKEZELES_TIPUSOK.map((t) => <NativeSelectOption key={t} value={t}>{TIPUS_META[t].cimke}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tk-to">
                                Tóegység <span className="text-destructive" aria-hidden="true">*</span>
                            </FieldLabel>
                            <NativeSelect id="tk-to" value={toId} onChange={(e) => setToId(e.target.value)} disabled={saving} required>
                                <NativeSelectOption value="">Válassz…</NativeSelectOption>
                                {toak.map((t) => <NativeSelectOption key={t.azonosito} value={t.azonosito}>{t.nev}</NativeSelectOption>)}
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tk-datum">Dátum</FieldLabel>
                            <DatePicker id="tk-datum" value={datum} onChange={setDatum} disabled={saving} />
                        </Field>
                    </div>

                    <div className={hatoanyagLathato ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
                        <Field>
                            <FieldLabel htmlFor="tk-keszitmeny">
                                {tipus === "SZERVESTRAGYA" || tipus === "MESZEZES" || tipus === "KLORMESZ" ? "Anyag" : "Készítmény"}
                                {meta.keszitmenyKotelezo && <span className="text-destructive" aria-hidden="true">*</span>}
                            </FieldLabel>
                            <Input id="tk-keszitmeny" value={keszitmeny} onChange={(e) => setKeszitmeny(e.target.value)} placeholder={meta.keszitmenyPelda} disabled={saving} maxLength={150} />
                        </Field>
                        {hatoanyagLathato && (
                            <Field>
                                <FieldLabel htmlFor="tk-hatoanyag">Hatóanyag</FieldLabel>
                                <Input id="tk-hatoanyag" value={hatoanyag} onChange={(e) => setHatoanyag(e.target.value)} disabled={saving} maxLength={150} />
                            </Field>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="tk-mennyiseg">
                                Bejuttatott mennyiség <span className="text-destructive" aria-hidden="true">*</span>
                            </FieldLabel>
                            <div className="flex gap-2">
                                <Input
                                    id="tk-mennyiseg"
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min="0"
                                    value={mennyiseg}
                                    onChange={(e) => setMennyiseg(e.target.value)}
                                    disabled={saving}
                                    required
                                />
                                <NativeSelect aria-label="Mértékegység" value={egyseg} onChange={(e) => setEgyseg(e.target.value as Egyseg)} disabled={saving} className="w-24">
                                    {meta.egysegek.map((e) => <NativeSelectOption key={e} value={e}>{e}</NativeSelectOption>)}
                                </NativeSelect>
                            </div>
                            {kgPerHa != null && (
                                <FieldDescription>
                                    ≈ {hu(kgPerHa)} kg/ha ({kivalasztottTo?.nev}: {hu(kivalasztottTo!.teruletHa!, 4)} ha)
                                </FieldDescription>
                            )}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tk-koltseg">Költség</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id="tk-koltseg" type="number" inputMode="numeric" step={1} min="0" value={koltseg} onChange={(e) => setKoltseg(e.target.value)} disabled={saving} placeholder="–" />
                                <InputGroupAddon align="inline-end"><InputGroupText>Ft</InputGroupText></InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>Az önköltség-számításhoz.</FieldDescription>
                        </Field>
                    </div>

                    {meta.varakozasiIdo && (
                        <Field>
                            <FieldLabel htmlFor="tk-varakozas">Élelmezés-egészségügyi várakozási idő</FieldLabel>
                            <InputGroup className="sm:max-w-56">
                                <InputGroupInput id="tk-varakozas" type="number" inputMode="numeric" step={1} min="0" max="365" value={varakozas} onChange={(e) => setVarakozas(e.target.value)} disabled={saving} placeholder="–" />
                                <InputGroupAddon align="inline-end"><InputGroupText>nap</InputGroupText></InputGroupAddon>
                            </InputGroup>
                            <FieldDescription className="flex items-center gap-1.5">
                                {varakozasVeg ? (
                                    <>
                                        <Clock className="size-3.5" aria-hidden="true" />
                                        A hal {datumIg(varakozasVeg)} nem értékesíthető ebből a tóból — erre a kivételnél figyelmeztetünk.
                                    </>
                                ) : (
                                    "A készítmény alkalmazási előírása szerint (napokban)."
                                )}
                            </FieldDescription>
                        </Field>
                    )}

                    <Field>
                        <FieldLabel htmlFor="tk-ok">Kezelés oka</FieldLabel>
                        <Input id="tk-ok" value={ok} onChange={(e) => setOk(e.target.value)} placeholder={meta.varakozasiIdo ? "pl. bakteriális fertőzés" : "pl. tápanyag-utánpótlás"} disabled={saving} maxLength={300} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="tk-megjegyzes">Megjegyzés</FieldLabel>
                        <Textarea id="tk-megjegyzes" rows={2} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} disabled={saving} maxLength={2000} />
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
