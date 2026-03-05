"use client";

import { useEffect, useMemo, useState } from "react";

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: "TO" | "TELELO";
    aktiv: boolean;
    letrehozva: string;
};

type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

export default function ToListaClient({ hid, viewerRole }: { hid: string; viewerRole: ViewerRole }) {
    const [toak, setToak] = useState<ToItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [nev, setNev] = useState("");
    const [tipus, setTipus] = useState<"TO" | "TELELO">("TO");
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState("");

    const canCreate = viewerRole === "OWNER" || viewerRole === "ADMIN";

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" });
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
        void load();
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

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return toak;
        return toak.filter((t) => t.nev.toLowerCase().includes(s) || t.tipus.toLowerCase().includes(s));
    }, [q, toak]);

    return (
        <div className="glass card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 className="h2">Tavak / telelők</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Lista és gyors elérés. {canCreate ? "Új tó létrehozása engedélyezett." : "Új tó létrehozása tiltva (STAFF)."}
                    </div>
                </div>

                <div style={{ minWidth: 260 }} className="search">
                    <span style={{ opacity: 0.7 }}>⌕</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés tavak között…" />
                </div>
            </div>

            {hiba && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.25)" }}>
                    {hiba}
                </div>
            )}

            <div style={{ marginTop: 14 }}>
                {loading ? (
                    <div className="muted">Betöltés…</div>
                ) : filtered.length === 0 ? (
                    <div className="muted">{toak.length === 0 ? "Még nincs tó. Adj hozzá egyet." : "Nincs találat."}</div>
                ) : (
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Név</th>
                            <th>Típus</th>
                            <th>Állapot</th>
                            <th style={{ textAlign: "right" }}>Művelet</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((t) => (
                            <tr key={t.azonosito}>
                                <td style={{ fontWeight: 700 }}>{t.nev}</td>
                                <td>
                                    <span className="badge">{t.tipus === "TELELO" ? "Telelő" : "Tó"}</span>
                                </td>
                                <td className="muted">{t.aktiv ? "Aktív" : "Inaktív"}</td>
                                <td style={{ textAlign: "right" }}>
                                    <a className="btn" href={`/halaszatok/${hid}/toak/${t.azonosito}`}>
                                        Megnyitás →
                                    </a>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create (only admin/owner) */}
            {canCreate && (
                <form onSubmit={addTo} style={{ marginTop: 16, display: "grid", gap: 10, maxWidth: 520 }}>
                    <div style={{ fontWeight: 800 }}>Új tó / telelő</div>

                    <input
                        value={nev}
                        onChange={(e) => setNev(e.target.value)}
                        placeholder="pl. Nagy-tó"
                        disabled={saving}
                        style={{
                            padding: 12,
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.16)",
                            color: "rgba(255,255,255,0.92)",
                            outline: "none",
                        }}
                    />

                    <select
                        value={tipus}
                        onChange={(e) => setTipus(e.target.value as any)}
                        disabled={saving}
                        style={{
                            padding: 12,
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.16)",
                            color: "rgba(255,255,255,0.92)",
                            outline: "none",
                        }}
                    >
                        <option value="TO">Tó</option>
                        <option value="TELELO">Telelő</option>
                    </select>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Mentés…" : "Hozzáadás"}
                    </button>
                </form>
            )}
        </div>
    );
}