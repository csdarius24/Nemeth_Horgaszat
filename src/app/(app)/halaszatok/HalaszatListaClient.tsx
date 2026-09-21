"use client";

import { useEffect, useMemo, useState } from "react";

type HalaszatItem = {
    szerepkor: "OWNER" | "ADMIN" | "STAFF";
    halaszat: {
        azonosito: number;
        nev: string;
        slug: string;
        aktiv: boolean;
        letrehozva: string;
    };
};

function roleLabel(r: HalaszatItem["szerepkor"]) {
    if (r === "OWNER") return "Tulajdonos";
    if (r === "ADMIN") return "Admin";
    return "Dolgozó";
}

function roleBadgeClass(r: HalaszatItem["szerepkor"]) {
    if (r === "OWNER") return "badge";
    if (r === "ADMIN") return "badge";
    return "badge";
}

export default function HalaszatListaClient() {
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const [items, setItems] = useState<HalaszatItem[]>([]);
    const [q, setQ] = useState("");

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            setHiba(null);
            try {
                const res = await fetch("/api/halaszatok", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setHiba(data?.hiba ?? "Nem sikerült betölteni.");
                    return;
                }
                if (mounted) setItems(data?.halaszatok ?? []);
            } catch {
                setHiba("Hálózati hiba.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((x) => {
            const h = x.halaszat;
            return (
                h.nev.toLowerCase().includes(s) ||
                h.slug.toLowerCase().includes(s) ||
                x.szerepkor.toLowerCase().includes(s)
            );
        });
    }, [items, q]);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((x) => x.halaszat.aktiv).length;
        const owners = items.filter((x) => x.szerepkor === "OWNER").length;
        return { total, active, owners };
    }, [items]);

    if (loading) {
        return (
            <div className="glass card" style={{ padding: 16 }}>
                Betöltés…
            </div>
        );
    }

    if (hiba) {
        return (
            <div className="glass card" style={{ padding: 16, borderColor: "rgba(255,120,120,0.35)" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Hiba</div>
                <div className="muted">{hiba}</div>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Top controls + stats */}
            <div className="grid-2">
                <div className="glass card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <h2 className="h2">Áttekintés</h2>
                        <span className="badge">Kezelőpult</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 12 }}>
                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Halászatok
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.total}</div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Aktív
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.active}</div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Tulajdonos
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.owners}</div>
                        </div>
                    </div>

                    <div className="muted" style={{ marginTop: 12 }}>
                        Tipp: keress névre vagy slugra a gyors szűréshez.
                    </div>
                </div>

                <div className="glass card">
                    <h2 className="h2">Keresés</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szűrd a listát név / slug / szerepkör alapján.
                    </div>

                    <div style={{ marginTop: 12 }} className="search">
                        <span style={{ opacity: 0.7 }}>⌕</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pl. 'Tisza', 'nemeth', 'owner'…" />
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => setQ("")} disabled={!q.trim()}>
                            Szűrő törlése
                        </button>
                        <span className="badge">Találat: {filtered.length}</span>
                    </div>
                </div>
            </div>

            {/* List / empty */}
            {filtered.length === 0 ? (
                <div className="glass card">
                    <div style={{ fontWeight: 700 }}>Nincs találat</div>
                    <div className="muted" style={{ marginTop: 6 }}>
                        {items.length === 0
                            ? "Még nincs halászatod. Hozz létre egyet!"
                            : "Próbálj más keresést."}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 14,
                    }}
                >
                    {filtered.map((x) => (
                        <div key={x.halaszat.azonosito} className="glass card">
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{x.halaszat.nev}</div>
                                    <div className="muted" style={{ marginTop: 6 }}>
                                        slug: <span style={{ color: "rgba(255,255,255,0.85)" }}>{x.halaszat.slug}</span>
                                    </div>
                                </div>

                                <span className={roleBadgeClass(x.szerepkor)}>{roleLabel(x.szerepkor)}</span>
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                                <span className="badge">{x.halaszat.aktiv ? "Aktív" : "Inaktív"}</span>
                                <span className="badge">ID: {x.halaszat.azonosito}</span>
                            </div>

                            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <a className="btn btn-primary" href={`/halaszatok/${x.halaszat.azonosito}`}>
                                    Megnyitás →
                                </a>
                                <a className="btn" href={`/halaszatok/${x.halaszat.azonosito}/dolgozok`}>
                                    Dolgozók
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}