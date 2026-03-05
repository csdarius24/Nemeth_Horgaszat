"use client";

import { useEffect, useMemo, useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

type HalfajItem = {
    azonosito: number;
    nev: string;
    aktiv: boolean;
};

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
};

function normalizeItems<T>(json: any): T[] {
    if (!json) return [];
    if (Array.isArray(json)) return json as T[];
    if (Array.isArray(json.items)) return json.items as T[];
    if (Array.isArray(json.toak)) return json.toak as T[];
    if (Array.isArray(json.data)) return json.data as T[];
    return [];
}

const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};

export default function AttelepitesModal(props: {
    open: boolean;
    onCloseAction: () => void;
    hid: string;
    toId: string; // forrás tó id
    onSavedAction: () => void | Promise<void>;
}) {
    const { open, onCloseAction, hid, toId, onSavedAction } = props;

    const [halfajok, setHalfajok] = useState<HalfajItem[]>([]);
    const [toak, setToak] = useState<ToItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [celToId, setCelToId] = useState<number>(0);
    const [halfajId, setHalfajId] = useState<number>(0);
    const [darab, setDarab] = useState<string>("");
    const [megjegyzes, setMegjegyzes] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const halfajUrl = useMemo(() => `/api/halaszatok/${hid}/halfajok?active=1`, [hid]);
    const toakUrl = useMemo(() => `/api/halaszatok/${hid}/toak?active=1`, [hid]);

    // Debug
    const [dbgHalfaj, setDbgHalfaj] = useState<string>("");
    const [dbgToak, setDbgToak] = useState<string>("");

    async function loadLists() {
        setLoading(true);
        setError(null);
        setDbgHalfaj("");
        setDbgToak("");

        try {
            const [halfajRes, toakRes] = await Promise.all([
                fetch(halfajUrl, { cache: "no-store" }),
                fetch(toakUrl, { cache: "no-store" }),
            ]);

            const halfajText = await halfajRes.text();
            const toakText = await toakRes.text();

            setDbgHalfaj(`GET ${halfajUrl} -> ${halfajRes.status}\n` + halfajText.slice(0, 500));
            setDbgToak(`GET ${toakUrl} -> ${toakRes.status}\n` + toakText.slice(0, 500));

            const halfajJson = (() => {
                try {
                    return JSON.parse(halfajText);
                } catch {
                    return null;
                }
            })();

            const toakJson = (() => {
                try {
                    return JSON.parse(toakText);
                } catch {
                    return null;
                }
            })();

            if (!halfajRes.ok) throw new Error(halfajJson?.error ?? "Hiba a halfajok lekérésekor.");
            if (!toakRes.ok) throw new Error(toakJson?.error ?? "Hiba a tavak lekérésekor.");

            const halfajItems = normalizeItems<HalfajItem>(halfajJson);
            const toItemsAll = normalizeItems<ToItem>(toakJson);

            const fromId = Number(toId);
            const filtered = Number.isFinite(fromId) ? toItemsAll.filter((t) => t.azonosito !== fromId) : toItemsAll;

            setHalfajok(halfajItems);
            setToak(filtered);

            setHalfajId(halfajItems.length ? halfajItems[0].azonosito : 0);
            setCelToId(filtered.length ? filtered[0].azonosito : 0);

            if (toItemsAll.length > 0 && filtered.length === 0) {
                setError("Van tólista, de a forrás tó kiszűrése után nem maradt cél. (Lehet csak 1 tó van.)");
            }
            if (toItemsAll.length === 0) {
                setError("A tólista üres. Nézd a Debug részt lent.");
            }
        } catch (e: any) {
            setError(e?.message ?? "Ismeretlen hiba");
            setHalfajok([]);
            setToak([]);
            setHalfajId(0);
            setCelToId(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;

        setSaving(false);
        setDarab("");
        setMegjegyzes("");
        setHalfajId(0);
        setCelToId(0);

        void loadLists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, halfajUrl, toakUrl, toId]);

    async function submit() {
        setError(null);

        const darabInt = Math.floor(Number(String(darab).replace(",", ".")));
        if (!celToId) return setError("Válassz cél tavat/telelőt.");
        if (!halfajId) return setError("Válassz halfajt.");
        if (!Number.isFinite(darabInt) || darabInt <= 0) return setError("A darab legyen pozitív egész.");

        setSaving(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/${toId}/attelepites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    celToId,
                    halfajId,
                    darab: darabInt,
                    megjegyzes: megjegyzes.trim() ? megjegyzes.trim() : null,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba az áttelepítés mentésekor.");

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
            title="Áttelepítés"
            subtitle="A forrás tóból csökken, a cél tóban nő a készlet."
            width={820}
            footer={
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn" onClick={loadLists} disabled={saving || loading}>
                        Újratöltés
                    </button>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn" onClick={onCloseAction} disabled={saving}>
                            Mégse
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={submit}
                            disabled={saving || loading || halfajok.length === 0 || toak.length === 0}
                        >
                            {saving ? "Mentés…" : "Mentés"}
                        </button>
                    </div>
                </div>
            }
        >
            <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Cél tó / telelő</span>
                    <select
                        value={celToId}
                        onChange={(e) => setCelToId(Number(e.target.value))}
                        disabled={loading || saving || toak.length === 0}
                        style={inputStyle}
                    >
                        {toak.length === 0 ? (
                            <option value={0}>Nincs választható cél tó</option>
                        ) : (
                            toak.map((t) => (
                                <option key={t.azonosito} value={t.azonosito}>
                                    {t.nev} ({t.tipus})
                                </option>
                            ))
                        )}
                    </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span className="muted">Halfaj</span>
                    <select
                        value={halfajId}
                        onChange={(e) => setHalfajId(Number(e.target.value))}
                        disabled={loading || saving || halfajok.length === 0}
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
                        placeholder="pl. 300"
                        inputMode="numeric"
                        disabled={saving}
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

                <details className="glass" style={{ padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.06)" }}>
                    <summary style={{ cursor: "pointer" }}>Debug (tólista / halfaj lista)</summary>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 10 }}>
{dbgHalfaj || "(halfaj debug üres)"}

                        {dbgToak || "(to debug üres)"}

                        {"Forrás toId param: " + toId}
                        {"\nHalfajok: " + halfajok.length}
                        {"\nCél toak: " + toak.length}
          </pre>
                </details>

                <div className="muted" style={{ fontSize: 12 }}>
                    Megjegyzés: áttelepítést csak ADMIN/OWNER tud rögzíteni.
                </div>
            </div>
        </GlassModal>
    );
}