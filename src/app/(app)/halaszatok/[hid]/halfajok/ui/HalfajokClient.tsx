"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─── Tipusok ─────────────────────────────────────────────────────────────────

type Halfaj = { azonosito: number; nev: string; aktiv: boolean };
type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

// ─── Ikonok ──────────────────────────────────────────────────────────────────

function EditIcon() {
    return (
        <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

// ─── Fo komponens ─────────────────────────────────────────────────────────────

export default function HalfajokClient({ hid }: { hid: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    const [viewerRole, setViewerRole] = useState<ViewerRole>("STAFF");
    const canEdit = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const [items, setItems] = useState<Halfaj[]>([]);
    const [ujNev, setUjNev] = useState("");
    const [q, setQ] = useState("");
    const [inaktivakMutatasa, setInaktivakMutatasa] = useState(false);

    // Szerkesztes allapot
    const [szerkesztettId, setSzerkesztettId] = useState<number | null>(null);
    const [szerkesztettNev, setSzerkesztettNev] = useState("");
    const szerkesztesInput = useRef<HTMLInputElement>(null);

    // Muvelet folyamatban (torlés / aktivalas) — melyik sorban
    const [muveletId, setMuveletId] = useState<number | null>(null);

    // ── Betoltes ──────────────────────────────────────────────────────────────

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const url = `/api/halaszatok/${hid}/halfajok${inaktivakMutatasa ? "?active=0" : ""}`;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba a halfajok lekeresekor.");
            setItems(json?.items ?? []);
            if (json?.viewerRole) setViewerRole(json.viewerRole);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, [hid, inaktivakMutatasa]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Letrehozas ────────────────────────────────────────────────────────────

    async function create() {
        const n = ujNev.trim();
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
            if (!res.ok) throw new Error(json?.error ?? "Letrehozasi hiba.");
            setUjNev("");
            await load();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    // ── Szerkesztes ───────────────────────────────────────────────────────────

    function szerkesztesInditas(h: Halfaj) {
        setSzerkesztettId(h.azonosito);
        setSzerkesztettNev(h.nev);
        setTimeout(() => szerkesztesInput.current?.focus(), 50);
    }

    function szerkesztesMegse() {
        setSzerkesztettId(null);
        setSzerkesztettNev("");
    }

    async function szerkesztesKuldes(azonosito: number) {
        const nev = szerkesztettNev.trim();
        if (!nev) return;
        setMuveletId(azonosito);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok/${azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Frissitesi hiba.");
            setSzerkesztettId(null);
            await load();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setMuveletId(null);
        }
    }

    // ── Aktiv toggle ──────────────────────────────────────────────────────────

    async function aktivToggle(h: Halfaj) {
        setMuveletId(h.azonosito);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok/${h.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aktiv: !h.aktiv }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Frissitesi hiba.");
            // Optimista frissites
            setItems((prev) => prev.map((x) => x.azonosito === h.azonosito ? { ...x, aktiv: !h.aktiv } : x));
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setMuveletId(null);
        }
    }

    // ── Torles ────────────────────────────────────────────────────────────────

    async function torol(h: Halfaj) {
        if (!confirm(`Torlod ezt a halfajt?\n"${h.nev}"\n\nHa allomanyhoz vagy esemenyhoz kotodik, az alkalmazas felajanlja az inaktivalast.`)) return;
        setMuveletId(h.azonosito);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok/${h.azonosito}`, { method: "DELETE" });
            const json = await res.json().catch(() => ({}));

            if (res.status === 409 && json?.inaktivalhatjuk) {
                // Nem torolheto mert hasznalt — felajanljuk az inaktivalast
                const igen = confirm(
                    `"${h.nev}" nem torolheto, mert halallomanyhoz vagy esemenyhez kotodik.\n\nSzeretned helyette inaktivalni?`
                );
                if (igen) {
                    await aktivToggle({ ...h, aktiv: true });
                }
                return;
            }

            if (!res.ok) throw new Error(json?.error ?? "Torlesi hiba.");
            await load();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba");
        } finally {
            setMuveletId(null);
        }
    }

    // ── Szures ────────────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? items.filter((h) => h.nev.toLowerCase().includes(s)) : items;
    }, [items, q]);

    const stats = useMemo(() => ({
        total: items.length,
        active: items.filter((x) => x.aktiv).length,
    }), [items]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* Hiba */}
            {hiba && (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.22)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba</div>
                        <div className="muted">{hiba}</div>
                    </div>
                    <button className="btn" onClick={() => setHiba(null)} style={{ flexShrink: 0 }}>&#10005;</button>
                </div>
            )}

            {/* Attekintes + kereses */}
            <div className="grid-2">
                <div className="glass card">
                    <h2 className="h2">Attekintes</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szerepkor: <span className="badge">{viewerRole}</span>
                    </div>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div className="glass" style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(255,255,255,0.07)" }}>
                            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Halfajok</div>
                            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{stats.total}</div>
                        </div>
                        <div className="glass" style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(255,255,255,0.07)" }}>
                            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Aktiv</div>
                            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{stats.active}</div>
                        </div>
                    </div>
                    <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                        {canEdit ? "Szerkesztes es torles engedélyezett (ADMIN/OWNER)." : "STAFF-kent csak a lista elerheto."}
                    </div>
                </div>

                <div className="glass card">
                    <h2 className="h2">Kereses</h2>
                    <div className="muted" style={{ marginTop: 6 }}>Szures halfaj nev alapjan.</div>
                    <div style={{ marginTop: 12 }} className="search">
                        <span style={{ opacity: 0.7 }}>&#9906;</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pl. ponty, amur..." />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <button className="btn" onClick={() => setQ("")} disabled={!q.trim()}>Szuro torlese</button>
                        <span className="badge">Talalat: {filtered.length}</span>
                        <button
                            className={inaktivakMutatasa ? "btn btn-primary" : "btn"}
                            onClick={() => setInaktivakMutatasa((v) => !v)}
                            style={{ fontSize: 12 }}
                        >
                            {inaktivakMutatasa ? "Inaktivak elrejtese" : "Inaktivak mutatasa"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Uj halfaj (csak ADMIN/OWNER) */}
            {canEdit && (
                <div className="glass card">
                    <h2 className="h2">Uj halfaj</h2>
                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                            value={ujNev}
                            onChange={(e) => setUjNev(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                            placeholder="pl. Ponty / Nemeth Hybrid 1"
                            disabled={saving}
                            style={inputStil}
                        />
                        <button className="btn btn-primary" onClick={create} disabled={saving || !ujNev.trim()}>
                            {saving ? "Mentes..." : "+ Hozzaadas"}
                        </button>
                        <button className="btn" onClick={load} disabled={loading}>&#8635; Frissites</button>
                    </div>
                </div>
            )}

            {/* Lista */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <h2 className="h2">Halfaj lista</h2>
                    <span className="badge">Osszes: {items.length}</span>
                </div>

                {loading ? (
                    <div className="muted">Betoltes...</div>
                ) : filtered.length === 0 ? (
                    <div className="muted">
                        {items.length === 0
                            ? "Meg nincs halfaj rogzitve ehhez a halaszathoz."
                            : "Nincs talalat."}
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nev</th>
                                <th style={{ textAlign: "center" }}>Allapot</th>
                                {canEdit && <th style={{ textAlign: "right" }}>Muveletek</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((h) => {
                                const folyamatban = muveletId === h.azonosito;
                                const szerkesztesben = szerkesztettId === h.azonosito;

                                return (
                                    <tr
                                        key={h.azonosito}
                                        style={{ opacity: !h.aktiv ? 0.55 : 1, transition: "opacity 0.2s" }}
                                    >
                                        {/* Nev / szerkesztés */}
                                        <td>
                                            {szerkesztesben ? (
                                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                    <input
                                                        ref={szerkesztesInput}
                                                        value={szerkesztettNev}
                                                        onChange={(e) => setSzerkesztettNev(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") szerkesztesKuldes(h.azonosito);
                                                            if (e.key === "Escape") szerkesztesMegse();
                                                        }}
                                                        style={{ ...inputStil, minWidth: 180, padding: "6px 12px", fontSize: 13 }}
                                                        disabled={folyamatban}
                                                    />
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => szerkesztesKuldes(h.azonosito)}
                                                        disabled={folyamatban || !szerkesztettNev.trim()}
                                                        style={{ padding: "6px 12px", fontSize: 12 }}
                                                    >
                                                        {folyamatban ? "..." : "Mentes"}
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={szerkesztesMegse}
                                                        style={{ padding: "6px 10px", fontSize: 12 }}
                                                    >
                                                        Megse
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontWeight: 700 }}>{h.nev}</span>
                                            )}
                                        </td>

                                        {/* Allapot badge */}
                                        <td style={{ textAlign: "center" }}>
                                            <span
                                                className="badge"
                                                style={{
                                                    background: h.aktiv ? "rgba(58,125,68,0.25)" : "rgba(120,120,120,0.2)",
                                                    borderColor: h.aktiv ? "rgba(58,125,68,0.5)" : "rgba(120,120,120,0.35)",
                                                    color: h.aktiv ? "#7fcc8a" : "rgba(255,255,255,0.45)",
                                                }}
                                            >
                                                {h.aktiv ? "Aktiv" : "Inaktiv"}
                                            </span>
                                        </td>

                                        {/* Muveletek */}
                                        {canEdit && (
                                            <td style={{ textAlign: "right" }}>
                                                {!szerkesztesben && (
                                                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>

                                                        {/* Szerkesztes */}
                                                        <button
                                                            className="btn"
                                                            onClick={() => szerkesztesInditas(h)}
                                                            disabled={folyamatban}
                                                            title="Atnevezes"
                                                            style={{ padding: "6px 10px", gap: 5 }}
                                                        >
                                                            <EditIcon />
                                                        </button>

                                                        {/* Aktiv / inaktiv toggle */}
                                                        <button
                                                            className="btn"
                                                            onClick={() => aktivToggle(h)}
                                                            disabled={folyamatban}
                                                            title={h.aktiv ? "Inaktivalas" : "Aktivalas"}
                                                            style={{
                                                                padding: "6px 10px",
                                                                color: h.aktiv ? "rgba(255,200,100,0.85)" : "rgba(100,220,130,0.85)",
                                                                borderColor: h.aktiv ? "rgba(255,200,100,0.25)" : "rgba(100,220,130,0.25)",
                                                            }}
                                                        >
                                                            {folyamatban ? "..." : h.aktiv ? <EyeOffIcon /> : <EyeIcon />}
                                                        </button>

                                                        {/* Torles */}
                                                        <button
                                                            className="btn"
                                                            onClick={() => torol(h)}
                                                            disabled={folyamatban}
                                                            title="Torles"
                                                            style={{
                                                                padding: "6px 10px",
                                                                color: "rgba(220,100,100,0.85)",
                                                                borderColor: "rgba(220,100,100,0.25)",
                                                            }}
                                                        >
                                                            {folyamatban ? "..." : <TrashIcon />}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ─── Shared stilus ────────────────────────────────────────────────────────────

const inputStil: React.CSSProperties = {
    padding: "10px 14px",
    minWidth: 280,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 14,
};
