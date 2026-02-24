"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

            // 401 kezelése AZONNAL
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

            // vissza a listára (vagy mehet dashboard-ra)
            router.push("/halaszatok");
            router.refresh();
        } catch {
            setHiba("Hálózati hiba. Próbáld újra.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
            <h1>Új halászat létrehozása</h1>

            <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Halászat neve</span>
                    <input
                        value={nev}
                        onChange={(e) => setNev(e.target.value)}
                        placeholder="pl. Németh Halászat Kft."
                        style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                        disabled={loading}
                    />
                </label>

                {hiba && (
                    <div style={{ padding: 10, borderRadius: 8, background: "#ffe5e5" }}>
                        {hiba}
                    </div>
                )}

                {siker && (
                    <div style={{ padding: 10, borderRadius: 8, background: "#e6ffea" }}>
                        {siker}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
                >
                    {loading ? "Mentés..." : "Halászat létrehozása"}
                </button>
            </form>
        </main>
    );
}