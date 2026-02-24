"use client";

import { useEffect, useState } from "react";

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: "TO" | "TELELO";
    aktiv: boolean;
    letrehozva: string;
};

export default function HalaszatDashboardClient({ halaszatId }: { halaszatId: string }) {
    const [toak, setToak] = useState<ToItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [nev, setNev] = useState("");
    const [tipus, setTipus] = useState<"TO" | "TELELO">("TO");
    const [saving, setSaving] = useState(false);

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${halaszatId}/toak`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült betölteni a tavakat.");
                setToak([]);
                return;
            }
            setToak(data?.toak ?? []);
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [halaszatId]);

    async function addTo(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);

        const n = nev.trim();
        if (n.length < 2) {
            setHiba("Adj meg legalább 2 karaktert tó névnek.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/halaszatok/${halaszatId}/toak`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: n, tipus }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült létrehozni a tavat.");
                return;
            }

            setNev("");
            await load();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Tavak / telelők</h2>

            <form onSubmit={addTo} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Tó neve</span>
                    <input
                        value={nev}
                        onChange={(e) => setNev(e.target.value)}
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        disabled={saving}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Típus</span>
                    <select
                        value={tipus}
                        onChange={(e) => setTipus(e.target.value as any)}
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        disabled={saving}
                    >
                        <option value="TO">Tó</option>
                        <option value="TELELO">Telelő tó</option>
                    </select>
                </label>

                {hiba && <div style={{ padding: 10, borderRadius: 8, background: "#ffe5e5" }}>{hiba}</div>}

                <button disabled={saving} style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}>
                    {saving ? "Mentés..." : "Hozzáadás"}
                </button>
            </form>

            <div style={{ marginTop: 18 }}>
                {loading ? (
                    <p>Betöltés…</p>
                ) : toak.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>Még nincs tó. Adj hozzá egyet.</p>
                ) : (
                    <ul style={{ display: "grid", gap: 8 }}>
                        {toak.map((t) => (
                            <li key={t.azonosito} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                                <strong>{t.nev}</strong> <span style={{ opacity: 0.7 }}>({t.tipus})</span>
                                <div style={{ opacity: 0.7, marginTop: 6 }}>ID: {t.azonosito}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}