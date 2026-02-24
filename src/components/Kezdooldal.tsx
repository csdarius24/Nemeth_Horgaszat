"use client";

import React, { useEffect, useMemo, useState } from "react";

type ToAdat = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
    letrehozva: string;
    frissitve: string;
};

type HalfajAdat = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
};

type HalAllomanySor = {
    azonosito: number;
    darab: number;
    minTomegKg: string;
    maxTomegKg: string;
    halfaj: HalfajAdat;
};

type NaploSor = {
    azonosito: number;
    tipus: "TELEPITES" | "KIVETEL" | "ETETES";
    datum: string;
    darab: number | null;
    mennyisegKg: string | null;
    leiras: string | null;
    halfaj: HalfajAdat | null;
};

type ToReszletValasz = {
    to: ToAdat;
    halAllomany: HalAllomanySor[];
    naplo: NaploSor[];
};

function szamOrNull(s: string) {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
}

export default function Kezdooldal() {
    //etetes
    const [etetesMennyiseg, beallitEtetesMennyiseg] = useState("1.50");
    const [etetesTipus, beallitEtetesTipus] = useState("Pellet");
    const [etetesMegjegyzes, beallitEtetesMegjegyzes] = useState("");

    //kivetel
    const [kivetelDarab, beallitKivetelDarab] = useState("1");
    const [kivetelOk, beallitKivetelOk] = useState("Értékesítés");
    const [kivetelMegjegyzes, beallitKivetelMegjegyzes] = useState("");

    // Tavak
    const [toNev, beallitToNev] = useState("");
    const [toak, beallitToak] = useState<ToAdat[]>([]);
    const [kivalasztottToId, beallitKivalasztottToId] = useState<number | null>(null);

    // Halfajok
    const [halfajok, beallitHalfajok] = useState<HalfajAdat[]>([]);
    const ponty = useMemo(
        () => halfajok.find((h) => h.nev.toLowerCase() === "ponty") ?? null,
        [halfajok]
    );
    const [kivalasztottHalfajId, beallitKivalasztottHalfajId] = useState<number | null>(null);

    // Tó részlet
    const [toReszlet, beallitToReszlet] = useState<ToReszletValasz | null>(null);

    // Telepítés űrlap
    const [darab, beallitDarab] = useState("10");
    const [minTomeg, beallitMinTomeg] = useState("1.0");
    const [maxTomeg, beallitMaxTomeg] = useState("2.5");
    const [forras, beallitForras] = useState("Tógazdaság");
    const [megjegyzes, beallitMegjegyzes] = useState("");

    const [tolt, beallitTolt] = useState(false);
    const [hiba, beallitHiba] = useState<string | null>(null);
    const [siker, beallitSiker] = useState<string | null>(null);

    async function toakBetoltese() {
        const res = await fetch("/api/toak", { cache: "no-store" });
        if (!res.ok) throw new Error(`Tavak lekérése hiba: ${res.status}`);
        const adat = (await res.json()) as ToAdat[];
        beallitToak(adat);

        if (!kivalasztottToId && adat.length > 0) {
            beallitKivalasztottToId(adat[0].azonosito);
        }
    }

    async function halfajokBetoltese() {
        const res = await fetch("/api/halfajok", { cache: "no-store" });
        if (!res.ok) throw new Error(`Halfajok lekérése hiba: ${res.status}`);
        const adat = (await res.json()) as HalfajAdat[];
        beallitHalfajok(adat);
    }

    async function toReszletBetoltese(toId: number) {
        const res = await fetch(`/api/toak/${toId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Tó részlet lekérése hiba: ${res.status}`);
        const adat = (await res.json()) as ToReszletValasz;
        beallitToReszlet(adat);
    }

    async function ujToLetrehozasa(e: React.FormEvent) {
        e.preventDefault();
        const nev = toNev.trim();
        if (!nev) return;

        beallitHiba(null);
        beallitSiker(null);

        const res = await fetch("/api/toak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nev }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            beallitHiba(err?.hiba ?? `Hiba a mentésnél: ${res.status}`);
            return;
        }

        beallitToNev("");
        await toakBetoltese();
        beallitSiker("Tó hozzáadva.");
    }

    async function telepitesKuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!kivalasztottToId) return;

        beallitHiba(null);
        beallitSiker(null);

        const darabSzam = szamOrNull(darab);
        const minSzam = szamOrNull(minTomeg) ?? 0;
        const maxSzam = szamOrNull(maxTomeg) ?? 0;

        if (!darabSzam || darabSzam < 1) {
            beallitHiba("A darab legalább 1 legyen.");
            return;
        }
        if (minSzam < 0 || maxSzam < 0) {
            beallitHiba("A tömeg nem lehet negatív.");
            return;
        }
        if (maxSzam > 0 && minSzam > maxSzam) {
            beallitHiba("A min. tömeg nem lehet nagyobb, mint a max. tömeg.");
            return;
        }

        const halfajId = kivalasztottHalfajId ?? ponty?.azonosito ?? null;

        const res = await fetch("/api/telepites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: kivalasztottToId,
                halfajAzonosito: halfajId,
                darab: darabSzam,
                minTomegKg: minSzam,
                maxTomegKg: maxSzam,
                forras: forras.trim() || undefined,
                megjegyzes: megjegyzes.trim() || undefined,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            beallitHiba(err?.hiba ?? `Telepítés hiba: ${res.status}`);
            return;
        }

        beallitSiker("Telepítés rögzítve.");
        await toReszletBetoltese(kivalasztottToId);
    }
    async function kivetelKuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!kivalasztottToId) return;

        beallitHiba(null);
        beallitSiker(null);

        const darabSzam = szamOrNull(kivetelDarab);
        if (!darabSzam || darabSzam < 1) {
            beallitHiba("A kivétel darabszám legalább 1 legyen.");
            return;
        }

        const halfajId = kivalasztottHalfajId ?? ponty?.azonosito ?? null;

        const res = await fetch("/api/kivetel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: kivalasztottToId,
                halfajAzonosito: halfajId,
                darab: darabSzam,
                ok: kivetelOk.trim() || undefined,
                megjegyzes: kivetelMegjegyzes.trim() || undefined,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            beallitHiba(err?.hiba ?? `Kivétel hiba: ${res.status}`);
            return;
        }

        beallitSiker("Kivétel rögzítve.");
        await toReszletBetoltese(kivalasztottToId);
    }
    async function etetesKuldes(e: React.FormEvent) {
        e.preventDefault();
        if (!kivalasztottToId) return;

        beallitHiba(null);
        beallitSiker(null);

        const kg = szamOrNull(etetesMennyiseg);
        if (!kg || kg <= 0) {
            beallitHiba("Az etetés mennyisége (kg) legyen > 0.");
            return;
        }

        const res = await fetch("/api/etetes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toAzonosito: kivalasztottToId,
                mennyisegKg: kg,
                tipus: etetesTipus.trim() || undefined,
                megjegyzes: etetesMegjegyzes.trim() || undefined,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            beallitHiba(err?.hiba ?? `Etetés hiba: ${res.status}`);
            return;
        }

        beallitSiker("Etetés rögzítve.");
        await toReszletBetoltese(kivalasztottToId);
    }


    useEffect(() => {
        (async () => {
            try {
                beallitTolt(true);
                await Promise.all([toakBetoltese(), halfajokBetoltese()]);
            } catch (e) {
                beallitHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
            } finally {
                beallitTolt(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!kivalasztottToId) return;
        toReszletBetoltese(kivalasztottToId).catch((e) =>
            beallitHiba(e instanceof Error ? e.message : "Ismeretlen hiba")
        );
    }, [kivalasztottToId]);

    useEffect(() => {
        // default halfaj: ponty ha van
        if (!kivalasztottHalfajId && ponty) beallitKivalasztottHalfajId(ponty.azonosito);
    }, [ponty, kivalasztottHalfajId]);

    const osszesDarab = useMemo(() => {
        if (!toReszlet) return 0;
        return toReszlet.halAllomany.reduce((acc, sor) => acc + sor.darab, 0);
    }, [toReszlet]);

    return (
        <div className="app-root">
            <header className="app-header">
                <h1 className="app-title">Németh Horgászat</h1>
                <p className="app-subtitle">Frontend teszt – Telepítés</p>
            </header>

            <main className="app-main">
                <section className="panel panel-left">
                    <div className="card">
                        <h2 className="panel-title">Új tó</h2>
                        <form onSubmit={ujToLetrehozasa} className="input-row">
                            <input
                                className="input"
                                placeholder="Pl. Öreg-tó"
                                value={toNev}
                                onChange={(e) => beallitToNev(e.target.value)}
                            />
                            <button className="btn btn-primary" type="submit">
                                Hozzáadás
                            </button>
                        </form>

                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                            <button
                                className="btn"
                                type="button"
                                onClick={() => toakBetoltese().catch(() => {})}
                            >
                                Tavak frissítése
                            </button>
                            {tolt && <span className="muted">Betöltés...</span>}
                        </div>

                        {hiba && (
                            <p className="muted" style={{ marginTop: 10 }}>
                                {hiba}
                            </p>
                        )}
                        {siker && (
                            <p className="muted" style={{ marginTop: 10 }}>
                                {siker}
                            </p>
                        )}
                    </div>

                    <div className="card">
                        <h2 className="panel-title">Tavak</h2>

                        {toak.length === 0 && !tolt ? (
                            <p className="muted">Nincs még tó.</p>
                        ) : (
                            <ul className="pond-list">
                                {toak.map((to) => (
                                    <li
                                        key={to.azonosito}
                                        className={
                                            "pond-item " +
                                            (kivalasztottToId === to.azonosito ? "pond-item--active" : "")
                                        }
                                        onClick={() => beallitKivalasztottToId(to.azonosito)}
                                    >
                                        <div className="pond-item-name">{to.nev}</div>
                                        <div className="pond-item-meta">ID: {to.azonosito}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className="panel panel-right">
                    <div className="card">
                        <h2 className="panel-title">
                            {toReszlet?.to.nev ? `${toReszlet.to.nev} – összesen ${osszesDarab} db` : "Tó részletei"}
                        </h2>
                        <p className="muted">
                            Ha itt frissül a halállomány és megjelenik a napló, akkor a telepítés lánc rendben.
                        </p>
                    </div>

                    <div className="card">
                        <h2 className="panel-title">Telepítés</h2>

                        <form onSubmit={telepitesKuldes} className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Halfaj</label>
                                <select
                                    className="input"
                                    value={kivalasztottHalfajId ?? ""}
                                    onChange={(e) => beallitKivalasztottHalfajId(Number(e.target.value))}
                                >
                                    {halfajok.map((h) => (
                                        <option key={h.azonosito} value={h.azonosito}>
                                            {h.nev}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Darab</label>
                                <input
                                    className="input"
                                    value={darab}
                                    onChange={(e) => beallitDarab(e.target.value)}
                                    placeholder="Pl. 10"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Forrás</label>
                                <input
                                    className="input"
                                    value={forras}
                                    onChange={(e) => beallitForras(e.target.value)}
                                    placeholder="Pl. Tógazdaság"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Min. tömeg (kg)</label>
                                <input
                                    className="input"
                                    value={minTomeg}
                                    onChange={(e) => beallitMinTomeg(e.target.value)}
                                    placeholder="Pl. 1.2"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Max. tömeg (kg)</label>
                                <input
                                    className="input"
                                    value={maxTomeg}
                                    onChange={(e) => beallitMaxTomeg(e.target.value)}
                                    placeholder="Pl. 2.5"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <label className="form-label">Megjegyzés</label>
                                <input
                                    className="input"
                                    value={megjegyzes}
                                    onChange={(e) => beallitMegjegyzes(e.target.value)}
                                    placeholder="Opcionális"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <button className="btn btn-primary" type="submit">
                                    Telepítés rögzítése
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="card">
                        <h2 className="panel-title">Kivétel</h2>

                        <form onSubmit={kivetelKuldes} className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Darab</label>
                                <input
                                    className="input"
                                    value={kivetelDarab}
                                    onChange={(e) => beallitKivetelDarab(e.target.value)}
                                    placeholder="Pl. 3"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Ok</label>
                                <input
                                    className="input"
                                    value={kivetelOk}
                                    onChange={(e) => beallitKivetelOk(e.target.value)}
                                    placeholder="Pl. Értékesítés"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <label className="form-label">Megjegyzés</label>
                                <input
                                    className="input"
                                    value={kivetelMegjegyzes}
                                    onChange={(e) => beallitKivetelMegjegyzes(e.target.value)}
                                    placeholder="Opcionális"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <button className="btn btn-primary" type="submit">
                                    Kivétel rögzítése
                                </button>
                            </div>
                        </form>
                    </div>


                    <div className="card">
                        <h2 className="panel-title">Halállomány</h2>

                        {!toReszlet || toReszlet.halAllomany.length === 0 ? (
                            <p className="muted">Nincs még állomány ebben a tóban.</p>
                        ) : (
                            <table className="fish-table">
                                <thead>
                                <tr>
                                    <th>Halfaj</th>
                                    <th>Darab</th>
                                    <th>Tömegtartomány (kg)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {toReszlet.halAllomany.map((sor) => (
                                    <tr key={sor.azonosito}>
                                        <td>{sor.halfaj.nev}</td>
                                        <td>{sor.darab}</td>
                                        <td>
                                            {sor.minTomegKg} – {sor.maxTomegKg}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="card">
                        <h2 className="panel-title">Etetés</h2>

                        <form onSubmit={etetesKuldes} className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Mennyiség (kg)</label>
                                <input
                                    className="input"
                                    value={etetesMennyiseg}
                                    onChange={(e) => beallitEtetesMennyiseg(e.target.value)}
                                    placeholder="Pl. 1.50"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Típus</label>
                                <input
                                    className="input"
                                    value={etetesTipus}
                                    onChange={(e) => beallitEtetesTipus(e.target.value)}
                                    placeholder="Pl. Pellet"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <label className="form-label">Megjegyzés</label>
                                <input
                                    className="input"
                                    value={etetesMegjegyzes}
                                    onChange={(e) => beallitEtetesMegjegyzes(e.target.value)}
                                    placeholder="Opcionális"
                                />
                            </div>

                            <div className="form-field" style={{gridColumn: "1 / -1"}}>
                                <button className="btn btn-primary" type="submit">
                                    Etetés rögzítése
                                </button>
                            </div>
                        </form>
                    </div>


                    <div className="card">
                        <h2 className="panel-title">Napló (utolsó 20)</h2>

                        {!toReszlet || toReszlet.naplo.length === 0 ? (
                            <p className="muted">Nincs még napló bejegyzés.</p>
                        ) : (
                            <ul className="pond-list">
                                {toReszlet.naplo.map((n) => (
                                    <li key={n.azonosito} className="pond-item">
                                        <div className="pond-item-name">
                                            {n.tipus}
                                            {n.halfaj?.nev ? ` – ${n.halfaj.nev}` : ""}
                                            {n.darab ? ` – ${n.darab} db` : ""}
                                        </div>
                                        <div className="pond-item-meta">
                                            {new Date(n.datum).toLocaleString("hu-HU")}
                                        </div>
                                        {n.leiras ? <div className="pond-item-meta">{n.leiras}</div> : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </main>

            <footer className="app-footer">Frontend telepítés teszt</footer>
        </div>
    );
}
