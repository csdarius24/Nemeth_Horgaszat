"use client";

import { useEffect, useState } from "react";

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

export default function HalaszatListaClient() {
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const [items, setItems] = useState<HalaszatItem[]>([]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            setHiba(null);
            try {
                const res = await fetch("/api/halaszatok");
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

    if (loading) return <p style={{ marginTop: 16 }}>Betöltés...</p>;
    if (hiba) return <p style={{ marginTop: 16, color: "crimson" }}>{hiba}</p>;

    if (items.length === 0) {
        return <p style={{ marginTop: 16, opacity: 0.8 }}>Még nincs halászatod. Hozz létre egyet!</p>;
    }

    return (
        <ul style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {items.map((x) => (
                <li key={x.halaszat.azonosito} style={{border: "1px solid #ddd", borderRadius: 10, padding: 12}}>
                    <div style={{display: "flex", justifyContent: "space-between", gap: 12}}>
                        <strong>{x.halaszat.nev}</strong>
                        <span style={{opacity: 0.75}}>{x.szerepkor}</span>
                    </div>
                    <div style={{opacity: 0.7, marginTop: 6}}>
                        slug: {x.halaszat.slug} • aktív: {x.halaszat.aktiv ? "igen" : "nem"}
                    </div>
                    <div style={{marginTop: 10}}>
                        <a
                            href={`/halaszatok/${x.halaszat.azonosito}`}
                            style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                border: "1px solid #333",
                                borderRadius: 6,
                                textDecoration: "none"
                            }}
                        >
                            Megnyitás →
                        </a>
                    </div>
                </li>
            ))}

        </ul>
    );
}