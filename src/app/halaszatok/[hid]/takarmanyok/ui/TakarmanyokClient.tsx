"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Takarmany = {
    azonosito: number;
    nev: string;
    egyseg: string;
    keszlet: number;
    szin: string | null;
    aktiv: boolean;
};

type Mozgas = {
    azonosito: number;
    tipus: "BEVETEL" | "FELHASZNALVA";
    mennyiseg: number;
    datum: string;
    megjegyzes: string | null;
};

// ─── Konstansok ───────────────────────────────────────────────────────────────

const SZINEK = [
    { ertek: "narancs", hex: "#d08a5b" },
    { ertek: "piros",   hex: "#b24b25" },
    { ertek: "zold",    hex: "#4caf50" },
    { ertek: "kek",     hex: "#4e8bbd" },
    { ertek: "lila",    hex: "#9c6bc4" },
    { ertek: "szurke",  hex: "#8a8a8a" },
];

const DEFAULT_SZIN = "#d08a5b";

function szinHex(szin: string | null) {
    return SZINEK.find((s) => s.ertek === szin)?.hex ?? DEFAULT_SZIN;
}

const TOOLTIP_STILUS = {
    backgroundColor: "rgba(30,10,5,0.95)",
    border: "1px solid rgba(208,138,91,0.3)",
    borderRadius: 10,
    color: "#e8cdb8",
    fontSize: 13,
};

const EGYSEGEK = ["kg", "l", "db", "t", "zsák", "bála"];

// ─── KPI kártya ───────────────────────────────────────────────────────────────

function KpiKartya({ cim, ertek, alcim, szin }: { cim: string; ertek: string; alcim?: string; szin?: string }) {
    const c = szin ?? DEFAULT_SZIN;
    return (
        <div style={{
            background: `radial-gradient(ellipse at top left, ${c}18, transparent 70%), rgba(255,255,255,0.04)`,
            border: `1px solid ${c}33`,
            borderLeft: `3px solid ${c}`,
            borderRadius: 14,
            padding: "16px 20px",
        }}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>{cim}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{ertek}</div>
            {alcim && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>{alcim}</div>}
        </div>
    );
}

// ─── Fő komponens ─────────────────────────────────────────────────────────────

export default function TakarmanyokClient({ hid }: { hid: string }) {
    const [takarmanyok, setTakarmanyok] = useState<Takarmany[]>([]);
    const [viewerRole, setViewerRole] = useState<string>("STAFF");
    const [betoltes, setBetoltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    // UI state
    const [inaktivakMutatasa, setInaktivakMutatasa] = useState(false);
    const [ujModalNyitva, setUjModalNyitva] = useState(false);
    const [mozgasModalId, setMozgasModalId] = useState<number | null>(null);
    const [reszletekId, setReszletekId] = useState<number | null>(null);

    const canAdmin = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const betolt = useCallback(async () => {
        setBetoltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok?active=${inaktivakMutatasa ? "0" : "1"}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Hiba");
            setTakarmanyok(data.items ?? []);
            setViewerRole(data.viewerRole ?? "STAFF");
        } catch (e: any) {
            setHiba(e.message);
        } finally {
            setBetoltes(false);
        }
    }, [hid, inaktivakMutatasa]);

    useEffect(() => { betolt(); }, [betolt]);

    // ─── KPI számítás ──────────────────────────────────────────────────────
    const aktivak = takarmanyok.filter((t) => t.aktiv);
    const osszkeszlet = aktivak.reduce((s, t) => s + Number(t.keszlet), 0);
    const urestakarmany = aktivak.filter((t) => Number(t.keszlet) === 0).length;
    const alacsonyKeszlet = aktivak.filter((t) => Number(t.keszlet) > 0 && Number(t.keszlet) < 50).length;

    // ─── Diagram adatok ────────────────────────────────────────────────────
    const keszletGrafikon = aktivak
        .filter((t) => Number(t.keszlet) > 0)
        .sort((a, b) => Number(b.keszlet) - Number(a.keszlet));

    const keszletOsszesites = aktivak.map((t) => ({
        nev: t.nev,
        ertek: Number(t.keszlet),
        szin: szinHex(t.szin),
    }));

    if (betoltes) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, gap: 12, opacity: 0.7 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: "3px solid rgba(208,138,91,0.3)",
                borderTopColor: "#d08a5b",
                animation: "spin 0.8s linear infinite",
            }} />
            Betöltés...
        </div>
    );

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {hiba && (
                <div style={{ background: "rgba(178,75,37,0.18)", border: "1px solid rgba(178,75,37,0.4)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ flex: 1 }}>{hiba}</span>
                    <button onClick={() => setHiba(null)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, fontSize: 18 }}>&times;</button>
                </div>
            )}

            {/* KPI kártyák */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                <KpiKartya cim="Takarmányfajták" ertek={String(aktivak.length)} alcim="aktív típus" szin="#d08a5b" />
                <KpiKartya cim="Összkészlet" ertek={osszkeszlet.toFixed(1)} alcim="összesített egység" szin="#4caf50" />
                <KpiKartya cim="Üres készlet" ertek={String(urestakarmany)} alcim="feltöltésre vár" szin={urestakarmany > 0 ? "#b24b25" : "#4caf50"} />
                <KpiKartya cim="Alacsony készlet" ertek={String(alacsonyKeszlet)} alcim="50 egység alatt" szin={alacsonyKeszlet > 0 ? "#d08a5b" : "#4caf50"} />
            </div>

            {/* Diagramok */}
            {keszletGrafikon.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* Vízszintes sávdiagram */}
                    <div className="glass card">
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Készlet takarmányonként</div>
                        <ResponsiveContainer width="100%" height={Math.max(160, keszletGrafikon.length * 44)}>
                            <BarChart
                                data={keszletGrafikon.map((t) => ({ nev: t.nev, keszlet: Number(t.keszlet), egyseg: t.egyseg, szin: szinHex(t.szin) }))}
                                layout="vertical"
                                margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#b89a82" }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="nev" type="category" width={90} tick={{ fontSize: 11, fill: "#b89a82" }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={TOOLTIP_STILUS}
                                    formatter={(v: any, _n: any, props: any) => [`${v} ${props?.payload?.egyseg ?? ""}`, "Készlet"]}
                                />
                                <Bar dataKey="keszlet" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: "#b89a82", formatter: (v: any) => v }}>
                                    {keszletGrafikon.map((t) => (
                                        <Cell key={t.azonosito} fill={szinHex(t.szin)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Kördiagram — arány */}
                    <div className="glass card">
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Készlet megoszlása</div>
                        <ResponsiveContainer width="100%" height={Math.max(160, keszletGrafikon.length * 44)}>
                            <PieChart>
                                <Pie
                                    data={keszletOsszesites.filter((k) => k.ertek > 0)}
                                    dataKey="ertek"
                                    nameKey="nev"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {keszletOsszesites.filter((k) => k.ertek > 0).map((k, i) => (
                                        <Cell key={i} fill={k.szin} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STILUS} formatter={(v: any, n: any) => [`${v}`, n] as [string, string]} />
                                <Legend wrapperStyle={{ fontSize: 12, color: "#b89a82" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Fejléc + gombok */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Takarmánylista</div>
                <button
                    className="btn"
                    style={{ fontSize: 12, opacity: 0.75 }}
                    onClick={() => setInaktivakMutatasa((v) => !v)}
                >
                    {inaktivakMutatasa ? "Csak aktívak" : "Inaktívak is"}
                </button>
                {canAdmin && (
                    <button className="btn" onClick={() => setUjModalNyitva(true)}>
                        + Új takarmány
                    </button>
                )}
            </div>

            {/* Táblázat */}
            <div className="glass card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {["Takarmány", "Egység", "Készlet", "Állapot", ""].map((h) => (
                                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, opacity: 0.55, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {takarmanyok.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", opacity: 0.45 }}>
                                    Nincs takarmány rögzítve.
                                </td>
                            </tr>
                        )}
                        {takarmanyok.map((t) => (
                            <TakarmanyRow
                                key={t.azonosito}
                                takarmany={t}
                                canAdmin={canAdmin}
                                hid={hid}
                                onMozgas={() => setMozgasModalId(t.azonosito)}
                                onReszletek={() => setReszletekId(t.azonosito)}
                                onFrissit={betolt}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Új takarmány modal */}
            {ujModalNyitva && (
                <UjTakarmanyModal
                    hid={hid}
                    onBezar={() => setUjModalNyitva(false)}
                    onSiker={() => { setUjModalNyitva(false); betolt(); }}
                />
            )}

            {/* Mozgás rögzítés modal */}
            {mozgasModalId !== null && (
                <MozgasModal
                    hid={hid}
                    takarmany={takarmanyok.find((t) => t.azonosito === mozgasModalId)!}
                    onBezar={() => setMozgasModalId(null)}
                    onSiker={() => { setMozgasModalId(null); betolt(); }}
                />
            )}

            {/* Mozgások részletei */}
            {reszletekId !== null && (
                <MozgasokModal
                    hid={hid}
                    takarmany={takarmanyok.find((t) => t.azonosito === reszletekId)!}
                    onBezar={() => setReszletekId(null)}
                />
            )}
        </div>
    );
}

// ─── Sor komponens ────────────────────────────────────────────────────────────

function TakarmanyRow({
    takarmany, canAdmin, hid, onMozgas, onReszletek, onFrissit,
}: {
    takarmany: Takarmany;
    canAdmin: boolean;
    hid: string;
    onMozgas: () => void;
    onReszletek: () => void;
    onFrissit: () => void;
}) {
    const [muveletFut, setMuveletFut] = useState(false);
    const szin = szinHex(takarmany.szin);
    const keszlet = Number(takarmany.keszlet);
    const kritikus = keszlet === 0;
    const alacsony = keszlet > 0 && keszlet < 50;

    async function aktivToggle() {
        setMuveletFut(true);
        try {
            await fetch(`/api/halaszatok/${hid}/takarmanyok/${takarmany.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aktiv: !takarmany.aktiv }),
            });
            onFrissit();
        } finally {
            setMuveletFut(false);
        }
    }

    async function torol() {
        if (!confirm(`Biztosan törlöd: "${takarmany.nev}"?`)) return;
        setMuveletFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${takarmany.azonosito}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
                if (data.inaktivalhatjuk && confirm(`${data.error}\n\nInaktiváljuk helyette?`)) {
                    await aktivToggle();
                }
                return;
            }
            onFrissit();
        } finally {
            setMuveletFut(false);
        }
    }

    return (
        <tr style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            opacity: takarmany.aktiv ? 1 : 0.5,
            transition: "background 0.15s",
        }}>
            <td style={{ padding: "11px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: szin, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{takarmany.nev}</span>
                </div>
            </td>
            <td style={{ padding: "11px 16px", opacity: 0.7 }}>{takarmany.egyseg}</td>
            <td style={{ padding: "11px 16px" }}>
                <span style={{
                    fontWeight: 700,
                    color: kritikus ? "#ff6b6b" : alacsony ? "#ffa94d" : "#6bcb77",
                }}>
                    {keszlet.toFixed(2)} {takarmany.egyseg}
                </span>
                {kritikus && <span style={{ marginLeft: 6, fontSize: 11, color: "#ff6b6b", opacity: 0.8 }}>&#9888; Üres</span>}
                {alacsony && !kritikus && <span style={{ marginLeft: 6, fontSize: 11, color: "#ffa94d", opacity: 0.8 }}>&#9660; Alacsony</span>}
            </td>
            <td style={{ padding: "11px 16px" }}>
                <span className="badge" style={{
                    background: takarmany.aktiv ? "rgba(76,175,80,0.18)" : "rgba(120,120,120,0.18)",
                    color: takarmany.aktiv ? "#6bcb77" : "#999",
                    border: "1px solid " + (takarmany.aktiv ? "rgba(76,175,80,0.3)" : "rgba(120,120,120,0.3)"),
                }}>
                    {takarmany.aktiv ? "Aktív" : "Inaktív"}
                </span>
            </td>
            <td style={{ padding: "11px 16px" }}>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                        className="btn" style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={onReszletek} disabled={muveletFut}
                        title="Mozgások megtekintése"
                    >
                        Napló
                    </button>
                    {canAdmin && (
                        <>
                            <button
                                className="btn" style={{ fontSize: 12, padding: "4px 10px", background: "rgba(208,138,91,0.18)", borderColor: "rgba(208,138,91,0.4)" }}
                                onClick={onMozgas} disabled={muveletFut}
                                title="Mozgás rögzítése"
                            >
                                + / &minus;
                            </button>
                            <button
                                onClick={aktivToggle} disabled={muveletFut}
                                title={takarmany.aktiv ? "Inaktiválás" : "Aktiválás"}
                                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.7, padding: "4px 6px", fontSize: 16 }}
                            >
                                {takarmany.aktiv ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6bcb77" strokeWidth={2}>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={torol} disabled={muveletFut}
                                title="Törlés"
                                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.7, padding: "4px 6px", color: "#ff6b6b", fontSize: 16 }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ─── Új takarmány modal ───────────────────────────────────────────────────────

function UjTakarmanyModal({ hid, onBezar, onSiker }: { hid: string; onBezar: () => void; onSiker: () => void }) {
    const [nev, setNev] = useState("");
    const [egyseg, setEgyseg] = useState("kg");
    const [szin, setSzin] = useState("narancs");
    const [kuldFut, setKuldFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function kuldes(e: React.FormEvent) {
        e.preventDefault();
        setKuldFut(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: nev.trim(), egyseg, szin }),
            });
            const data = await res.json();
            if (!res.ok) { setHiba(data.error ?? "Hiba"); return; }
            onSiker();
        } finally {
            setKuldFut(false);
        }
    }

    return (
        <ModalAlap cim="Új takarmány" onBezar={onBezar}>
            <form onSubmit={kuldes} style={{ display: "grid", gap: 14 }}>
                {hiba && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{hiba}</div>}
                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Megnevezés *</label>
                    <input
                        className="input"
                        value={nev}
                        onChange={(e) => setNev(e.target.value)}
                        placeholder="pl. Ponty granulátum"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Mértékegység *</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {EGYSEGEK.map((e) => (
                            <button key={e} type="button"
                                onClick={() => setEgyseg(e)}
                                className="btn"
                                style={{
                                    fontSize: 13, padding: "4px 12px",
                                    background: egyseg === e ? "rgba(208,138,91,0.25)" : undefined,
                                    borderColor: egyseg === e ? "rgba(208,138,91,0.7)" : undefined,
                                    color: egyseg === e ? "#d08a5b" : undefined,
                                }}
                            >
                                {e}
                            </button>
                        ))}
                        <input
                            className="input"
                            value={EGYSEGEK.includes(egyseg) ? "" : egyseg}
                            onChange={(e) => setEgyseg(e.target.value)}
                            placeholder="Egyéb..."
                            style={{ width: 90 }}
                        />
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Szín</label>
                    <div style={{ display: "flex", gap: 8 }}>
                        {SZINEK.map((s) => (
                            <button key={s.ertek} type="button"
                                onClick={() => setSzin(s.ertek)}
                                style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    background: s.hex, border: szin === s.ertek ? "3px solid #fff" : "3px solid transparent",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                    <button type="button" className="btn" onClick={onBezar} disabled={kuldFut} style={{ opacity: 0.7 }}>Mégse</button>
                    <button type="submit" className="btn" disabled={kuldFut || !nev.trim()}>
                        {kuldFut ? "Mentés..." : "Létrehozás"}
                    </button>
                </div>
            </form>
        </ModalAlap>
    );
}

// ─── Mozgás rögzítés modal ────────────────────────────────────────────────────

function MozgasModal({ hid, takarmany, onBezar, onSiker }: {
    hid: string;
    takarmany: Takarmany;
    onBezar: () => void;
    onSiker: () => void;
}) {
    const [tipus, setTipus] = useState<"BEVETEL" | "FELHASZNALVA">("BEVETEL");
    const [mennyiseg, setMennyiseg] = useState("");
    const [megjegyzes, setMegjegyzes] = useState("");
    const [datum, setDatum] = useState(new Date().toISOString().slice(0, 16));
    const [kuldFut, setKuldFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function kuldes(e: React.FormEvent) {
        e.preventDefault();
        const m = parseFloat(mennyiseg);
        if (isNaN(m) || m <= 0) { setHiba("Érvényes mennyiséget adj meg."); return; }
        setKuldFut(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${takarmany.azonosito}/mozgasok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipus, mennyiseg: m, megjegyzes: megjegyzes.trim() || null, datum }),
            });
            const data = await res.json();
            if (!res.ok) { setHiba(data.error ?? "Hiba"); return; }
            onSiker();
        } finally {
            setKuldFut(false);
        }
    }

    return (
        <ModalAlap cim={`Mozgás rögzítése — ${takarmany.nev}`} onBezar={onBezar}>
            <form onSubmit={kuldes} style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                    Jelenlegi készlet: <strong style={{ color: "#d08a5b" }}>{Number(takarmany.keszlet).toFixed(2)} {takarmany.egyseg}</strong>
                </div>
                {hiba && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{hiba}</div>}

                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 6 }}>Mozgás típusa *</label>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[
                            { ertek: "BEVETEL", label: "+ Bevétel", szin: "#4caf50" },
                            { ertek: "FELHASZNALVA", label: "- Felhasználás", szin: "#b24b25" },
                        ].map((t) => (
                            <button key={t.ertek} type="button"
                                onClick={() => setTipus(t.ertek as any)}
                                className="btn"
                                style={{
                                    flex: 1, fontSize: 13,
                                    background: tipus === t.ertek ? `${t.szin}28` : undefined,
                                    borderColor: tipus === t.ertek ? `${t.szin}88` : undefined,
                                    color: tipus === t.ertek ? t.szin : undefined,
                                    fontWeight: tipus === t.ertek ? 700 : undefined,
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Mennyiség ({takarmany.egyseg}) *</label>
                    <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={mennyiseg}
                        onChange={(e) => setMennyiseg(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        required
                    />
                </div>

                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Dátum</label>
                    <input
                        className="input"
                        type="datetime-local"
                        value={datum}
                        onChange={(e) => setDatum(e.target.value)}
                    />
                </div>

                <div>
                    <label style={{ fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 }}>Megjegyzés</label>
                    <input
                        className="input"
                        value={megjegyzes}
                        onChange={(e) => setMegjegyzes(e.target.value)}
                        placeholder="Opcionális..."
                    />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                    <button type="button" className="btn" onClick={onBezar} disabled={kuldFut} style={{ opacity: 0.7 }}>Mégse</button>
                    <button type="submit" className="btn" disabled={kuldFut || !mennyiseg}>
                        {kuldFut ? "Rögzítés..." : "Rögzítés"}
                    </button>
                </div>
            </form>
        </ModalAlap>
    );
}

// ─── Mozgásnapló modal ────────────────────────────────────────────────────────

function MozgasokModal({ hid, takarmany, onBezar }: {
    hid: string;
    takarmany: Takarmany;
    onBezar: () => void;
}) {
    const [mozgasok, setMozgasok] = useState<Mozgas[]>([]);
    const [betoltes, setBetoltes] = useState(true);

    useEffect(() => {
        (async () => {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${takarmany.azonosito}/mozgasok`);
            const data = await res.json();
            setMozgasok(data.mozgasok ?? []);
            setBetoltes(false);
        })();
    }, [hid, takarmany.azonosito]);

    // trend chart adatok
    const chartAdat = mozgasok.slice(0, 20).reverse().map((m) => ({
        datum: new Date(m.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
        be: m.tipus === "BEVETEL" ? Number(m.mennyiseg) : 0,
        ki: m.tipus === "FELHASZNALVA" ? Number(m.mennyiseg) : 0,
    }));

    return (
        <ModalAlap cim={`Mozgásnapló — ${takarmany.nev}`} onBezar={onBezar} szeles>
            <div style={{ display: "grid", gap: 18 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                    Aktuális készlet: <strong style={{ color: "#d08a5b" }}>{Number(takarmany.keszlet).toFixed(2)} {takarmany.egyseg}</strong>
                </div>

                {chartAdat.length > 1 && (
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, opacity: 0.8 }}>Utolsó 20 mozgás trendje</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={chartAdat} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: "#b89a82" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#b89a82" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STILUS} />
                                <Bar dataKey="be" name="Bevétel" fill="#4caf50" stackId="a" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="ki" name="Felhasználás" fill="#b24b25" stackId="b" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {betoltes ? (
                    <div style={{ textAlign: "center", opacity: 0.5, padding: 24 }}>Betöltés...</div>
                ) : mozgasok.length === 0 ? (
                    <div style={{ textAlign: "center", opacity: 0.5, padding: 24 }}>Még nincs rögzített mozgás.</div>
                ) : (
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                    {["Dátum", "Típus", "Mennyiség", "Megjegyzés"].map((h) => (
                                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, opacity: 0.55, fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {mozgasok.map((m) => (
                                    <tr key={m.azonosito} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "8px 12px", fontSize: 12 }}>
                                            {new Date(m.datum).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td style={{ padding: "8px 12px" }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                                                background: m.tipus === "BEVETEL" ? "rgba(76,175,80,0.18)" : "rgba(178,75,37,0.18)",
                                                color: m.tipus === "BEVETEL" ? "#6bcb77" : "#e07050",
                                                border: "1px solid " + (m.tipus === "BEVETEL" ? "rgba(76,175,80,0.3)" : "rgba(178,75,37,0.3)"),
                                            }}>
                                                {m.tipus === "BEVETEL" ? "+ Bevétel" : "- Felhasználás"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                                            <span style={{ color: m.tipus === "BEVETEL" ? "#6bcb77" : "#e07050" }}>
                                                {m.tipus === "BEVETEL" ? "+" : "-"}{Number(m.mennyiseg).toFixed(2)} {takarmany.egyseg}
                                            </span>
                                        </td>
                                        <td style={{ padding: "8px 12px", fontSize: 12, opacity: 0.65 }}>{m.megjegyzes ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </ModalAlap>
    );
}

// ─── Modal alap wrapper ───────────────────────────────────────────────────────

function ModalAlap({ cim, onBezar, children, szeles }: {
    cim: string;
    onBezar: () => void;
    children: React.ReactNode;
    szeles?: boolean;
}) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
        }} onClick={(e) => { if (e.target === e.currentTarget) onBezar(); }}>
            <div className="glass card" style={{
                width: "100%", maxWidth: szeles ? 680 : 440,
                maxHeight: "90vh", overflowY: "auto",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cim}</div>
                    <button onClick={onBezar} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, fontSize: 20, lineHeight: 1 }}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}
