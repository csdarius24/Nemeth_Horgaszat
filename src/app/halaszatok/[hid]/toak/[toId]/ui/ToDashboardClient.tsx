"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import EtetesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/EtetesModal";
import TelepitesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/TelepitesModal";
import KivetelModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/KivetelModal";
import AttelepitesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/AttelepitesModal";

// ─── Típusok ────────────────────────────────────────────────────────────────

type SummaryResponse = {
    to: { azonosito: number; nev: string; tipus: string };
    summary: {
        osszDarab: number;
        etetes: { napok: number; osszegKg: any; darab: number };
    };
    allomany: Array<{
        darab: number;
        minTomegKg: any;
        maxTomegKg: any;
        halfaj: { azonosito: number; nev: string };
    }>;
    timeline: Array<{
        azonosito: number;
        tipus: string;
        datum: string;
        leiras: string | null;
        darab: number | null;
        mennyisegKg: any;
        halfaj: { azonosito: number; nev: string } | null;
    }>;
};

// ─── Grafikon stílusok ───────────────────────────────────────────────────────

const DIAGRAM_SZINEK = ["#d08a5b", "#b24b25", "#7a2a17", "#e8a878", "#c06535", "#4a1510"];
const ESEMENY_SZIN: Record<string, string> = {
    TELEPITES: "#d08a5b",
    KIVETEL: "#7a2a17",
    ETETES: "#b24b25",
};

const TOOLTIP_STILUS = {
    contentStyle: {
        background: "rgba(26,10,7,0.95)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 14,
        color: "rgba(255,255,255,0.92)",
        fontSize: 13,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    },
    itemStyle: { color: "rgba(255,255,255,0.85)" },
    labelStyle: { color: "rgba(255,255,255,0.55)", marginBottom: 4 },
    cursor: { fill: "rgba(255,255,255,0.06)" },
};

const TENGELY_STILUS = {
    stroke: "rgba(255,255,255,0.25)",
    tick: { fill: "rgba(255,255,255,0.6)", fontSize: 12 },
};

// ─── Segédfüggvények ─────────────────────────────────────────────────────────

function fmtDecimal(x: any) {
    if (x == null) return "-";
    const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
    if (!Number.isFinite(n)) return String(x);
    return n.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("hu-HU");
}

function esemenyNev(tipus: string) {
    return tipus === "TELEPITES" ? "Telepítés" : tipus === "KIVETEL" ? "Kivétel" : tipus === "ETETES" ? "Etetés" : tipus;
}

// ─── Kis komponensek ──────────────────────────────────────────────────────────

function EventBadge({ tipus }: { tipus: string }) {
    return (
        <span
            className="badge"
            style={{ background: `${ESEMENY_SZIN[tipus] ?? "rgba(255,255,255,0.10)"}30`, borderColor: `${ESEMENY_SZIN[tipus] ?? "rgba(255,255,255,0.14)"}80` }}
        >
            {esemenyNev(tipus)}
        </span>
    );
}

function KpiKartya({ cim, ertek, alcim, szin }: { cim: string; ertek: string | number; alcim?: string; szin?: string }) {
    return (
        <div
            className="glass card"
            style={{ borderLeft: `3px solid ${szin ?? "rgba(208,138,91,0.6)"}`, position: "relative", overflow: "hidden" }}
        >
            <div
                style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(circle at top left, ${szin ?? "#d08a5b"}12, transparent 70%)`,
                    pointerEvents: "none",
                }}
            />
            <div className="muted" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                {cim}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6, lineHeight: 1 }}>{ertek}</div>
            {alcim && <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{alcim}</div>}
        </div>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function ToDashboardClient({ hid, toId }: { hid: string; toId: string }) {
    const [days, setDays] = useState(7);
    const [events, setEvents] = useState(20);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SummaryResponse | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);

    const [openEtetes, setOpenEtetes] = useState(false);
    const [openTelepites, setOpenTelepites] = useState(false);
    const [openKivetel, setOpenKivetel] = useState(false);
    const [openAttelepites, setOpenAttelepites] = useState(false);

    const url = useMemo(
        () => `/api/halaszatok/${hid}/toak/${toId}/summary?days=${days}&events=${events}`,
        [hid, toId, days, events]
    );

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Hiba a summary betöltésekor.");
            setData(json);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    // ── Grafikon adatok ──────────────────────────────────────────────────────

    const allomanyGrafikonAdat = useMemo(
        () => (data?.allomany ?? []).map((a) => ({ nev: a.halfaj.nev, darab: a.darab })),
        [data]
    );

    const esemenyElosztasAdat = useMemo(() => {
        const szamlalo: Record<string, number> = {};
        for (const e of data?.timeline ?? []) {
            szamlalo[e.tipus] = (szamlalo[e.tipus] ?? 0) + 1;
        }
        return Object.entries(szamlalo).map(([name, value]) => ({ name: esemenyNev(name), originalTipus: name, value }));
    }, [data]);

    const aktivitasGrafikonAdat = useMemo(() => {
        const napok: Record<string, { nap: string; Telepítés: number; Kivétel: number; Etetés: number }> = {};
        for (const e of data?.timeline ?? []) {
            const nap = new Date(e.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
            if (!napok[nap]) napok[nap] = { nap, Telepítés: 0, Kivétel: 0, Etetés: 0 };
            if (e.tipus === "TELEPITES") napok[nap].Telepítés++;
            else if (e.tipus === "KIVETEL") napok[nap].Kivétel++;
            else if (e.tipus === "ETETES") napok[nap].Etetés++;
        }
        return Object.values(napok).reverse();
    }, [data]);

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#d08a5b", animation: "spin 0.8s linear infinite" }} />
                <span className="muted">Betöltés…</span>
            </div>
        );
    }

    if (hiba) {
        return (
            <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.22)" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Hiba</div>
                <div className="muted">{hiba}</div>
                <button className="btn" style={{ marginTop: 12 }} onClick={load}>Újrapróbál</button>
            </div>
        );
    }

    if (!data) return <div className="glass card">Nincs adat.</div>;

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* ── Fejléc (tó info + actions) ── */}
            <div className="glass card" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 className="h2" style={{ fontSize: 22 }}>{data.to.nev}</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Típus: <span className="badge">{data.to.tipus}</span>
                        &nbsp;•&nbsp;Tó ID: <span className="badge">{data.to.azonosito}</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" onClick={() => setOpenEtetes(true)}>+ Etetés</button>
                    <button className="btn" onClick={() => setOpenTelepites(true)}>+ Telepítés</button>
                    <button className="btn" onClick={() => setOpenKivetel(true)}>+ Kivét</button>
                    <button className="btn" onClick={() => setOpenAttelepites(true)}>+ Áttelepítés</button>
                </div>
            </div>

            {/* ── Modálok ── */}
            <EtetesModal open={openEtetes} onCloseAction={() => setOpenEtetes(false)} hid={hid} toId={toId}
                onSavedAction={async () => { setOpenEtetes(false); await load(); }} />
            <TelepitesModal open={openTelepites} onCloseAction={() => setOpenTelepites(false)} hid={hid} toId={toId}
                onSavedAction={async () => { setOpenTelepites(false); await load(); }} />
            <KivetelModal open={openKivetel} onCloseAction={() => setOpenKivetel(false)} hid={hid} toId={toId}
                onSavedAction={async () => { setOpenKivetel(false); await load(); }} />
            <AttelepitesModal open={openAttelepites} onCloseAction={() => setOpenAttelepites(false)} hid={hid} toId={toId}
                onSavedAction={async () => { setOpenAttelepites(false); await load(); }} />

            {/* ── Szűrők ── */}
            <div className="glass card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="badge">Szűrés</div>
                <label className="muted">
                    Etetés napok:
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStilus}>
                        <option value={7}>7</option>
                        <option value={14}>14</option>
                        <option value={30}>30</option>
                        <option value={60}>60</option>
                    </select>
                </label>
                <label className="muted">
                    Események:
                    <select value={events} onChange={(e) => setEvents(Number(e.target.value))} style={selectStilus}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                    </select>
                </label>
                <button className="btn" onClick={load}>↺ Frissítés</button>
            </div>

            {/* ── KPI kártyák ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <KpiKartya
                    cim="Össz hal"
                    ertek={`${data.summary.osszDarab} db`}
                    alcim={`${data.allomany.length} halfaj`}
                    szin="#d08a5b"
                />
                <KpiKartya
                    cim={`Etetés (${data.summary.etetes.napok} nap)`}
                    ertek={`${fmtDecimal(data.summary.etetes.osszegKg)} kg`}
                    alcim={`${data.summary.etetes.darab} bejegyzés`}
                    szin="#b24b25"
                />
                <KpiKartya
                    cim="Napló események"
                    ertek={data.timeline.length}
                    alcim={`utolsó ${events} esemény`}
                    szin="#7a2a17"
                />
            </div>

            {/* ── Grafikonok (2 oszlop) ── */}
            {(allomanyGrafikonAdat.length > 0 || esemenyElosztasAdat.length > 0) && (
                <div className="grid-2">

                    {/* Halállomány chart */}
                    {allomanyGrafikonAdat.length > 0 && (
                        <div className="glass card">
                            <h3 className="h2" style={{ marginBottom: 16 }}>Halállomány — halfajok</h3>
                            <ResponsiveContainer width="100%" height={Math.max(180, allomanyGrafikonAdat.length * 52)}>
                                <BarChart data={allomanyGrafikonAdat} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        stroke={TENGELY_STILUS.stroke}
                                        tick={TENGELY_STILUS.tick}
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        dataKey="nev"
                                        type="category"
                                        stroke={TENGELY_STILUS.stroke}
                                        tick={TENGELY_STILUS.tick}
                                        width={90}
                                    />
                                    <Tooltip
                                        {...TOOLTIP_STILUS}
                                        formatter={(v: any) => [`${v} db`, "Darabszám"] as [string, string]}
                                    />
                                    <Bar dataKey="darab" name="Darab" radius={[0, 8, 8, 0]} maxBarSize={36}>
                                        {allomanyGrafikonAdat.map((_, i) => (
                                            <Cell key={i} fill={DIAGRAM_SZINEK[i % DIAGRAM_SZINEK.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Esemény eloszlás pie */}
                    {esemenyElosztasAdat.length > 0 && (
                        <div className="glass card">
                            <h3 className="h2" style={{ marginBottom: 16 }}>Esemény eloszlás</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={esemenyElosztasAdat}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={75}
                                        innerRadius={40}
                                        paddingAngle={3}
                                        label={({ name, percent }) =>
                                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                        }
                                        labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
                                    >
                                        {esemenyElosztasAdat.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={ESEMENY_SZIN[entry.originalTipus] ?? DIAGRAM_SZINEK[i % DIAGRAM_SZINEK.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        {...TOOLTIP_STILUS}
                                        formatter={(v: any, name: any) => [`${v} db`, String(name)]}
                                    />
                                    <Legend
                                        wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12, paddingTop: 8 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ── Aktivitás trend ── */}
            {aktivitasGrafikonAdat.length > 1 && (
                <div className="glass card">
                    <h3 className="h2" style={{ marginBottom: 16 }}>Aktivitás trend (utolsó {events} esemény)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={aktivitasGrafikonAdat} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                            <XAxis dataKey="nap" stroke={TENGELY_STILUS.stroke} tick={TENGELY_STILUS.tick} />
                            <YAxis stroke={TENGELY_STILUS.stroke} tick={TENGELY_STILUS.tick} allowDecimals={false} />
                            <Tooltip {...TOOLTIP_STILUS} formatter={(v: any, name: any) => [`${v} db`, String(name)]} />
                            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12, paddingTop: 8 }} />
                            <Bar dataKey="Telepítés" fill={ESEMENY_SZIN.TELEPITES} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="Kivétel" fill={ESEMENY_SZIN.KIVETEL} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="Etetés" fill={ESEMENY_SZIN.ETETES} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Állomány tábla ── */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <h3 className="h2">Állomány részletek</h3>
                    <span className="badge">Tételek: {data.allomany.length}</span>
                </div>
                <div style={{ marginTop: 12 }}>
                    {data.allomany.length === 0 ? (
                        <div className="muted">Nincs rögzített állomány.</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Halfaj</th>
                                    <th style={{ textAlign: "right" }}>Darab</th>
                                    <th style={{ textAlign: "right" }}>Min kg</th>
                                    <th style={{ textAlign: "right" }}>Max kg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.allomany.map((a, i) => (
                                    <tr key={a.halfaj.azonosito}>
                                        <td>
                                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: DIAGRAM_SZINEK[i % DIAGRAM_SZINEK.length], marginRight: 8, verticalAlign: "middle" }} />
                                            <strong>{a.halfaj.nev}</strong>
                                        </td>
                                        <td style={{ textAlign: "right" }}>{a.darab}</td>
                                        <td style={{ textAlign: "right" }}>{fmtDecimal(a.minTomegKg)}</td>
                                        <td style={{ textAlign: "right" }}>{fmtDecimal(a.maxTomegKg)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Napló / Timeline ── */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <h3 className="h2">Legutóbbi események</h3>
                    <span className="badge">Összesen: {data.timeline.length}</span>
                </div>
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {data.timeline.length === 0 ? (
                        <div className="muted">Nincs napló esemény.</div>
                    ) : (
                        data.timeline.map((e) => (
                            <div
                                key={e.azonosito}
                                className="glass"
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: 16,
                                    background: `${ESEMENY_SZIN[e.tipus] ?? "rgba(255,255,255,0.05)"}14`,
                                    borderLeft: `3px solid ${ESEMENY_SZIN[e.tipus] ?? "rgba(255,255,255,0.2)"}80`,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <EventBadge tipus={e.tipus} />
                                        {e.halfaj?.nev ? <span className="muted">• {e.halfaj.nev}</span> : null}
                                        {e.darab != null ? <span className="muted">• {e.darab} db</span> : null}
                                        {e.mennyisegKg != null ? <span className="muted">• {fmtDecimal(e.mennyisegKg)} kg</span> : null}
                                    </div>
                                    <div className="muted" style={{ fontSize: 12 }}>{fmtDate(e.datum)}</div>
                                </div>
                                {e.leiras ? <div style={{ marginTop: 6, fontSize: 13 }}>{e.leiras}</div> : null}
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}

// ─── Shared stílusok ──────────────────────────────────────────────────────────

const selectStilus: React.CSSProperties = {
    marginLeft: 8,
    padding: "8px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};
