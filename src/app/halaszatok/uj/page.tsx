"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};

export default function UjHalaszatPage() {
    const router = useRouter();
    const [nev, setNev] = useState("");
    const [loading, setLoading] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);
    const [siker, setSiker] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setSiker(null);

        const trimmed = nev.trim();
        if (trimmed.length < 3) {
            setHiba("Adj meg legalább 3 karaktert.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/halaszatok", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: trimmed }),
            });

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült létrehozni a halászatot.");
                return;
            }

            setSiker(`Siker! Halászat létrehozva: ${data?.halaszat?.nev ?? trimmed}`);
            setNev("");

            router.push("/halaszatok");
            router.refresh();
        } catch {
            setHiba("Hálózati hiba. Próbáld újra.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Header */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">Új halászat</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Hozz létre egy új tenantot (halászatot), és automatikusan OWNER leszel.
                    </div>
                </div>
                <span className="badge">Létrehozás</span>
            </div>

            {/* Form card */}
            <div className="glass card" style={{ maxWidth: 720 }}>
                <h2 className="h2">Alapadatok</h2>
                <div className="muted" style={{ marginTop: 6 }}>
                    Adj meg egy nevet. A slugot a rendszer generálja (ha nálad így van).
                </div>

                <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span className="muted">Halászat neve</span>
                        <input
                            value={nev}
                            onChange={(e) => setNev(e.target.value)}
                            placeholder="pl. Németh Halászat Kft."
                            style={inputStyle}
                            disabled={loading}
                        />
                    </label>

                    {hiba && (
                        <div
                            className="glass"
                            style={{
                                padding: 12,
                                borderRadius: 16,
                                border: "1px solid rgba(255,120,120,0.35)",
                                background: "rgba(120,20,20,0.22)",
                            }}
                        >
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>Hiba</div>
                            <div className="muted">{hiba}</div>
                        </div>
                    )}

                    {siker && (
                        <div
                            className="glass"
                            style={{
                                padding: 12,
                                borderRadius: 16,
                                border: "1px solid rgba(120,255,180,0.22)",
                                background: "rgba(10,80,40,0.20)",
                            }}
                        >
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>Siker</div>
                            <div className="muted">{siker}</div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => router.push("/halaszatok")}
                            disabled={loading}
                        >
                            Mégse
                        </button>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Mentés…" : "Halászat létrehozása"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}