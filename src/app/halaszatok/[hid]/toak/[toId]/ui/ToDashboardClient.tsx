"use client";

import { useEffect, useMemo, useState } from "react";
import EtetesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/EtetesModal";
import TelepitesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/TelepitesModal";
import KivetelModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/KivetelModal";
import AttelepitesModal from "@/app/halaszatok/[hid]/toak/[toId]/ui/actions/AttelepitesModal";

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

function EventBadge({ tipus }: { tipus: string }) {
    return <span className="badge">{tipus}</span>;
}

export default function ToDashboardClient({ hid, toId }: { hid: string; toId: string }) {
    const [days, setDays] = useState(7);
    const [events, setEvents] = useState(10);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SummaryResponse | null>(null);
    const [hiba, setHiba] = useState<string | null>(null);

    const [openEtetes, setOpenEtetes] = useState(false);
    const [openTelepites, setOpenTelepites] = useState(false);
    const [openKivetel, setOpenKivetel] = useState(false);
    const [openAttelepites, setOpenAttelepites] = useState(false);

    const url = useMemo(() => {
        return `/api/halaszatok/${hid}/toak/${toId}/summary?days=${days}&events=${events}`;
    }, [hid, toId, days, events]);

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

    async function refreshAll() {
        await load();
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    if (loading) return <div className="glass card">Betöltés…</div>;
    if (hiba) {
        return (
            <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.22)" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Hiba</div>
                <div className="muted">{hiba}</div>
            </div>
        );
    }
    if (!data) return <div className="glass card">Nincs adat.</div>;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Header (tó info + actions) */}
            <div className="glass card" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 className="h2" style={{ fontSize: 22 }}>{data.to.nev}</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Típus: <span className="badge">{data.to.tipus}</span> • Tó ID: <span className="badge">{data.to.azonosito}</span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" onClick={() => setOpenEtetes(true)}>+ Etetés</button>
                    <button className="btn" onClick={() => setOpenTelepites(true)}>+ Telepítés</button>
                    <button className="btn" onClick={() => setOpenKivetel(true)}>+ Kivét</button>
                    <button className="btn" onClick={() => setOpenAttelepites(true)}>+ Áttelepítés</button>
                </div>
            </div>

            {/* Modals */}
            <EtetesModal
                open={openEtetes}
                onCloseAction={() => setOpenEtetes(false)}
                hid={hid}
                toId={toId}
                onSavedAction={async () => {
                    setOpenEtetes(false);
                    await refreshAll();
                }}
            />

            <TelepitesModal
                open={openTelepites}
                onCloseAction={() => setOpenTelepites(false)}
                hid={hid}
                toId={toId}
                onSavedAction={async () => {
                    setOpenTelepites(false);
                    await refreshAll();
                }}
            />

            <KivetelModal
                open={openKivetel}
                onCloseAction={() => setOpenKivetel(false)}
                hid={hid}
                toId={toId}
                onSavedAction={async () => {
                    setOpenKivetel(false);
                    await refreshAll();
                }}
            />

            <AttelepitesModal
                open={openAttelepites}
                onCloseAction={() => setOpenAttelepites(false)}
                hid={hid}
                toId={toId}
                onSavedAction={async () => {
                    setOpenAttelepites(false);
                    await refreshAll();
                }}
            />

            {/* Controls */}
            <div className="glass card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="badge">Szűrés</div>

                <label className="muted">
                    Etetés napok:
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        style={{
                            marginLeft: 8,
                            padding: "8px 10px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.16)",
                            color: "rgba(255,255,255,0.92)",
                            outline: "none",
                        }}
                    >
                        <option value={7}>7</option>
                        <option value={14}>14</option>
                        <option value={30}>30</option>
                        <option value={60}>60</option>
                    </select>
                </label>

                <label className="muted">
                    Események:
                    <select
                        value={events}
                        onChange={(e) => setEvents(Number(e.target.value))}
                        style={{
                            marginLeft: 8,
                            padding: "8px 10px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.16)",
                            color: "rgba(255,255,255,0.92)",
                            outline: "none",
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                    </select>
                </label>

                <button className="btn" onClick={refreshAll}>
                    Frissítés
                </button>
            </div>

            {/* KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <div className="glass card">
                    <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Össz hal (db)
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{data.summary.osszDarab}</div>
                </div>

                <div className="glass card">
                    <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Etetés ({data.summary.etetes.napok} nap)
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{fmtDecimal(data.summary.etetes.osszegKg)} kg</div>
                    <div className="muted" style={{ marginTop: 6 }}>Bejegyzések: {data.summary.etetes.darab}</div>
                </div>

                <div className="glass card">
                    <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Halfajok
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{data.allomany.length}</div>
                </div>
            </div>

            {/* Stock list */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <h3 className="h2">Állomány</h3>
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
                            {data.allomany.map((a) => (
                                <tr key={a.halfaj.azonosito}>
                                    <td style={{ fontWeight: 800 }}>{a.halfaj.nev}</td>
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

            {/* Timeline */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <h3 className="h2">Legutóbbi események</h3>
                    <span className="badge">Események: {data.timeline.length}</span>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {data.timeline.length === 0 ? (
                        <div className="muted">Nincs napló esemény.</div>
                    ) : (
                        data.timeline.map((e) => (
                            <div key={e.azonosito} className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <EventBadge tipus={e.tipus} />
                                        {e.halfaj?.nev ? <span className="muted">• {e.halfaj.nev}</span> : null}
                                        {e.darab != null ? <span className="muted">• {e.darab} db</span> : null}
                                        {e.mennyisegKg != null ? <span className="muted">• {fmtDecimal(e.mennyisegKg)} kg</span> : null}
                                    </div>
                                    <div className="muted">{fmtDate(e.datum)}</div>
                                </div>

                                {e.leiras ? <div style={{ marginTop: 8 }}>{e.leiras}</div> : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}