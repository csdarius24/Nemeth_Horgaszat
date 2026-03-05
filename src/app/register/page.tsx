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

export default function RegisterPage() {
    const router = useRouter();
    const [nev, setNev] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [hiba, setHiba] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: nev.trim(), email: email.trim(), password }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.hiba ?? "Sikertelen regisztráció.");
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
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
            <div style={{ width: "min(520px, 100%)", display: "grid", gap: 16 }}>
                <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <h1 className="h1">Regisztráció</h1>
                        <div className="muted" style={{ marginTop: 6 }}>
                            Hozz létre új fiókot.
                        </div>
                    </div>
                    <span className="badge">NH</span>
                </div>

                <div className="glass card">
                    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span className="muted">Név</span>
                            <input
                                value={nev}
                                onChange={(e) => setNev(e.target.value)}
                                autoComplete="name"
                                style={inputStyle}
                                placeholder="pl. Nagy Sándor"
                            />
                        </label>

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
                                autoComplete="new-password"
                                style={inputStyle}
                                placeholder="legalább 8 karakter"
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
                            {loading ? "Létrehozás…" : "Fiók létrehozása"}
                        </button>
                    </form>

                    <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <span className="muted">Van már fiókod?</span>
                        <Link className="btn" href="/login">
                            Belépés →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}