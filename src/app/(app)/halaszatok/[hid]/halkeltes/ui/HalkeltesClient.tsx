"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ciklusOsszegzes,
    ikrasSorSzamitas,
    tejesSorSzamitas,
    halkeltesStatuszCimke,
    ALAP_RAHAGYAS,
    type Protokoll,
} from "@/lib/halkeltes/szamitas";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type CiklusListaElem = {
    id: number;
    nev: string | null;
    datum: string;
    homersekletC: number | null;
    statusz: string;
    halfajNev: string | null;
    rogzitoNev: string | null;
    osszegzes: {
        ikrasDarab: number; tejesDarab: number;
        ikrasOsszKg: number; tejesOsszKg: number; ikraOsszKg: number;
    };
};

type Halfaj = { azonosito: number; nev: string };

type IkrasSor = { chipAzonosito: string; fajtaJeloles: string; tomegKg: string; ikraKg: string; megjegyzes: string };
type TejesSor = { chipAzonosito: string; fajtaJeloles: string; tomegKg: string; tejMl: string; megjegyzes: string };

const STATUSZ_SZIN: Record<string, string> = {
    TERVEZET: "#8a8a8a",
    FOLYAMATBAN: "#d08a5b",
    LEZARVA: "#6bcb77",
};

const mezo: React.CSSProperties = {
    padding: 9, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)", color: "rgba(255,255,255,0.92)", outline: "none", width: "100%",
};

const num = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

function ujIkrasSor(): IkrasSor { return { chipAzonosito: "", fajtaJeloles: "", tomegKg: "", ikraKg: "", megjegyzes: "" }; }
function ujTejesSor(): TejesSor { return { chipAzonosito: "", fajtaJeloles: "", tomegKg: "", tejMl: "", megjegyzes: "" }; }

function fmt(n: number | null): string {
    return n == null ? "—" : String(n);
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function HalkeltesClient({ hid }: { hid: string }) {
    const [ciklusok, setCiklusok] = useState<CiklusListaElem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const [urlapNyitva, setUrlapNyitva] = useState(false);
    const [reszletId, setReszletId] = useState<number | null>(null);

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setCiklusok(json.ciklusok ?? []);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid]);

    useEffect(() => { void betolt(); }, [betolt]);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Halkeltetés</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Kézi keltetési ciklus-nyilvántartás: ikráztatás, oltási adagok, ikrás/tejes halak.
                        {ciklusok.length > 0 && <> &bull; {ciklusok.length} ciklus</>}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <button className="btn" disabled title="Excel-alapú import egy későbbi sprintben" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                        Excel import előkészítve
                    </button>
                    <button className="btn btn-primary" onClick={() => setUrlapNyitva((v) => !v)}>
                        {urlapNyitva ? "Mégse" : "+ Új halkeltetési ciklus"}
                    </button>
                </div>
            </div>

            {urlapNyitva && (
                <UjCiklusUrlap hid={hid} onKesz={() => { setUrlapNyitva(false); void betolt(); }} />
            )}

            {loading ? (
                <div className="glass card muted">Betöltés…</div>
            ) : hiba ? (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.3)", background: "rgba(100,20,20,0.2)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba</div>
                    <div className="muted">{hiba}</div>
                </div>
            ) : ciklusok.length === 0 ? (
                <div className="glass card" style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>&#127841;</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Még nincs keltetési ciklus</div>
                    <div className="muted">Hozz létre egy új ciklust a fenti gombbal.</div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {ciklusok.map((c) => {
                        const szin = STATUSZ_SZIN[c.statusz] ?? "#8a8a8a";
                        return (
                            <div key={c.id} className="glass card" style={{ borderLeft: `3px solid ${szin}`, display: "grid", gap: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 800 }}>{c.nev || `Ciklus #${c.id}`}</span>
                                    <span className="badge" style={{ background: `${szin}22`, color: szin, border: `1px solid ${szin}55` }}>
                                        {halkeltesStatuszCimke(c.statusz)}
                                    </span>
                                </div>
                                <div className="muted" style={{ fontSize: 12, display: "grid", gap: 3 }}>
                                    <div>Dátum: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{new Date(c.datum).toLocaleDateString("hu-HU")}</strong>{c.homersekletC != null && <> &bull; {c.homersekletC} °C</>}</div>
                                    <div>Faj: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{c.halfajNev ?? "—"}</strong></div>
                                    <div>Ikrás: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{c.osszegzes.ikrasDarab} db ({c.osszegzes.ikrasOsszKg} kg)</strong> &bull; Tejes: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{c.osszegzes.tejesDarab} db ({c.osszegzes.tejesOsszKg} kg)</strong></div>
                                    {c.osszegzes.ikraOsszKg > 0 && <div>Ikra: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{c.osszegzes.ikraOsszKg} kg</strong></div>}
                                    <div>Rögzítette: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{c.rogzitoNev ?? "nincs adat"}</strong></div>
                                </div>
                                <button className="btn" style={{ fontSize: 12, justifySelf: "start" }} onClick={() => setReszletId(c.id)}>
                                    Részletek →
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {reszletId != null && (
                <CiklusReszletek hid={hid} id={reszletId} onBezar={() => setReszletId(null)} onValtozas={betolt} />
            )}

            <div className="glass card">
                <div className="muted" style={{ fontSize: 12 }}>
                    <strong>Megjegyzés:</strong> ez a <strong>kézi</strong> keltetési nyilvántartás (Sprint 1). Az oltási
                    adagok a <strong>konfigurálható protokoll</strong> értékeiből számolódnak (mg/kg, ml/kg) — nincs
                    beégetett biológiai szabály. Az <strong>Excel-import</strong> és a <strong>dokumentum-export</strong>
                    későbbi sprint; az <strong>ivadék-kihelyezés / automatikus állománynövelés</strong> még nincs.
                    A ciklus létrehozása a Halászati naplóba is bekerül (HALKELTES).
                </div>
            </div>
        </div>
    );
}

// ─── Új ciklus űrlap ─────────────────────────────────────────────────────────

function UjCiklusUrlap({ hid, onKesz }: { hid: string; onKesz: () => void }) {
    const [nev, setNev] = useState("");
    const [halfajId, setHalfajId] = useState("");
    const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
    const [oltas, setOltas] = useState("");
    const [homerseklet, setHomerseklet] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);

    // Protokoll értékek (konfigurálható; alap 0, ráhagyás 1.10)
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
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(json?.items)) setHalfajok(json.items);
            } catch { /* opcionális */ }
        })();
    }, [hid]);

    const protokoll: Protokoll = {
        ikrasEloadagMgPerKg: num(ikrasEloadag),
        ikrasDontoMgPerKg: num(ikrasDonto),
        ikrasMlPerKg: num(ikrasMl),
        tejesMgPerKg: num(tejesMg),
        tejesMlPerKg: num(tejesMl),
        rahagyasSzorzo: num(rahagyas) ?? ALAP_RAHAGYAS,
    };

    const elonezet = useMemo(() => ciklusOsszegzes(
        ikrasSorok.map((s) => ({ tomegKg: num(s.tomegKg), ikraKg: num(s.ikraKg) })),
        tejesSorok.map((s) => ({ tomegKg: num(s.tomegKg), tejMl: num(s.tejMl) })),
        protokoll,
    ), [ikrasSorok, tejesSorok, ikrasEloadag, ikrasDonto, ikrasMl, tejesMg, tejesMl, rahagyas]); // eslint-disable-line react-hooks/exhaustive-deps

    async function mentes() {
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
            if (!res.ok) { setHiba(json?.error ?? "Nem sikerült menteni."); return; }
            onKesz();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="glass card" style={{ display: "grid", gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Új halkeltetési ciklus</div>
            {hiba && <div style={{ color: "#ff9d9d", fontSize: 13 }}>{hiba}</div>}

            {/* Fejadatok */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Ciklus neve</span>
                    <input style={mezo} value={nev} onChange={(e) => setNev(e.target.value)} placeholder="pl. Ponty 2026 tavasz" /></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Faj</span>
                    <select style={mezo} value={halfajId} onChange={(e) => setHalfajId(e.target.value)}>
                        <option value="">— nincs megadva —</option>
                        {halfajok.map((h) => <option key={h.azonosito} value={h.azonosito}>{h.nev}</option>)}
                    </select></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Dátum *</span>
                    <input style={mezo} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Oltás időpontja</span>
                    <input style={mezo} type="datetime-local" value={oltas} onChange={(e) => setOltas(e.target.value)} /></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Hőmérséklet (°C)</span>
                    <input style={mezo} inputMode="decimal" value={homerseklet} onChange={(e) => setHomerseklet(e.target.value)} placeholder="pl. 20.5" /></label>
            </div>

            {/* Protokoll */}
            <div style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Oltási protokoll (konfigurálható — mg/kg, ml/kg)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 8 }}>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Ikrás előadag mg/kg</span><input style={mezo} inputMode="decimal" value={ikrasEloadag} onChange={(e) => setIkrasEloadag(e.target.value)} /></label>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Ikrás döntőadag mg/kg</span><input style={mezo} inputMode="decimal" value={ikrasDonto} onChange={(e) => setIkrasDonto(e.target.value)} /></label>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Ikrás ml/kg</span><input style={mezo} inputMode="decimal" value={ikrasMl} onChange={(e) => setIkrasMl(e.target.value)} /></label>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Tejes mg/kg</span><input style={mezo} inputMode="decimal" value={tejesMg} onChange={(e) => setTejesMg(e.target.value)} /></label>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Tejes ml/kg</span><input style={mezo} inputMode="decimal" value={tejesMl} onChange={(e) => setTejesMl(e.target.value)} /></label>
                    <label style={{ display: "grid", gap: 3 }}><span className="muted" style={{ fontSize: 11 }}>Ráhagyás szorzó</span><input style={mezo} inputMode="decimal" value={rahagyas} onChange={(e) => setRahagyas(e.target.value)} /></label>
                </div>
            </div>

            {/* Ikrás sorok */}
            <SorSzerkeszto
                cim="Ikrás (nőstény) halak"
                fejlec={["Chip", "Fajta/jelölés", "Tömeg kg", "Ikra kg", "Megj.", "Adag (elő/döntő mg · ml)"]}
                sorok={ikrasSorok}
                render={(s, i, mod) => {
                    const sz = ikrasSorSzamitas({ tomegKg: num(s.tomegKg) }, protokoll);
                    return (
                        <>
                            <input style={mezo} value={s.chipAzonosito} onChange={(e) => mod(i, { chipAzonosito: e.target.value })} />
                            <input style={mezo} value={s.fajtaJeloles} onChange={(e) => mod(i, { fajtaJeloles: e.target.value })} />
                            <input style={mezo} inputMode="decimal" value={s.tomegKg} onChange={(e) => mod(i, { tomegKg: e.target.value })} />
                            <input style={mezo} inputMode="decimal" value={s.ikraKg} onChange={(e) => mod(i, { ikraKg: e.target.value })} />
                            <input style={mezo} value={s.megjegyzes} onChange={(e) => mod(i, { megjegyzes: e.target.value })} />
                            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{fmt(sz.eloadagMg)} / {fmt(sz.dontoMg)} mg · {fmt(sz.ml)} ml</span>
                        </>
                    );
                }}
                onAdd={() => setIkrasSorok((v) => [...v, ujIkrasSor()])}
                onRemove={(i) => setIkrasSorok((v) => v.filter((_, idx) => idx !== i))}
                onMod={(i, patch) => setIkrasSorok((v) => v.map((s, idx) => idx === i ? { ...s, ...patch } : s))}
            />

            {/* Tejes sorok */}
            <SorSzerkeszto
                cim="Tejes (hím) halak"
                fejlec={["Chip", "Fajta/jelölés", "Tömeg kg", "Tej ml", "Megj.", "Adag (mg · ml)"]}
                sorok={tejesSorok}
                render={(s, i, mod) => {
                    const sz = tejesSorSzamitas({ tomegKg: num(s.tomegKg) }, protokoll);
                    return (
                        <>
                            <input style={mezo} value={s.chipAzonosito} onChange={(e) => mod(i, { chipAzonosito: e.target.value })} />
                            <input style={mezo} value={s.fajtaJeloles} onChange={(e) => mod(i, { fajtaJeloles: e.target.value })} />
                            <input style={mezo} inputMode="decimal" value={s.tomegKg} onChange={(e) => mod(i, { tomegKg: e.target.value })} />
                            <input style={mezo} inputMode="decimal" value={s.tejMl} onChange={(e) => mod(i, { tejMl: e.target.value })} />
                            <input style={mezo} value={s.megjegyzes} onChange={(e) => mod(i, { megjegyzes: e.target.value })} />
                            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{fmt(sz.mg)} mg · {fmt(sz.ml)} ml</span>
                        </>
                    );
                }}
                onAdd={() => setTejesSorok((v) => [...v, ujTejesSor()])}
                onRemove={(i) => setTejesSorok((v) => v.filter((_, idx) => idx !== i))}
                onMod={(i, patch) => setTejesSorok((v) => v.map((s, idx) => idx === i ? { ...s, ...patch } : s))}
            />

            {/* Összegzés-előnézet */}
            <div className="glass" style={{ padding: 12, borderRadius: 12, background: "rgba(208,138,91,0.08)", border: "1px solid rgba(208,138,91,0.25)" }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Összegzés (előnézet)</div>
                <div className="muted" style={{ fontSize: 12, display: "grid", gap: 2 }}>
                    <div>Ikrás: {elonezet.ikrasDarab} db · {elonezet.ikrasOsszKg} kg · előadag {elonezet.ikrasEloadagOsszMg} mg · döntő {elonezet.ikrasDontoOsszMg} mg · {elonezet.ikrasOsszMl} ml</div>
                    <div>Tejes: {elonezet.tejesDarab} db · {elonezet.tejesOsszKg} kg · {elonezet.tejesOsszMg} mg · {elonezet.tejesOsszMl} ml</div>
                    <div><strong>Oltandó (×{elonezet.rahagyasSzorzo}):</strong> előadag {elonezet.oltandoEloadagMg} mg · döntő {elonezet.oltandoDontoMg} mg</div>
                    {elonezet.ikraOsszKg > 0 && <div>Ikra összesen: {elonezet.ikraOsszKg} kg</div>}
                </div>
            </div>

            <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Megjegyzés</span>
                <textarea style={{ ...mezo, resize: "vertical" }} rows={2} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} /></label>

            <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={mentes} disabled={saving}>{saving ? "Mentés…" : "Ciklus mentése"}</button>
            </div>
        </div>
    );
}

// ─── Sorszerkesztő (általános) ───────────────────────────────────────────────

function SorSzerkeszto<T>({ cim, fejlec, sorok, render, onAdd, onRemove, onMod }: {
    cim: string;
    fejlec: string[];
    sorok: T[];
    render: (sor: T, i: number, mod: (i: number, patch: Partial<T>) => void) => React.ReactNode;
    onAdd: () => void;
    onRemove: (i: number) => void;
    onMod: (i: number, patch: Partial<T>) => void;
}) {
    return (
        <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{cim}</div>
                <button className="btn" style={{ fontSize: 12 }} onClick={onAdd} type="button">+ Sor</button>
            </div>
            <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gap: 6, minWidth: 720 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr 0.7fr 1fr 1.3fr auto", gap: 6 }}>
                        {fejlec.map((f) => <span key={f} className="muted" style={{ fontSize: 11 }}>{f}</span>)}
                        <span />
                    </div>
                    {sorok.map((s, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr 0.7fr 1fr 1.3fr auto", gap: 6 }}>
                            {render(s, i, onMod)}
                            <button className="btn" type="button" onClick={() => onRemove(i)} style={{ fontSize: 12, color: "#ff9d9d" }} title="Sor törlése">✕</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Ciklus részletek ────────────────────────────────────────────────────────

function CiklusReszletek({ hid, id, onBezar, onValtozas }: { hid: string; id: number; onBezar: () => void; onValtozas: () => void }) {
    const [data, setData] = useState<any>(null);
    const [hiba, setHiba] = useState<string | null>(null);
    const [statuszMent, setStatuszMent] = useState(false);

    const betolt = useCallback(async () => {
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok/${id}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e: any) { setHiba(e?.message ?? "Hiba"); }
    }, [hid, id]);

    useEffect(() => { void betolt(); }, [betolt]);

    async function statuszValt(uj: string) {
        setStatuszMent(true);
        try {
            await fetch(`/api/halaszatok/${hid}/halkeltes/ciklusok/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statusz: uj }),
            });
            await betolt();
            onValtozas();
        } finally { setStatuszMent(false); }
    }

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}
             onClick={(e) => { if (e.target === e.currentTarget) onBezar(); }}>
            <div className="glass card" style={{ width: "100%", maxWidth: 860, display: "grid", gap: 14 }}>
                {hiba ? (
                    <div className="muted">{hiba}</div>
                ) : !data ? (
                    <div className="muted">Betöltés…</div>
                ) : (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16 }}>{data.ciklus.nev || `Ciklus #${data.ciklus.id}`}</div>
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                    {new Date(data.ciklus.datum).toLocaleDateString("hu-HU")}
                                    {data.ciklus.homersekletC != null && <> &bull; {data.ciklus.homersekletC} °C</>}
                                    {data.ciklus.halfajNev && <> &bull; {data.ciklus.halfajNev}</>}
                                    {" "}&bull; Rögzítette: {data.ciklus.rogzitoNev ?? "nincs adat"}
                                </div>
                            </div>
                            <button className="btn" onClick={onBezar}>Bezár</button>
                        </div>

                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="muted" style={{ fontSize: 12 }}>Státusz:</span>
                            {["TERVEZET", "FOLYAMATBAN", "LEZARVA"].map((st) => (
                                <button key={st} className="btn" disabled={statuszMent} onClick={() => statuszValt(st)}
                                    style={{ fontSize: 12, background: data.ciklus.statusz === st ? "rgba(208,138,91,0.25)" : undefined, borderColor: data.ciklus.statusz === st ? "rgba(208,138,91,0.6)" : undefined, color: data.ciklus.statusz === st ? "#d08a5b" : undefined }}>
                                    {halkeltesStatuszCimke(st)}
                                </button>
                            ))}
                        </div>

                        <ReszletTabla cim="Ikrás halak" oszlopok={["#", "Chip", "Fajta", "Tömeg kg", "Ikra kg", "Előadag mg", "Döntő mg", "ml"]}
                            sorok={data.ikrasSorok.map((s: any) => [s.sorszam ?? "", s.chipAzonosito ?? "—", s.fajtaJeloles ?? "—", fmt(s.tomegKg), fmt(s.ikraKg), fmt(s.szamitott.eloadagMg), fmt(s.szamitott.dontoMg), fmt(s.szamitott.ml)])} />

                        <ReszletTabla cim="Tejes halak" oszlopok={["#", "Chip", "Fajta", "Tömeg kg", "Tej ml", "mg", "ml"]}
                            sorok={data.tejesSorok.map((s: any) => [s.sorszam ?? "", s.chipAzonosito ?? "—", s.fajtaJeloles ?? "—", fmt(s.tomegKg), fmt(s.tejMl), fmt(s.szamitott.mg), fmt(s.szamitott.ml)])} />

                        <div className="glass" style={{ padding: 12, borderRadius: 12, background: "rgba(208,138,91,0.08)", border: "1px solid rgba(208,138,91,0.25)" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Összegzés</div>
                            <div className="muted" style={{ fontSize: 12, display: "grid", gap: 2 }}>
                                <div>Ikrás: {data.osszegzes.ikrasDarab} db · {data.osszegzes.ikrasOsszKg} kg · előadag {data.osszegzes.ikrasEloadagOsszMg} mg · döntő {data.osszegzes.ikrasDontoOsszMg} mg · {data.osszegzes.ikrasOsszMl} ml</div>
                                <div>Tejes: {data.osszegzes.tejesDarab} db · {data.osszegzes.tejesOsszKg} kg · {data.osszegzes.tejesOsszMg} mg · {data.osszegzes.tejesOsszMl} ml</div>
                                <div><strong>Oltandó (×{data.osszegzes.rahagyasSzorzo}):</strong> előadag {data.osszegzes.oltandoEloadagMg} mg · döntő {data.osszegzes.oltandoDontoMg} mg</div>
                                {data.osszegzes.ikraOsszKg > 0 && <div>Ikra összesen: {data.osszegzes.ikraOsszKg} kg</div>}
                            </div>
                        </div>
                        {data.ciklus.megjegyzes && <div className="muted" style={{ fontSize: 13 }}>Megjegyzés: {data.ciklus.megjegyzes}</div>}
                    </>
                )}
            </div>
        </div>
    );
}

function ReszletTabla({ cim, oszlopok, sorok }: { cim: string; oszlopok: string[]; sorok: (string | number)[][] }) {
    return (
        <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{cim}</div>
            {sorok.length === 0 ? (
                <div className="muted" style={{ fontSize: 12 }}>Nincs sor.</div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 560 }}>
                        <thead><tr>{oszlopok.map((o) => <th key={o} style={{ textAlign: "left", padding: "4px 8px", opacity: 0.6, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>{o}</th>)}</tr></thead>
                        <tbody>
                            {sorok.map((sor, i) => (
                                <tr key={i}>{sor.map((cella, j) => <td key={j} style={{ padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{cella}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
