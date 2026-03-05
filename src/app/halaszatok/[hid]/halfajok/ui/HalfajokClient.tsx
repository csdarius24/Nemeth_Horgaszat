"use client";

import { useEffect, useMemo, useState } from "react";

type Halfaj = { azonosito: number; nev: string; aktiv: boolean };
type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

export default function HalfajokClient({ hid }: { hid: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    const [viewerRole, setViewerRole] = useState<ViewerRole>("STAFF"); // fallback
    const canCreate = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const [items, setItems] = useState<Halfaj[]>([]);
    const [nev, setNev] = useState("");
    const [q, setQ] = useState("");

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(json?.error ?? "Hiba a halfajok lekérésekor.");

            setItems(json?.items ?? []);

            // ha a backend visszaadja (ajánlott), akkor role-aware UI
            if (json?.viewerRole === "OWNER" || json?.viewerRole === "ADMIN" || json?.viewerRole === "STAFF") {
                setViewerRole(json.viewerRole);
            }
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setLoading(false);
        }
    }

    async function create() {
        const n = nev.trim();
        if (!n) return;

        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: n }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba a halfaj létrehozásakor.");

            setNev("");
            await load();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hid]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((h) => h.nev.toLowerCase().includes(s));
    }, [items, q]);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((x) => x.aktiv).length;
        return { total, active };
    }, [items]);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Error */}
            {hiba && (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.22)" }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Hiba</div>
                    <div className="muted">{hiba}</div>
                </div>
            )}

            {/* Stats + search */}
            <div className="grid-2">
                <div className="glass card">
                    <h2 className="h2">Áttekintés</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szerepköröd: <span className="badge">{viewerRole}</span>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Halfajok
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats.total}</div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Aktív
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats.active}</div>
                        </div>
                    </div>

                    <div className="muted" style={{ marginTop: 12 }}>
                        {canCreate ? "Új halfaj rögzítése engedélyezett." : "STAFF-ként csak a lista elérhető."}
                    </div>
                </div>

                <div className="glass card">
                    <h2 className="h2">Keresés</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szűrés halfaj név alapján.
                    </div>

                    <div style={{ marginTop: 12 }} className="search">
                        <span style={{ opacity: 0.7 }}>⌕</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pl. 'ponty', 'amur'…" />
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => setQ("")} disabled={!q.trim()}>
                            Szűrő törlése
                        </button>
                        <span className="badge">Találat: {filtered.length}</span>
                    </div>
                </div>
            </div>

            {/* Create (only ADMIN/OWNER) */}
            {canCreate && (
                <div className="glass card">
                    <h2 className="h2">Új halfaj</h2>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                            value={nev}
                            onChange={(e) => setNev(e.target.value)}
                            placeholder="pl. Ponty / Németh Hybrid 1"
                            disabled={saving}
                            style={{
                                padding: 12,
                                minWidth: 320,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(0,0,0,0.16)",
                                color: "rgba(255,255,255,0.92)",
                                outline: "none",
                            }}
                        />

                        <button className="btn btn-primary" onClick={create} disabled={saving || !nev.trim()}>
                            {saving ? "Mentés…" : "Hozzáadás"}
                        </button>

                        <button className="btn" onClick={load} disabled={loading}>
                            Frissítés
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <h2 className="h2">Halfaj lista</h2>
                    <span className="badge">Összes: {items.length}</span>
                </div>

                <div style={{ marginTop: 12 }}>
                    {loading ? (
                        <div className="muted">Betöltés…</div>
                    ) : filtered.length === 0 ? (
                        <div className="muted">{items.length === 0 ? "Még nincs halfaj rögzítve ehhez a halászathoz." : "Nincs találat."}</div>
                    ) : (
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Név</th>
                                <th>Aktív</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((h) => (
                                <tr key={h.azonosito}>
                                    <td style={{ fontWeight: 800 }}>{h.nev}</td>
                                    <td className="muted">{h.aktiv ? "igen" : "nem"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}