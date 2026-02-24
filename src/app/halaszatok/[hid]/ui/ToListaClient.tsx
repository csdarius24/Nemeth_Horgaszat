"use client";

import { useEffect, useState } from "react";

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: "TO" | "TELELO";
    aktiv: boolean;
    letrehozva: string;
};

export default function ToListaClient({ hid }: { hid: string }) {
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
            const res = await fetch(`/api/halaszatok/${hid}/toak`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült betölteni a tavakat.");
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
    }, [hid]);

    async function addTo(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = nev.trim();
        if (trimmed.length < 2) {
            setHiba("Adj meg legalább 2 karaktert a tó nevéhez.");
            return;
        }

        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: trimmed, tipus }),
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
        <section style={{ marginTop: 18 }}>
            <h2>Tavak</h2>

            {hiba && <p style={{ color: "crimson" }}>{hiba}</p>}
            {loading ? (
                <p>Betöltés...</p>
            ) : (
                <ul style={{ display: "grid", gap: 8, paddingLeft: 18 }}>
                    {toak.map((t) => (
                        <li key={t.azonosito}>
                            <a href={`/halaszatok/${hid}/toak/${t.azonosito}`}>
                                {t.nev}
                            </a>{" "}
                            <span style={{ opacity: 0.7 }}>
                ({t.tipus === "TELELO" ? "telelő" : "tó"})
              </span>
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={addTo} style={{ marginTop: 14, display: "grid", gap: 8, maxWidth: 420 }}>
                <strong>Új tó / telelő</strong>
                <input
                    value={nev}
                    onChange={(e) => setNev(e.target.value)}
                    placeholder="pl. Nagy-tó"
                    disabled={saving}
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <select
                    value={tipus}
                    onChange={(e) => setTipus(e.target.value as any)}
                    disabled={saving}
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                >
                    <option value="TO">Tó</option>
                    <option value="TELELO">Telelő</option>
                </select>
                <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
                >
                    {saving ? "Mentés..." : "Hozzáadás"}
                </button>
            </form>
        </section>
    );
}