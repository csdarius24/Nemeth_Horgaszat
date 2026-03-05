"use client";

import { useEffect, useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

type Halfaj = { azonosito: number; nev: string };

export default function TelepitesModal({
                                           open,
                                           onCloseAction,
                                           hid,
                                           toId,
                                           onSavedAction,
                                       }: {
    open: boolean;
    onCloseAction: () => void;
    hid: string;
    toId: string;
    onSavedAction: () => void;
}) {
    const [halfajok, setHalfajok] = useState<Halfaj[]>([]);
    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState<number>(100);
    const [minKg, setMinKg] = useState<number>(0);
    const [maxKg, setMaxKg] = useState<number>(0);
    const [forras, setForras] = useState<string>("");
    const [megjegyzes, setMegjegyzes] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setErr(null);
        fetch(`/api/halaszatok/${hid}/halfajok`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                const items: Halfaj[] = j?.items ?? j ?? [];
                setHalfajok(items);
                if (items.length) setHalfajId((prev) => (prev ? prev : items[0].azonosito));
            })
            .catch(() => {});

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function submit() {
        setSaving(true);
        setErr(null);
        try {
            const payload: any = {
                halfajId,
                darab,
                forras: forras || null,
                megjegyzes: megjegyzes || null,
            };

            if (minKg > 0 && maxKg > 0) {
                payload.minTomegKg = minKg;
                payload.maxTomegKg = maxKg;
            }

            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/telepites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba a telepítés mentésekor.");

            onCloseAction();
            onSavedAction();
        } catch (e: any) {
            setErr(e?.message ?? "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    return (
        <GlassModal
            open={open}
            onCloseAction={onCloseAction}
            title="Hal telepítése"
            subtitle="Válassz halfajt, add meg a darabszámot és (opcionálisan) tömegtartományt."
            width={560}
            footer={
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="btn" onClick={onCloseAction} disabled={saving}>
                        Mégse
                    </button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving || !halfajId}>
                        {saving ? "Mentés…" : "Mentés"}
                    </button>
                </div>
            }
        >
            <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Halfaj</span>
                    <select value={halfajId} onChange={(e) => setHalfajId(Number(e.target.value))} style={inputStyle}>
                        {halfajok.length ? (
                            halfajok.map((h) => (
                                <option key={h.azonosito} value={h.azonosito}>
                                    {h.nev}
                                </option>
                            ))
                        ) : (
                            <option value={halfajId || 0}>— nincs lista —</option>
                        )}
                    </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Darab (db)</span>
                    <input type="number" value={darab} onChange={(e) => setDarab(Number(e.target.value))} style={inputStyle} />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span className="muted">Min tömeg (kg) (opcionális)</span>
                        <input type="number" step="0.01" value={minKg} onChange={(e) => setMinKg(Number(e.target.value))} style={inputStyle} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span className="muted">Max tömeg (kg) (opcionális)</span>
                        <input type="number" step="0.01" value={maxKg} onChange={(e) => setMaxKg(Number(e.target.value))} style={inputStyle} />
                    </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Forrás (opcionális)</span>
                    <input value={forras} onChange={(e) => setForras(e.target.value)} style={inputStyle} />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Megjegyzés (opcionális)</span>
                    <input value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} style={inputStyle} />
                </label>

                {err ? (
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
                        <div className="muted">{err}</div>
                    </div>
                ) : null}

                {halfajok.length === 0 ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                        Nincs halfaj lista ehhez a halászathoz (vagy nincs jogosultság). Előbb adj hozzá halfajt.
                    </div>
                ) : null}
            </div>
        </GlassModal>
    );
}

const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};