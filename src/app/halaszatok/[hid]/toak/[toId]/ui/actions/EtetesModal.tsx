"use client";

import { useEffect, useState } from "react";
import GlassModal from "@/components/ui/GlassModal";

type TakarmanyOpcio = {
    azonosito: number;
    nev: string;
    egyseg: string;
    keszlet: number;
};

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

    // Opcionális takarmány-kötés: ha választunk, az etetés levon a készletből.
    const [takarmanyok, setTakarmanyok] = useState<TakarmanyOpcio[]>([]);
    const [takarmanyId, setTakarmanyId] = useState<number | null>(null);

    useEffect(() => {
        if (!open) return;
        let aktiv = true;
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/takarmanyok?active=1`);
                const json = await res.json().catch(() => ({}));
                if (!aktiv) return;
                if (res.ok && Array.isArray(json?.items)) {
                    setTakarmanyok(
                        json.items.map((t: any) => ({
                            azonosito: t.azonosito,
                            nev: t.nev,
                            egyseg: t.egyseg,
                            keszlet: Number(t.keszlet),
                        }))
                    );
                }
            } catch {
                // a takarmánylista opcionális — hiba esetén marad a sima etetés
            }
        })();
        return () => {
            aktiv = false;
        };
    }, [open, hid]);

    const valasztott = takarmanyok.find((t) => t.azonosito === takarmanyId) ?? null;
    const nincsEleg = valasztott != null && mennyisegKg > valasztott.keszlet;

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
                    ...(takarmanyId != null ? { takarmanyId } : {}),
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
                    <button className="btn btn-primary" onClick={submit} disabled={saving || nincsEleg}>
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
                    <span className="muted">Takarmány a készletből (opcionális)</span>
                    <select
                        value={takarmanyId ?? ""}
                        onChange={(e) => setTakarmanyId(e.target.value ? Number(e.target.value) : null)}
                        style={inputStyle}
                    >
                        <option value="">Nincs — csak etetés rögzítése (nem von le készletet)</option>
                        {takarmanyok.map((t) => (
                            <option key={t.azonosito} value={t.azonosito}>
                                {t.nev} — készlet: {t.keszlet} {t.egyseg}
                            </option>
                        ))}
                    </select>
                </label>

                {valasztott ? (
                    <div
                        className="glass"
                        style={{
                            padding: 12,
                            borderRadius: 16,
                            border: nincsEleg
                                ? "1px solid rgba(255,120,120,0.35)"
                                : "1px solid rgba(208,138,91,0.35)",
                            background: nincsEleg ? "rgba(120,20,20,0.18)" : "rgba(208,138,91,0.12)",
                        }}
                    >
                        <div className="muted" style={{ fontSize: 13 }}>
                            Jelenlegi készlet: <strong>{valasztott.keszlet} {valasztott.egyseg}</strong>
                        </div>
                        {nincsEleg ? (
                            <div style={{ color: "#ffb3b3", fontSize: 13, marginTop: 4 }}>
                                Nincs elég készlet ehhez a mennyiséghez.
                            </div>
                        ) : (
                            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                                A mentés <strong>{mennyisegKg} {valasztott.egyseg}</strong>-ot levon a készletből
                                (marad: {Math.round((valasztott.keszlet - mennyisegKg) * 100) / 100} {valasztott.egyseg}).
                            </div>
                        )}
                    </div>
                ) : null}

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
