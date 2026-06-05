"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

// ─── Tipusok ─────────────────────────────────────────────────────────────────

interface ToAllomany {
    azonosito: number;
    nev: string;
    tipus: "TO" | "TELELO";
    aktiv: boolean;
    allomany: Array<{ halfajNev: string; darab: number }>;
}

interface OsszesitoValasz {
    toak: { ossz: number; aktiv: number };
    halallomany: {
        osszDarab: number;
        fajokSzama: number;
        fajonkent: Array<{ nev: string; darab: number }>;
    };
    etetes: { napok: number; osszegKg: any; darab: number };
    esemenyEloszlas: Array<{ tipus: string; darab: number }>;
    aktivitasEsemenyek: Array<{ tipus: string; datum: string }>;
    tavakAllomany: ToAllomany[];
    days: number;
}

// ─── Szinek ───────────────────────────────────────────────────────────────────

const SZINEK = ["#d08a5b", "#b24b25", "#7a2a17", "#e8a878", "#c06535", "#4a1510", "#f0b080", "#903520"];
const ESEMENY_SZIN: Record<string, string> = {
    TELEPITES: "#d08a5b",
    KIVETEL:   "#7a2a17",
    ETETES:    "#b24b25",
};
const TOOLTIP_STILUS = {
    contentStyle: {
        background: "rgba(26,10,7,0.96)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 14,
        color: "rgba(255,255,255,0.92)",
        fontSize: 13,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    },
    itemStyle: { color: "rgba(255,255,255,0.85)" },
    labelStyle: { color: "rgba(255,255,255,0.5)", marginBottom: 4 },
    cursor: { fill: "rgba(255,255,255,0.05)" },
};
const TENGELY = {
    stroke: "rgba(255,255,255,0.22)",
    tick: { fill: "rgba(255,255,255,0.58)", fontSize: 12 },
};
const LEGEND_STILUS = { color: "rgba(255,255,255,0.65)", fontSize: 12, paddingTop: 8 };

// ─── Segedly ──────────────────────────────────────────────────────────────────

function fmtDecimal(x: any) {
    const n = Number(String(x ?? 0).replace(",", "."));
    return Number.isFinite(n) ? n.toLocaleString("hu-HU", { maximumFractionDigits: 2 }) : "-";
}

function esemenyNev(t: string) {
    return t === "TELEPITES" ? "Telepites" : t === "KIVETEL" ? "Kivetel" : t === "ETETES" ? "Etetes" : t;
}

/** Tavak listajabol stacked bar chart adatot csinal.
 *  Pl.: [{ nev: "Nagy-to", Ponty: 150, Amur: 30 }, ...] */
function tavakbaStacked(tavak: ToAllomany[], fajok: string[]) {
    return tavak.map((t) => {
        const sor: Record<string, any> = { nev: t.nev };
        for (const faj of fajok) {
            sor[faj] = t.allomany.find((a) => a.halfajNev === faj)?.darab ?? 0;
        }
        return sor;
    });
}

// ─── KPI kartya ──────────────────────────────────────────────────────────────

function KpiKartya({ cim, ertek, alcim, szin }: {
    cim: string; ertek: string | number; alcim?: string; szin?: string;
}) {
    const accent = szin ?? "#d08a5b";
    return (
        <div className="glass card" style={{ borderLeft: `3px solid ${accent}`, position: "relative", overflow: "hidden" }}>
            <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at top left, ${accent}12, transparent 65%)`,
                pointerEvents: "none",
            }} />
            <div className="muted" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                {cim}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, lineHeight: 1 }}>{ertek}</div>
            {alcim && <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{alcim}</div>}
        </div>
    );
}

// ─── Tavak allomany chart (stacked) ──────────────────────────────────────────

function TavakAllomanyChart({ tavak, cim, szin }: {
    tavak: ToAllomany[];
    cim: string;
    szin: string;
}) {
    // Egyedi halfajok az adott tav tipusan belul
    const fajok = useMemo(() => {
        const set = new Set<string>();
        for (const t of tavak) for (const a of t.allomany) set.add(a.halfajNev);
        return [...set].sort();
    }, [tavak]);

    const grafikonAdat = useMemo(() => tavakbaStacked(tavak, fajok), [tavak, fajok]);

    const osszDarab = tavak.reduce((s, t) => s + t.allomany.reduce((ss, a) => ss + a.darab, 0), 0);

    if (tavak.length === 0) {
        return (
            <div className="glass card" style={{ borderLeft: `3px solid ${szin}80` }}>
                <h3 className="h2" style={{ marginBottom: 8 }}>{cim}</h3>
                <div className="muted">Nincsenek ilyen tipusu tavak.</div>
            </div>
        );
    }

    if (osszDarab === 0) {
        return (
            <div className="glass card" style={{ borderLeft: `3px solid ${szin}80` }}>
                <h3 className="h2" style={{ marginBottom: 8 }}>{cim}</h3>
                <div className="muted">
                    {tavak.length} to / telelo van, de meg nincs rogzitett halallomany.
                </div>
            </div>
        );
    }

    const chartMagassag = Math.max(180, tavak.length * 52);

    return (
        <div className="glass card" style={{ borderLeft: `3px solid ${szin}80` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <h3 className="h2">{cim}</h3>
                <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge">{tavak.length} egyseg</span>
                    <span className="badge">{osszDarab} db hal</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={chartMagassag}>
                <BarChart
                    data={grafikonAdat}
                    layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke={TENGELY.stroke} tick={TENGELY.tick} />
                    <YAxis
                        dataKey="nev"
                        type="category"
                        stroke={TENGELY.stroke}
                        tick={TENGELY.tick}
                        width={100}
                    />
                    <Tooltip
                        {...TOOLTIP_STILUS}
                        formatter={(v: any, name: any) => [`${v} db`, String(name)]}
                    />
                    <Legend wrapperStyle={LEGEND_STILUS} />
                    {fajok.map((faj, i) => (
                        <Bar
                            key={faj}
                            dataKey={faj}
                            stackId="allomany"
                            fill={SZINEK[i % SZINEK.length]}
                            radius={i === fajok.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]}
                            maxBarSize={36}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Fo komponens ─────────────────────────────────────────────────────────────

export default function HalaszatStatClient({ hid }: { hid: string }) {
    const [days, setDays] = useState(30);
    const [data, setData] = useState<OsszesitoValasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    async function betolt(d = days) {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/osszesito?days=${d}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betoltesi hiba.");
            setData(json);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void betolt(); }, [hid]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Grafikon adatok ───────────────────────────────────────────────────────

    // Esemeny eloszlas → vizszintes bar (olvashatobb mint a pie)
    const esemenyBarAdat = useMemo(() =>
        (data?.esemenyEloszlas ?? [])
            .map((e) => ({ nev: esemenyNev(e.tipus), darab: e.darab, originalTipus: e.tipus }))
            .sort((a, b) => b.darab - a.darab),
        [data]
    );

    // Aktivitas trend
    const aktivitasAdat = useMemo(() => {
        const napok: Record<string, { nap: string; Telepites: number; Kivetel: number; Etetes: number }> = {};
        for (const e of data?.aktivitasEsemenyek ?? []) {
            const nap = new Date(e.datum).toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
            if (!napok[nap]) napok[nap] = { nap, Telepites: 0, Kivetel: 0, Etetes: 0 };
            if (e.tipus === "TELEPITES") napok[nap].Telepites++;
            else if (e.tipus === "KIVETEL") napok[nap].Kivetel++;
            else if (e.tipus === "ETETES") napok[nap].Etetes++;
        }
        return Object.values(napok);
    }, [data]);

    // Tavak tipus szerint szzetvalasztva
    const toTavak = useMemo(
        () => (data?.tavakAllomany ?? []).filter((t) => t.tipus === "TO"),
        [data]
    );
    const telelоTavak = useMemo(
        () => (data?.tavakAllomany ?? []).filter((t) => t.tipus === "TELELO"),
        [data]
    );

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#d08a5b",
                    animation: "spin 0.8s linear infinite",
                }} />
                <span className="muted">Statisztikak betoltese...</span>
            </div>
        );
    }

    if (hiba) {
        return (
            <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.3)", background: "rgba(100,20,20,0.2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba a statisztikak betoltesekor</div>
                <div className="muted">{hiba}</div>
            </div>
        );
    }

    if (!data) return null;

    const vanAdat = data.halallomany.osszDarab > 0 || data.esemenyEloszlas.length > 0;

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* ── Fejlec + szuro ── */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 className="h2">Halaszat osszesito</h2>
                    <div className="muted" style={{ marginTop: 4 }}>
                        Osszes to aggregalt adatai &bull; elmult {data.days} nap
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <label className="muted" style={{ fontSize: 13 }}>
                        Idoszak:
                        <select
                            value={days}
                            onChange={(e) => { const d = Number(e.target.value); setDays(d); void betolt(d); }}
                            style={{
                                marginLeft: 8, padding: "6px 10px", borderRadius: 12,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(0,0,0,0.18)", color: "rgba(255,255,255,0.9)",
                                outline: "none", fontSize: 13,
                            }}
                        >
                            <option value={7}>7 nap</option>
                            <option value={14}>14 nap</option>
                            <option value={30}>30 nap</option>
                            <option value={60}>60 nap</option>
                            <option value={90}>90 nap</option>
                        </select>
                    </label>
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => betolt()}>&#8635;</button>
                </div>
            </div>

            {/* ── KPI kartyak ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
                <KpiKartya cim="Osszes to" ertek={data.toak.ossz} alcim={`${data.toak.aktiv} aktiv`} szin="#d08a5b" />
                <KpiKartya cim="Ossz hal" ertek={`${data.halallomany.osszDarab} db`} alcim={`${data.halallomany.fajokSzama} halfaj`} szin="#b24b25" />
                <KpiKartya cim={`Etetes (${data.days} nap)`} ertek={`${fmtDecimal(data.etetes.osszegKg)} kg`} alcim={`${data.etetes.darab} bejegyzes`} szin="#7a2a17" />
                <KpiKartya cim="Ossz esemeny" ertek={data.esemenyEloszlas.reduce((s, e) => s + e.darab, 0)} alcim="naplozott muveletek" szin="#c06535" />
            </div>

            {/* ── Nincs adat placeholder ── */}
            {!vanAdat && (
                <div className="glass card" style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>&#127907;</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Meg nincs adat a grafikonokhoz</div>
                    <div className="muted">Hozz letre tavakat, telepits halakat, es itt megjelennek az osszesitok.</div>
                </div>
            )}

            {vanAdat && (
                <>
                    {/* ── Halallomany + Esemeny eloszlas ── */}
                    <div className="grid-2">

                        {/* Halallomany fajok szerint (osszes to) */}
                        {data.halallomany.fajonkent.length > 0 && (
                            <div className="glass card">
                                <h3 className="h2" style={{ marginBottom: 16 }}>Halallomany &mdash; osszes to</h3>
                                <ResponsiveContainer width="100%" height={Math.max(160, data.halallomany.fajonkent.length * 52)}>
                                    <BarChart
                                        data={data.halallomany.fajonkent}
                                        layout="vertical"
                                        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} stroke={TENGELY.stroke} tick={TENGELY.tick} />
                                        <YAxis dataKey="nev" type="category" stroke={TENGELY.stroke} tick={TENGELY.tick} width={90} />
                                        <Tooltip
                                            {...TOOLTIP_STILUS}
                                            formatter={(v: any) => [`${v} db`, "Darabszam"] as [string, string]}
                                        />
                                        <Bar dataKey="darab" name="Darab" radius={[0, 8, 8, 0]} maxBarSize={38}>
                                            {data.halallomany.fajonkent.map((_, i) => (
                                                <Cell key={i} fill={SZINEK[i % SZINEK.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Esemeny eloszlas — vizszintes bar (jobb olvashatosag) */}
                        {esemenyBarAdat.length > 0 && (
                            <div className="glass card">
                                <h3 className="h2" style={{ marginBottom: 16 }}>Esemeny eloszlas</h3>
                                <ResponsiveContainer width="100%" height={Math.max(160, esemenyBarAdat.length * 70)}>
                                    <BarChart
                                        data={esemenyBarAdat}
                                        layout="vertical"
                                        margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} stroke={TENGELY.stroke} tick={TENGELY.tick} />
                                        <YAxis
                                            dataKey="nev"
                                            type="category"
                                            stroke={TENGELY.stroke}
                                            tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600 }}
                                            width={80}
                                        />
                                        <Tooltip
                                            {...TOOLTIP_STILUS}
                                            formatter={(v: any) => [`${v} db`, "Esemeny"] as [string, string]}
                                        />
                                        <Bar dataKey="darab" name="Esemenyek" radius={[0, 10, 10, 0]} maxBarSize={44} label={{
                                            position: "right",
                                            fill: "rgba(255,255,255,0.7)",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            formatter: (v: any) => `${v} db`,
                                        }}>
                                            {esemenyBarAdat.map((e, i) => (
                                                <Cell key={i} fill={ESEMENY_SZIN[e.originalTipus] ?? SZINEK[i % SZINEK.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* ── Tavak allomany (TO tipus) ── */}
                    <TavakAllomanyChart
                        tavak={toTavak}
                        cim="Halallomany tavankent — Tavak"
                        szin="#d08a5b"
                    />

                    {/* ── Tavak allomany (TELELO tipus) ── */}
                    <TavakAllomanyChart
                        tavak={telelоTavak}
                        cim="Halallomany tavankent — Telelo tavak"
                        szin="#7a2a17"
                    />

                    {/* ── Aktivitas trend ── */}
                    {aktivitasAdat.length > 1 && (
                        <div className="glass card">
                            <h3 className="h2" style={{ marginBottom: 16 }}>
                                Aktivitas trend &mdash; elmult {data.days} nap (osszes to)
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={aktivitasAdat} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                    <XAxis dataKey="nap" stroke={TENGELY.stroke} tick={TENGELY.tick} />
                                    <YAxis stroke={TENGELY.stroke} tick={TENGELY.tick} allowDecimals={false} />
                                    <Tooltip
                                        {...TOOLTIP_STILUS}
                                        formatter={(v: any, name: any) => [`${v} db`, String(name)]}
                                    />
                                    <Legend wrapperStyle={LEGEND_STILUS} />
                                    <Bar dataKey="Telepites" fill={ESEMENY_SZIN.TELEPITES} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Kivetel"   fill={ESEMENY_SZIN.KIVETEL}   radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Etetes"    fill={ESEMENY_SZIN.ETETES}    radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
