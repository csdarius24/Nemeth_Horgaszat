"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

            // register nálad be is léptet (cookie). Ha nem, akkor irány login.
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
            <h1>Regisztráció</h1>

            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Név</span>
                    <input
                        value={nev}
                        onChange={(e) => setNev(e.target.value)}
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        autoComplete="name"
                    />
                </label>

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
                        autoComplete="new-password"
                    />
                </label>

                {hiba && <div style={{ padding: 10, borderRadius: 8, background: "#ffe5e5" }}>{hiba}</div>}

                <button type="submit" disabled={loading} style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}>
                    {loading ? "Létrehozás..." : "Fiók létrehozása"}
                </button>

                <div style={{ opacity: 0.8 }}>
                    Van már fiókod? <a href="/login">Belépés</a>
                </div>
            </form>
        </main>
    );
}