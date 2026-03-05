"use client";

import { useEffect, useMemo, useState } from "react";

type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

type Item = {
    azonosito: number; // HalaszatTagsag id
    szerepkor: ViewerRole;
    aktiv: boolean;
    letrehozva: string;
    felhasznalo: {
        azonosito: number;
        email: string;
        nev: string | null;
        aktiv: boolean;
    };
};

function canManageTarget(viewer: ViewerRole, target: ViewerRole) {
    // OWNER-t senki nem módosít/deaktivál
    if (target === "OWNER") return false;
    if (viewer === "OWNER") return true; // OWNER: ADMIN + STAFF
    if (viewer === "ADMIN") return target === "STAFF"; // ADMIN: csak STAFF
    return false;
}

export default function DolgozokClient({ halaszatId }: { halaszatId: number }) {
    const apiBase = useMemo(() => `/api/halaszatok/${halaszatId}/dolgozok`, [halaszatId]);

    const [items, setItems] = useState<Item[]>([]);
    const [viewerRole, setViewerRole] = useState<ViewerRole>("STAFF"); // fallback
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    // filters
    const [q, setQ] = useState("");

    // modal / create
    const [open, setOpen] = useState(false);
    const [nev, setNev] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
    const [creating, setCreating] = useState(false);

    // temp pass (csak új usernél)
    const [tempPass, setTempPass] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(apiBase, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));

            // nálad az error kulcs: "error" (dolgozók route), ezért így:
            if (!res.ok) throw new Error(data?.error || "Hiba a dolgozók lekérésekor.");

            setItems(data.items || []);
            if (data.viewerRole === "OWNER" || data.viewerRole === "ADMIN" || data.viewerRole === "STAFF") {
                setViewerRole(data.viewerRole);
                // ADMIN esetén a modal role-t fixáljuk STAFF-ra (UX)
                if (data.viewerRole === "ADMIN") setRole("STAFF");
            }
        } catch (e: any) {
            setHiba(e?.message || "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!Number.isFinite(halaszatId)) return;
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [halaszatId]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((it) => {
            const n = (it.felhasznalo.nev || "").toLowerCase();
            const e = it.felhasznalo.email.toLowerCase();
            const r = it.szerepkor.toLowerCase();
            return n.includes(s) || e.includes(s) || r.includes(s);
        });
    }, [items, q]);

    const stats = useMemo(() => {
        const total = items.length;
        const active = items.filter((x) => x.aktiv).length;
        const admins = items.filter((x) => x.aktiv && x.szerepkor === "ADMIN").length;
        const staff = items.filter((x) => x.aktiv && x.szerepkor === "STAFF").length;
        return { total, active, admins, staff };
    }, [items]);

    async function createWorker() {
        setCreating(true);
        setHiba(null);
        setTempPass(null);

        try {
            const res = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    nev,
                    role: viewerRole === "ADMIN" ? "STAFF" : role, // UX: admin csak staff
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Nem sikerült létrehozni.");

            if (data?.tempPassword) setTempPass(String(data.tempPassword));

            setOpen(false);
            setNev("");
            setEmail("");
            setRole(viewerRole === "ADMIN" ? "STAFF" : "STAFF");

            await load();
        } catch (e: any) {
            setHiba(e?.message || "Ismeretlen hiba.");
        } finally {
            setCreating(false);
        }
    }

    async function updateRole(tagId: number, newRole: "ADMIN" | "STAFF") {
        setHiba(null);
        try {
            const res = await fetch(`${apiBase}/${tagId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.hiba || data?.error || "Nem sikerült módosítani.");
            await load();
        } catch (e: any) {
            setHiba(e?.message || "Ismeretlen hiba.");
        }
    }

    async function deactivate(tagId: number) {
        setHiba(null);
        try {
            const res = await fetch(`${apiBase}/${tagId}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.hiba || data?.error || "Nem sikerült deaktiválni.");
            await load();
        } catch (e: any) {
            setHiba(e?.message || "Ismeretlen hiba.");
        }
    }

    if (loading) return <div className="glass card">Betöltés…</div>;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Header */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Dolgozók</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szerepköröd: <span className="badge">{viewerRole}</span>{" "}
                        {viewerRole === "ADMIN" ? "• ADMIN csak STAFF-ot kezelhet." : "• OWNER: ADMIN + STAFF kezelése."}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" onClick={() => setOpen(true)}>
                        + Új dolgozó
                    </button>
                </div>
            </div>

            {/* Error / temp pass */}
            {hiba && (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.35)", background: "rgba(120,20,20,0.22)" }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Hiba</div>
                    <div className="muted">{hiba}</div>
                </div>
            )}

            {tempPass && (
                <div className="glass card">
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Ideiglenes jelszó (most másold ki)</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <code
                            style={{
                                padding: "8px 10px",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.16)",
                                background: "rgba(0,0,0,0.18)",
                                color: "rgba(255,255,255,0.92)",
                            }}
                        >
                            {tempPass}
                        </code>
                        <button className="btn" onClick={() => navigator.clipboard.writeText(tempPass)} type="button">
                            Másolás
                        </button>
                        <span className="muted" style={{ fontSize: 12 }}>
              Csak új felhasználónál jelenik meg.
            </span>
                    </div>
                </div>
            )}

            {/* Stats + search */}
            <div className="grid-2">
                <div className="glass card">
                    <h2 className="h2">Áttekintés</h2>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
                        {[
                            { label: "Összes", value: stats.total },
                            { label: "Aktív", value: stats.active },
                            { label: "Admin", value: stats.admins },
                            { label: "Staff", value: stats.staff },
                        ].map((x) => (
                            <div key={x.label} className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                                <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                    {x.label}
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{x.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass card">
                    <h2 className="h2">Keresés</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Szűrés név / e-mail / szerepkör alapján.
                    </div>
                    <div style={{ marginTop: 12 }} className="search">
                        <span style={{ opacity: 0.7 }}>⌕</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pl. 'sanyi', '@gmail', 'staff'…" />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => setQ("")} disabled={!q.trim()}>
                            Szűrő törlése
                        </button>
                        <span className="badge">Találat: {filtered.length}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass card">
                {filtered.length === 0 ? (
                    <div className="muted">{items.length === 0 ? "Nincs dolgozó." : "Nincs találat."}</div>
                ) : (
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Név</th>
                            <th>Email</th>
                            <th>Szerepkör</th>
                            <th>Állapot</th>
                            <th style={{ textAlign: "right" }}>Művelet</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((it) => {
                            const canManage = canManageTarget(viewerRole, it.szerepkor) && it.aktiv;
                            const canRoleChange = viewerRole === "OWNER" && it.szerepkor !== "OWNER" && it.aktiv;

                            return (
                                <tr key={it.azonosito}>
                                    <td style={{ fontWeight: 800 }}>{it.felhasznalo.nev || "—"}</td>
                                    <td>{it.felhasznalo.email}</td>
                                    <td>
                                        {it.szerepkor === "OWNER" ? (
                                            <span className="badge">OWNER</span>
                                        ) : canRoleChange ? (
                                            <select
                                                value={it.szerepkor}
                                                onChange={(e) => updateRole(it.azonosito, e.target.value as "ADMIN" | "STAFF")}
                                                style={{
                                                    padding: "8px 10px",
                                                    borderRadius: 14,
                                                    border: "1px solid rgba(255,255,255,0.14)",
                                                    background: "rgba(0,0,0,0.16)",
                                                    color: "rgba(255,255,255,0.92)",
                                                    outline: "none",
                                                }}
                                            >
                                                <option value="ADMIN">ADMIN</option>
                                                <option value="STAFF">STAFF</option>
                                            </select>
                                        ) : (
                                            <span className="badge">{it.szerepkor}</span>
                                        )}
                                    </td>
                                    <td className="muted">{it.aktiv ? "Aktív" : "Inaktív"}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <button
                                            className="btn"
                                            onClick={() => deactivate(it.azonosito)}
                                            disabled={!canManage}
                                            title={
                                                it.szerepkor === "OWNER"
                                                    ? "OWNER nem deaktiválható"
                                                    : viewerRole === "ADMIN" && it.szerepkor === "ADMIN"
                                                        ? "ADMIN nem deaktiválhat ADMIN-t"
                                                        : !it.aktiv
                                                            ? "Már inaktív"
                                                            : ""
                                            }
                                        >
                                            Deaktiválás
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {open && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        zIndex: 50,
                    }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="glass card"
                        style={{ width: 560, maxWidth: "100%" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <h2 className="h2">Új dolgozó</h2>
                            <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Bezárás">
                                ✕
                            </button>
                        </div>

                        <div className="muted" style={{ marginTop: 6 }}>
                            {viewerRole === "ADMIN" ? "ADMIN csak STAFF szerepkörrel vehet fel dolgozót." : "Adj meg nevet, e-mailt és szerepkört."}
                        </div>

                        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                <span className="muted">Név (opcionális)</span>
                                <input
                                    value={nev}
                                    onChange={(e) => setNev(e.target.value)}
                                    style={{
                                        padding: 12,
                                        borderRadius: 16,
                                        border: "1px solid rgba(255,255,255,0.14)",
                                        background: "rgba(0,0,0,0.16)",
                                        color: "rgba(255,255,255,0.92)",
                                        outline: "none",
                                    }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span className="muted">Email</span>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        padding: 12,
                                        borderRadius: 16,
                                        border: "1px solid rgba(255,255,255,0.14)",
                                        background: "rgba(0,0,0,0.16)",
                                        color: "rgba(255,255,255,0.92)",
                                        outline: "none",
                                    }}
                                />
                            </label>

                            {viewerRole === "OWNER" ? (
                                <label style={{ display: "grid", gap: 6 }}>
                                    <span className="muted">Szerepkör</span>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
                                        style={{
                                            padding: 12,
                                            borderRadius: 16,
                                            border: "1px solid rgba(255,255,255,0.14)",
                                            background: "rgba(0,0,0,0.16)",
                                            color: "rgba(255,255,255,0.92)",
                                            outline: "none",
                                        }}
                                    >
                                        <option value="STAFF">STAFF</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </label>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                    <span className="muted">Szerepkör</span>
                                    <span className="badge">STAFF</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                            <button className="btn" onClick={() => setOpen(false)} disabled={creating}>
                                Mégse
                            </button>
                            <button className="btn btn-primary" onClick={createWorker} disabled={creating}>
                                {creating ? "Létrehozás…" : "Létrehozás"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}