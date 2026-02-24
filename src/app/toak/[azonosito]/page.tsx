"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Halfaj = { azonosito: number; nev: string };
type HalAllomany = {
    azonosito: number;
    darab: number;
    minTomegKg: string;
    maxTomegKg: string;
    halfaj: Halfaj;
};
type NaploSor = {
    azonosito: number;
    tipus: string;
    datum: string; // ISO string
    leiras: string | null;
};
type ToReszlet = {
    to: { azonosito: number; nev: string };
    halAllomany: HalAllomany[];
    naplo: NaploSor[];
};

function szamOrNull(s: string) {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
}

function fmtDatum(iso: string) {
    // gyors/egyszerű: "2026-01-07T..." -> "2026. 01. 07."
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function badgeClass(tipus: string) {
    const t = (tipus ?? "").toLowerCase();
    if (t.includes("telep")) return "badge badge-green";
    if (t.includes("kiv")) return "badge badge-red";
    if (t.includes("etet")) return "badge badge-blue";
    return "badge";
}

export default function ToOldal() {
    const { azonosito } = useParams<{ azonosito: string }>();
    const router = useRouter();
    const toId = Number(azonosito);

    const [adat, beallitAdat] = useState<ToReszlet | null>(null);
    const [hiba, beallitHiba] = useState<string | null>(null);
    const [siker, beallitSiker] = useState<string | null>(null);
    const [betolt, setBetolt] = useState(false);
    //szuro
    const [naploSzuro, setNaploSzuro] = useState<"ALL" | "TELEP" | "KIVET" | "ETET">("ALL");

    function normalizeTipus(tipus: string) {
        const t = (tipus ?? "").toLowerCase();
        if (t.includes("telep")) return "TELEP";
        if (t.includes("kiv")) return "KIVET";
        if (t.includes("etet")) return "ETET";
        return "ALL";
    }
    const szurtNaplo = useMemo(() => {
        const naplo = adat?.naplo ?? [];
        if (naploSzuro === "ALL") return naplo;
        return naplo.filter((n) => normalizeTipus(n.tipus) === naploSzuro);
    }, [adat, naploSzuro]);


    // Telepítés
    const [telepDarab, setTelepDarab] = useState("10");
    const [minT, setMinT] = useState("1.0");
    const [maxT, setMaxT] = useState("2.5");

    //halfajok
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);
    const [telepHalfajId, setTelepHalfajId] = useState<string>("");

// Telepítés extra mezők
    const [telepMunkas, setTelepMunkas] = useState("");
    const [telepMegjegyzes, setTelepMegjegyzes] = useState("");
    const [kivetelHalfajId, setKivetelHalfajId] = useState<string>("");
    const [kivetelOk, setKivetelOk] = useState("");
    // Kivétel
    const [kivetelDarab, setKivetelDarab] = useState("1");

    // Etetés
    const [etetesKg, setEtetesKg] = useState("1.5");
    const [etetesTap, setEtetesTap] = useState("");
    const [etetesMegjegyzes, setEtetesMegjegyzes] = useState("");

    async function frissit() {
        setBetolt(true);
        try {
            const r = await fetch(`/api/toak/${toId}`, { cache: "no-store" });
            const j = await r.json();
            beallitAdat(j);
        } finally {
            setBetolt(false);
        }
    }

    useEffect(() => {
        if (Number.isFinite(toId)) frissit().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toId]);

    const osszesDarab = useMemo(
        () => adat?.halAllomany.reduce((a, b) => a + b.darab, 0) ?? 0,
        [adat]
    );

    const osszesFaj = useMemo(() => adat?.halAllomany.length ?? 0, [adat]);

    useEffect(() => {
        async function frissitHalfajok() {
            const r = await fetch("/api/halfajok", { cache: "no-store" });
            const j = await r.json();
            setHalfajok(j);

            // default kiválasztás
            if (!telepHalfajId && j?.[0]) setTelepHalfajId(String(j[0].azonosito));
            if (!kivetelHalfajId && j?.[0]) setKivetelHalfajId(String(j[0].azonosito));
        }

        frissitHalfajok().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function telepites(e: React.FormEvent) {
        e.preventDefault();
        beallitHiba(null);
        beallitSiker(null);

        const darab = szamOrNull(telepDarab);
        const min = szamOrNull(minT);
        const max = szamOrNull(maxT);

        if (!darab || darab <= 0) return beallitHiba("Telepítés: darab legyen pozitív szám.");
        if (min == null || max == null || min <= 0 || max <= 0) return beallitHiba("Telepítés: tömeg legyen pozitív szám.");
        if (min > max) return beallitHiba("Telepítés: min tömeg nem lehet nagyobb, mint a max.");

        const res = await fetch("/api/telepites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: toId,
                darab,
                minTomegKg: min,
                maxTomegKg: max,
                forras: telepMunkas || undefined,
                megjegyzes: telepMegjegyzes || undefined,
            }),
        });

        if (!res.ok) {
            const ej = await res.json().catch(() => ({}));
            beallitHiba(ej?.hiba ?? "Telepítés hiba");
            return;
        }

        beallitSiker("✅ Telepítés rögzítve");
        frissit();
    }

    async function kivetel(e: React.FormEvent) {
        e.preventDefault();
        beallitHiba(null);
        beallitSiker(null);

        const darab = szamOrNull(kivetelDarab);
        if (!darab || darab <= 0) return beallitHiba("Kivétel: darab legyen pozitív szám.");

        const res = await fetch("/api/kivetel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: toId,
                darab,
                ok: kivetelOk || undefined
            }),
        });

        if (!res.ok) {
            const ej = await res.json().catch(() => ({}));
            beallitHiba(ej?.hiba ?? "Kivétel hiba");
            return;
        }

        beallitSiker("✅ Kivétel rögzítve");
        frissit();
    }
    async function gyorsKivetel(halfajAzonosito: number, darab: number) {
        const res = await fetch("/api/kivetel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toAzonosito: toId, halfajAzonosito, darab }),
        });

        if (!res.ok) {
            const ej = await res.json().catch(() => ({}));
            beallitHiba(ej?.hiba ?? "Kivétel hiba");
            return;
        }

        beallitSiker(`✅ Kivétel rögzítve (-${darab} db)`);
        frissit();
    }

    async function etetes(e: React.FormEvent) {
        e.preventDefault();
        beallitHiba(null);
        beallitSiker(null);

        const kg = szamOrNull(etetesKg);
        if (kg == null || kg <= 0) return beallitHiba("Etetés: mennyiség legyen pozitív szám.");

        const res = await fetch("/api/etetes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: toId,
                mennyisegKg: kg,
                tipus: etetesTap || undefined,
                megjegyzes: etetesMegjegyzes || undefined,
            }),
        });

        if (!res.ok) {
            const ej = await res.json().catch(() => ({}));
            beallitHiba(ej?.hiba ?? "Etetés hiba");
            return;
        }

        beallitSiker("✅ Etetés rögzítve");
        frissit();
    }

    if (!adat) return <p className="muted">Betöltés…</p>;

    return (
        <div className="app-root">
            <header className="app-header">
                <div className="header-row">
                    <button className="btn" onClick={() => router.push("/")}>
                        ← Vissza
                    </button>

                    <div className="header-title">
                        <h1 className="app-title">{adat.to.nev}</h1>
                        <p className="muted">
                            Összes hal: <b>{osszesDarab}</b> db • Fajok: <b>{osszesFaj}</b> • Tó ID: <b>{toId}</b>
                            {betolt ? " • Frissítés…" : ""}
                        </p>
                    </div>
                </div>

                {(hiba || siker) && (
                    <div className={`alert ${hiba ? "alert-danger" : "alert-success"}`}>
                        <span>{hiba ?? siker}</span>
                        <button className="btn btn-ghost" onClick={() => (beallitHiba(null), beallitSiker(null))}>
                            ✕
                        </button>
                    </div>
                )}
            </header>

            <main className="layout">
                {/* BAL: halállomány */}
                <section className="panel">
                    <div className="panel-head">
                        <h2>Halállomány</h2>
                        <button className="btn btn-ghost" onClick={() => frissit()}>
                            ↻ Frissít
                        </button>
                    </div>
                    <div className="filter-row">
                        <button className={`chip ${naploSzuro === "ALL" ? "chip-active" : ""}`}
                                onClick={() => setNaploSzuro("ALL")} type="button">
                            Összes
                        </button>
                        <button className={`chip ${naploSzuro === "TELEP" ? "chip-active" : ""}`}
                                onClick={() => setNaploSzuro("TELEP")} type="button">
                            Telepítés
                        </button>
                        <button className={`chip ${naploSzuro === "KIVET" ? "chip-active" : ""}`}
                                onClick={() => setNaploSzuro("KIVET")} type="button">
                            Kivétel
                        </button>
                        <button className={`chip ${naploSzuro === "ETET" ? "chip-active" : ""}`}
                                onClick={() => setNaploSzuro("ETET")} type="button">
                            Etetés
                        </button>
                    </div>


                    {adat.halAllomany.length === 0 ? (
                        <div className="empty">
                            <div className="empty-title">Nincs rögzített halállomány</div>
                            <div className="muted">Telepíts halat a jobb oldali panelen.</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Halfaj</th>
                                    <th className="num">Darab</th>
                                    <th className="num">Tömeg (kg)</th>
                                    <th className="num">Művelet</th>
                                </tr>
                                </thead>
                                <tbody>
                                {adat.halAllomany.map((sor) => (
                                    <tr key={sor.azonosito}>
                                        <td>
                                            <div className="cell-title">{sor.halfaj.nev}</div>
                                            <div className="muted small">Állomány ID: {sor.azonosito}</div>
                                        </td>

                                        <td className="num">
                                            <span className="pill">{sor.darab} db</span>
                                        </td>

                                        <td className="num">
        <span className="pill">
          {sor.minTomegKg} – {sor.maxTomegKg}
        </span>
                                        </td>

                                        <td className="num">
                                            <div className="row-actions">
                                                <button
                                                    className="btn btn-small"
                                                    type="button"
                                                    onClick={() => gyorsKivetel(sor.halfaj.azonosito, 1)}
                                                    disabled={sor.darab <= 0}
                                                    title="Gyors kivétel: -1 db"
                                                >
                                                    -1
                                                </button>

                                                <button
                                                    className="btn btn-small"
                                                    type="button"
                                                    onClick={() => gyorsKivetel(sor.halfaj.azonosito, 5)}
                                                    disabled={sor.darab < 5}
                                                    title="Gyors kivétel: -5 db"
                                                >
                                                    -5
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>

                            </table>
                        </div>
                    )}

                    {/* Napló */}
                    <div className="divider"/>

                    <div className="panel-head">
                        <h2>Napló</h2>
                        <span className="muted small">{szurtNaplo.length} bejegyzés</span>
                    </div>

                    {szurtNaplo.length === 0 ? (
                        <div className="empty">
                            <div className="empty-title">Nincs bejegyzés ehhez a szűrőhöz</div>
                            <div className="muted">Válts szűrőt vagy rögzíts új műveletet.</div>
                        </div>
                    ) : (
                        <ul className="timeline">
                            {szurtNaplo.map((n) => (
                                <li key={n.azonosito} className="timeline-item">
                                    <div className="timeline-dot"/>
                                    <div className="timeline-card">
                                        <div className="timeline-top">
                                            <span className={badgeClass(n.tipus)}>{n.tipus}</span>
                                            <span className="muted small">{fmtDatum(n.datum)}</span>
                                        </div>
                                        {n.leiras ? <div className="timeline-text">{n.leiras}</div> :
                                            <div className="muted">—</div>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* JOBB: műveletek */}
                <aside className="panel panel-right">
                    <h2>Tó műveletek</h2>

                    <div className="action-grid">
                        <div className="card">
                            <div className="card-head">
                                <h3>Telepítés</h3>
                                <span className="muted small">db + min/max kg</span>
                            </div>

                            <form onSubmit={telepites} className="form">
                                <label className="label">
                                    Halfaj
                                    <select className="input" value={telepHalfajId} onChange={(e) => setTelepHalfajId(e.target.value)}>
                                        {halfajok.map((h) => (
                                            <option key={h.azonosito} value={String(h.azonosito)}>{h.nev}</option>
                                        ))}
                                    </select>
                                    Darab
                                    <input
                                        className="input"
                                        type="number"
                                        min={1}
                                        step={1}
                                        placeholder="pl. 10"
                                        value={telepDarab}
                                        onChange={(e) => setTelepDarab(e.target.value)}
                                    />
                                </label>

                                <div className="row">
                                    <label className="label">
                                        Min (kg)
                                        <input
                                            className="input"
                                            type="number"
                                            min={0.01}
                                            step={0.01}
                                            placeholder="pl. 1.00"
                                            value={minT}
                                            onChange={(e) => setMinT(e.target.value)}
                                        />
                                    </label>
                                    <label className="label">
                                        Max (kg)
                                        <input
                                            className="input"
                                            type="number"
                                            min={0.01}
                                            step={0.01}
                                            placeholder="pl. 2.50"
                                            value={maxT}
                                            onChange={(e) => setMaxT(e.target.value)}
                                        />
                                    </label>
                                </div>

                                <button className="btn btn-primary">Telepít</button>
                            </form>
                        </div>

                        <div className="card">
                            <div className="card-head">
                                <h3>Kivétel</h3>
                                <span className="muted small">db</span>
                            </div>

                            <form onSubmit={kivetel} className="form">
                                <label className="label">
                                    Halfaj
                                    <select className="input" value={kivetelHalfajId}
                                            onChange={(e) => setKivetelHalfajId(e.target.value)}>
                                        {halfajok.map((h) => (
                                            <option key={h.azonosito} value={String(h.azonosito)}>{h.nev}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="label">
                                    Cél / ok
                                    <input className="input" value={kivetelOk}
                                           onChange={(e) => setKivetelOk(e.target.value)}
                                           placeholder="pl. értékesítés / selejt / állomány szabályozás"/>
                                </label>
                                <label className="label">
                                    Darab
                                    <input
                                        className="input"
                                        type="number"
                                        min={1}
                                        step={1}
                                        placeholder="pl. 1"
                                        value={kivetelDarab}
                                        onChange={(e) => setKivetelDarab(e.target.value)}
                                    />
                                </label>
                                <button className="btn btn-primary">Kivesz</button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <h3>Etetés</h3>
                            <span className="muted small">kg</span>
                        </div>

                        <form onSubmit={etetes} className="form">
                            <label className="label">
                                Mennyiség (kg)
                                <input
                                    className="input"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={etetesKg}
                                    onChange={(e) => setEtetesKg(e.target.value)}
                                />
                            </label>

                            <label className="label">
                                Haltáp típusa
                                <input
                                    className="input"
                                    placeholder="pl. AquaFeed 4mm"
                                    value={etetesTap}
                                    onChange={(e) => setEtetesTap(e.target.value)}
                                />
                            </label>

                            <label className="label">
                                Megjegyzés
                                <input
                                    className="input"
                                    placeholder="pl. hideg víz, csökkentett adag"
                                    value={etetesMegjegyzes}
                                    onChange={(e) => setEtetesMegjegyzes(e.target.value)}
                                />
                            </label>

                            <button className="btn btn-primary">Etet</button>
                        </form>

                    </div>
                </aside>
            </main>
        </div>
    );
}
