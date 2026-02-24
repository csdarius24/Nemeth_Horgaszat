"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
            <h1>Bejelentkezés</h1>

            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Email</span>
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        autoComplete="email"
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Jelszó</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        autoComplete="current-password"
                    />
                </label>

                {hiba && (
                    <div style={{ padding: 10, borderRadius: 8, background: "#ffe5e5" }}>
                        {hiba}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: 12,
                        borderRadius: 8,
                        border: "none",
                        background: "#4f46e5",
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    {loading ? "Beléptetés..." : "Belépés"}
                </button>
            </form>

            {/* ---- REGISZTRÁCIÓ GOMB ---- */}
            <div style={{ marginTop: 20, textAlign: "center" }}>
                <p style={{ marginBottom: 10, opacity: 0.8 }}>
                    Nincs még fiókod?
                </p>

                <Link
                    href="/register"
                    style={{
                        display: "inline-block",
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #4f46e5",
                        color: "#4f46e5",
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    Regisztráció
                </Link>
            </div>
        </main>
    );
}