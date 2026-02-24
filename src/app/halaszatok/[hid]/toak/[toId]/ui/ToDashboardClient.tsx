"use client";

import { useEffect, useState } from "react";

export default function ToDashboardClient({ toId }: { toId: string }) {
    const [hiba, setHiba] = useState<string | null>(null);
    const [to, setTo] = useState<any>(null);
    const [allomany, setAllomany] = useState<any[]>([]);
    const [naplo, setNaplo] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        setHiba(null);

        try {
            const [aRes, nRes] = await Promise.all([
                fetch(`/api/toak/${toId}/allomany`),
                fetch(`/api/toak/${toId}/naplo?limit=30`),
            ]);

            const a = await aRes.json().catch(() => ({}));
            const n = await nRes.json().catch(() => ({}));

            if (!aRes.ok) {
                setHiba(a?.hiba ?? "Nem sikerült betölteni az állományt.");
                return;
            }
            if (!nRes.ok) {
                setHiba(n?.hiba ?? "Nem sikerült betölteni a naplót.");
                return;
            }

            setTo(a.to);
            setAllomany(a.allomany ?? []);
            setNaplo(n.naplo ?? []);
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toId]);

    if (loading) return <p>Betöltés…</p>;
    if (hiba) return <p style={{ color: "crimson" }}>{hiba}</p>;

    return (
        <section style={{ marginTop: 16 }}>
            <h2>{to?.nev} <span style={{ opacity: 0.7 }}>({to?.tipus})</span></h2>

            <h3 style={{ marginTop: 18 }}>Halállomány</h3>
            {allomany.length === 0 ? (
                <p style={{ opacity: 0.8 }}>Még nincs állomány.</p>
            ) : (
                <ul style={{ display: "grid", gap: 8 }}>
                    {allomany.map((x) => (
                        <li key={x.azonosito} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                            <strong>{x.halfaj.nev}</strong> — {x.darab} db
                            <div style={{ opacity: 0.7, marginTop: 6 }}>
                                tömeg: {String(x.minTomegKg)}–{String(x.maxTomegKg)} kg
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <h3 style={{ marginTop: 18 }}>Napló (utolsó 30)</h3>
            {naplo.length === 0 ? (
                <p style={{ opacity: 0.8 }}>Még nincs napló bejegyzés.</p>
            ) : (
                <ul style={{ display: "grid", gap: 8 }}>
                    {naplo.map((e) => (
                        <li key={e.azonosito} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <strong>{e.tipus}</strong>
                                <span style={{ opacity: 0.7 }}>{new Date(e.datum).toLocaleString("hu-HU")}</span>
                            </div>
                            <div style={{ opacity: 0.85, marginTop: 6 }}>
                                {e.halfaj?.nev ? `${e.halfaj.nev} · ` : ""}
                                {e.darab ? `${e.darab} db · ` : ""}
                                {e.mennyisegKg ? `${e.mennyisegKg} kg · ` : ""}
                                {e.leiras ?? ""}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}