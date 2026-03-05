"use client";

import { useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

export default function EtetesModal({
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
    const [mennyisegKg, setMennyisegKg] = useState<number>(10);
    const [tipus, setTipus] = useState<string>("Pellet");
    const [megjegyzes, setMegjegyzes] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        setSaving(true);
        setErr(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/etetes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mennyisegKg,
                    takarmanyTipus: tipus,
                    megjegyzes: megjegyzes || null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba az etetés mentésekor.");

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
            title="Etetés rögzítése"
            subtitle="Rögzítsd a takarmány mennyiséget és típust."
            width={520}
            footer={
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="btn" onClick={onCloseAction} disabled={saving}>
                        Mégse
                    </button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>
                        {saving ? "Mentés…" : "Mentés"}
                    </button>
                </div>
            }
        >
            <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Mennyiség (kg)</span>
                    <input
                        type="number"
                        step="0.1"
                        value={mennyisegKg}
                        onChange={(e) => setMennyisegKg(Number(e.target.value))}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Típus</span>
                    <input value={tipus} onChange={(e) => setTipus(e.target.value)} style={inputStyle} />
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