"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ToAdat = {
    azonosito: number;
    nev: string;
};

type Halfaj = {
    azonosito: number;
    nev: string;
};

export default function Dashboard() {
    const router = useRouter();

    const [toak, setToak] = useState<ToAdat[]>([]);
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);

    const [ujToNev, setUjToNev] = useState("");
    const [ujHalfajNev, setUjHalfajNev] = useState("");

    const [hiba, setHiba] = useState<string | null>(null);
    const [siker, setSiker] = useState<string | null>(null);

    function frissitToak() {
        fetch("/api/toak", { cache: "no-store" })
            .then((r) => r.json())
            .then(setToak)
            .catch(() => {});
    }

    function frissitHalfajok() {
        fetch("/api/halfajok", { cache: "no-store" })
            .then((r) => r.json())
            .then(setHalfajok)
            .catch(() => {});
    }

    useEffect(() => {
        frissitToak();
        frissitHalfajok();
    }, []);

    async function ujToLetrehozas(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setSiker(null);

        if (!ujToNev.trim()) {
            setHiba("A tó neve kötelező.");
            return;
        }

        const res = await fetch("/api/toak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nev: ujToNev }),
        });

        if (!res.ok) {
            setHiba("Nem sikerült a tavat létrehozni.");
            return;
        }

        setUjToNev("");
        setSiker("Tó létrehozva.");
        frissitToak();
    }

    async function ujHalfajLetrehozas(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setSiker(null);

        if (!ujHalfajNev.trim()) {
            setHiba("A halfaj neve kötelező.");
            return;
        }

        const res = await fetch("/api/halfajok", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nev: ujHalfajNev }),
        });

        if (!res.ok) {
            setHiba("Nem sikerült a halfajt létrehozni.");
            return;
        }

        setUjHalfajNev("");
        setSiker("Halfaj hozzáadva.");
        frissitHalfajok();
    }

    return (
        <div className="app-root">
            <header className="app-header">
                <h1 className="app-title">Németh Horgászat</h1>
                <p className="app-subtitle">Tavak áttekintése</p>

                {(hiba || siker) && (
                    <div className={`alert ${hiba ? "alert-danger" : "alert-success"}`}>
                        <span>{hiba ?? siker}</span>
                        <button className="btn btn-ghost" onClick={() => (setHiba(null), setSiker(null))}>
                            ✕
                        </button>
                    </div>
                )}
            </header>

            <main className="app-main grid-2">
                {/* Tavak listája */}
                <section className="panel">
                    <h2 className="panel-title">Tavak</h2>

                    {toak.length === 0 ? (
                        <p className="muted">Nincs még tó.</p>
                    ) : (
                        <ul className="pond-list">
                            {toak.map((to) => (
                                <li
                                    key={to.azonosito}
                                    className="pond-item"
                                    onClick={() => router.push(`/toak/${to.azonosito}`)}
                                >
                                    <div className="pond-item-name">{to.nev}</div>
                                    <div className="pond-item-meta">Azonosító: {to.azonosito}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Új tó */}
                <section className="panel">
                    <h2 className="panel-title">Új tó létrehozása</h2>

                    <form onSubmit={ujToLetrehozas} className="form">
                        <label className="label">
                            Tó neve
                            <input
                                className="input"
                                value={ujToNev}
                                onChange={(e) => setUjToNev(e.target.value)}
                                placeholder="pl. Nagy-tó"
                            />
                        </label>

                        <button className="btn btn-primary">Hozzáad</button>
                    </form>
                </section>

                {/* Halfajok */}
                <section className="panel">
                    <h2 className="panel-title">Halfajok</h2>

                    {halfajok.length === 0 ? (
                        <p className="muted">Nincs még halfaj.</p>
                    ) : (
                        <ul className="simple-list">
                            {halfajok.map((h) => (
                                <li key={h.azonosito}>
                                    {h.nev} <span className="muted small">(ID: {h.azonosito})</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <form onSubmit={ujHalfajLetrehozas} className="form mt">
                        <label className="label">
                            Új halfaj neve
                            <input
                                className="input"
                                value={ujHalfajNev}
                                onChange={(e) => setUjHalfajNev(e.target.value)}
                                placeholder="pl. Ponty"
                            />
                        </label>

                        <button className="btn btn-primary">Halfaj hozzáadása</button>
                    </form>
                </section>
            </main>
        </div>
    );
}
