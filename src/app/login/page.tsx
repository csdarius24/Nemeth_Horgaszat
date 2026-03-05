"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [hiba, setHiba] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setHiba(data?.hiba ?? "Sikertelen bejelentkezés.");
                return;
            }

            router.push("/halaszatok");
            router.refresh();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: 18,
            }}
        >
            <div style={{ width: "min(520px, 100%)", display: "grid", gap: 16 }}>
                {/* Brand / header */}
                <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <h1 className="h1">Bejelentkezés</h1>
                        <div className="muted" style={{ marginTop: 6 }}>
                            Lépj be a Németh Horgászat rendszerbe.
                        </div>
                    </div>
                    <span className="badge">NH</span>
                </div>

                {/* Form */}
                <div className="glass card">
                    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span className="muted">Email</span>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                style={inputStyle}
                                placeholder="pl. sanyi@email.com"
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span className="muted">Jelszó</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                style={inputStyle}
                                placeholder="••••••••"
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

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Beléptetés…" : "Belépés"}
                        </button>
                    </form>

                    <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <span className="muted">Nincs még fiókod?</span>
                        <Link className="btn" href="/register">
                            Regisztráció →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}