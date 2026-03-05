"use client";

import { useEffect, useMemo, useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

type HalfajItem = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
};

const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};

export default function KivetelModal(props: {
    open: boolean;
    onCloseAction: () => void;
    hid: string;
    toId: string;
    onSavedAction: () => void | Promise<void>;
}) {
    const { open, onCloseAction, hid, toId, onSavedAction } = props;

    const [halfajok, setHalfajok] = useState<HalfajItem[]>([]);
    const [loadingHalfajok, setLoadingHalfajok] = useState(false);

    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState<string>("");
    const [ok, setOk] = useState<string>("");
    const [megjegyzes, setMegjegyzes] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const halfajUrl = useMemo(() => `/api/halaszatok/${hid}/halfajok?active=1`, [hid]);

    useEffect(() => {
        if (!open) return;

        // reset
        setError(null);
        setSaving(false);
        setDarab("");
        setOk("");
        setMegjegyzes("");

        (async () => {
            setLoadingHalfajok(true);
            try {
                const res = await fetch(halfajUrl, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error ?? "Hiba a halfajok lekérésekor.");

                const items: HalfajItem[] = Array.isArray(json?.items) ? json.items : [];
                setHalfajok(items);
                setHalfajId(items.length ? items[0].azonosito : 0);
            } catch (e: any) {
                setError(e?.message ?? "Ismeretlen hiba");
                setHalfajok([]);
                setHalfajId(0);
            } finally {
                setLoadingHalfajok(false);
            }
        })();
    }, [open, halfajUrl]);

    async function submit() {
        setError(null);

        const darabInt = Math.floor(Number(String(darab).replace(",", ".")));
        if (!halfajId) return setError("Válassz halfajt.");
        if (!Number.isFinite(darabInt) || darabInt <= 0) return setError("A darab legyen pozitív egész.");

        const payload = {
            halfajId,
            darab: darabInt,
            ok: ok.trim() ? ok.trim() : null,
            megjegyzes: megjegyzes.trim() ? megjegyzes.trim() : null,
        };

        setSaving(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/kivetel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba a kivét mentésekor.");

            await onSavedAction();
        } catch (e: any) {
            setError(e?.message ?? "Ismeretlen hiba");
        } finally {
            setSaving(false);
        }
    }

    return (
        <GlassModal
            open={open}
            onCloseAction={onCloseAction}
            title="Hal kivétele"
            subtitle="A forrás tó készletéből csökkentjük a darabszámot."
            width={720}
            footer={
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn" onClick={onCloseAction} disabled={saving}>
                        Mégse
                    </button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving || loadingHalfajok || halfajok.length === 0}>
                        {saving ? "Mentés…" : "Mentés"}
                    </button>
                </div>
            }
        >
            <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Halfaj</span>
                    <select
                        value={halfajId}
                        onChange={(e) => setHalfajId(Number(e.target.value))}
                        disabled={loadingHalfajok || saving || halfajok.length === 0}
                        style={inputStyle}
                    >
                        {halfajok.length === 0 ? (
                            <option value={0}>Nincs halfaj</option>
                        ) : (
                            halfajok.map((h) => (
                                <option key={h.azonosito} value={h.azonosito}>
                                    {h.nev}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Darab (db)</span>
                    <input
                        value={darab}
                        onChange={(e) => setDarab(e.target.value)}
                        placeholder="pl. 120"
                        inputMode="numeric"
                        disabled={saving}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Ok (opcionális)</span>
                    <input
                        value={ok}
                        onChange={(e) => setOk(e.target.value)}
                        placeholder="pl. eladás / pusztulás / verseny"
                        disabled={saving}
                        maxLength={120}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Megjegyzés (opcionális)</span>
                    <textarea
                        value={megjegyzes}
                        onChange={(e) => setMegjegyzes(e.target.value)}
                        placeholder="opcionális részletek"
                        disabled={saving}
                        rows={3}
                        style={inputStyle}
                    />
                </label>

                {error ? (
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
                        <div className="muted">{error}</div>
                    </div>
                ) : null}

                <div className="muted" style={{ fontSize: 12 }}>
                    Megjegyzés: kivétet csak ADMIN/OWNER tud rögzíteni. Ha nincs készlet, az API hibát ad.
                </div>
            </div>
        </GlassModal>
    );
}