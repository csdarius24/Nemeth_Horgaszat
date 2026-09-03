"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FELADAT_SZINEK, ALAP_SZIN,
    feladatStatuszCimke, feladatPrioritasCimke, hatralevoNap,
} from "@/lib/feladatok/format";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Feladat = {
    id: number;
    cim: string;
    leiras: string | null;
    statusz: string;
    prioritas: string;
    szin: string | null;
    hatarido: string | null;
    elkeszultAt: string | null;
    lejart: boolean;
    toId: number | null;
    toNev: string | null;
    felelosFelhasznaloId: number | null;
    felelosNev: string | null;
    letrehozoNev: string | null;
};

type Valasz = {
    feladatok: Feladat[];
    osszesen: number;
    nyitottDb: number;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

type Tag = { azonosito: number; nev: string | null; email: string };
type ToOpcio = { azonosito: number; nev: string };

const STATUSZ_SZIN: Record<string, string> = {
    UJ: "#64748b", FOLYAMATBAN: "#2563eb", KESZ: "#16a34a", ELHALASZTVA: "#f59e0b", TOROLVE: "#dc2626",
};
const PRIORITAS_SZIN: Record<string, string> = {
    ALACSONY: "#64748b", NORMAL: "#0891b2", MAGAS: "#f59e0b", SURGOS: "#dc2626",
};

const SZUROK = [
    { ertek: "", cimke: "Összes" },
    { ertek: "UJ", cimke: "Új" },
    { ertek: "FOLYAMATBAN", cimke: "Folyamatban" },
    { ertek: "KESZ", cimke: "Kész" },
    { ertek: "ELHALASZTVA", cimke: "Halasztva" },
] as const;

const mezo: React.CSSProperties = {
    padding: 9, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)", color: "rgba(255,255,255,0.92)", outline: "none", width: "100%",
};

function datumRovid(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString("hu-HU") : "—";
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function FeladatokClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [statusz, setStatusz] = useState("");
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [felelos, setFelelos] = useState("");
    const [toId, setToId] = useState("");
    const [urlapNyitva, setUrlapNyitva] = useState(false);

    const [tagok, setTagok] = useState<Tag[]>([]);
    const [toak, setToak] = useState<ToOpcio[]>([]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const p = new URLSearchParams();
            if (statusz) p.set("statusz", statusz);
            if (debouncedQ) p.set("q", debouncedQ);
            if (felelos) p.set("felelosFelhasznaloId", felelos);
            if (toId) p.set("toId", toId);
            const res = await fetch(`/api/halaszatok/${hid}/feladatok?${p}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid, statusz, debouncedQ, felelos, toId]);

    useEffect(() => { void betolt(); }, [betolt]);

    const canManage = data?.viewerRole === "OWNER" || data?.viewerRole === "ADMIN";

    // Tagok + tavak a szűrőkhöz / űrlaphoz (tagok csak ADMIN+-nak érhető el a dolgozok API-n)
    useEffect(() => {
        if (!data) return;
        (async () => {
            try {
                const [tRes, toRes] = await Promise.all([
                    canManage ? fetch(`/api/halaszatok/${hid}/dolgozok`, { cache: "no-store" }) : Promise.resolve(null),
                    fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" }),
                ]);
                if (tRes) {
                    const tj = await tRes.json().catch(() => ({}));
                    if (tRes.ok && Array.isArray(tj?.items)) {
                        setTagok(tj.items.map((i: any) => ({ azonosito: i.felhasznalo.azonosito, nev: i.felhasznalo.nev, email: i.felhasznalo.email })));
                    }
                }
                const toj = await toRes.json().catch(() => ({}));
                if (toRes.ok && Array.isArray(toj?.toak)) setToak(toj.toak.map((t: any) => ({ azonosito: t.azonosito, nev: t.nev })));
            } catch { /* opcionális */ }
        })();
    }, [hid, canManage, data]);

    const feladatok = data?.feladatok ?? [];

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card" style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h1 className="h1">Feladatok</h1>
                        <div className="muted" style={{ marginTop: 6 }}>
                            {data ? <>{data.osszesen} feladat &bull; {data.nyitottDb} nyitott</> : "Feladatok betöltése…"}
                        </div>
                    </div>
                    {canManage && (
                        <button className="btn btn-primary" onClick={() => setUrlapNyitva((v) => !v)}>
                            {urlapNyitva ? "Mégse" : "+ Új feladat"}
                        </button>
                    )}
                </div>

                <div className="search" style={{ maxWidth: 420 }}>
                    <span style={{ opacity: 0.7 }}>⌕</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés cím vagy leírás szerint…" />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {SZUROK.map((s) => {
                        const aktiv = statusz === s.ertek;
                        return (
                            <button key={s.ertek || "mind"} className="btn" onClick={() => setStatusz(s.ertek)}
                                style={{ fontSize: 13, background: aktiv ? "rgba(208,138,91,0.25)" : undefined, borderColor: aktiv ? "rgba(208,138,91,0.7)" : undefined, color: aktiv ? "#d08a5b" : undefined, fontWeight: aktiv ? 700 : undefined }}>
                                {s.cimke}
                            </button>
                        );
                    })}
                    {canManage && tagok.length > 0 && (
                        <select value={felelos} onChange={(e) => setFelelos(e.target.value)} style={{ ...mezo, width: "auto" }}>
                            <option value="">Minden felelős</option>
                            {tagok.map((t) => <option key={t.azonosito} value={t.azonosito}>{t.nev || t.email}</option>)}
                        </select>
                    )}
                    {toak.length > 0 && (
                        <select value={toId} onChange={(e) => setToId(e.target.value)} style={{ ...mezo, width: "auto" }}>
                            <option value="">Minden vízegység</option>
                            {toak.map((t) => <option key={t.azonosito} value={t.azonosito}>{t.nev}</option>)}
                        </select>
                    )}
                </div>

                {urlapNyitva && canManage && (
                    <UjFeladatUrlap hid={hid} tagok={tagok} toak={toak} onKesz={() => { setUrlapNyitva(false); void betolt(); }} />
                )}
            </div>

            {loading ? (
                <div className="glass card muted">Betöltés…</div>
            ) : hiba ? (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.3)", background: "rgba(100,20,20,0.2)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba</div><div className="muted">{hiba}</div>
                </div>
            ) : feladatok.length === 0 ? (
                <div className="glass card" style={{ textAlign: "center", padding: "36px 16px" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Nincs feladat</div>
                    <div className="muted">{canManage ? "Hozz létre egyet a fenti gombbal." : "Jelenleg nincs a szűrőnek megfelelő feladat."}</div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                    {feladatok.map((f) => (
                        <FeladatKartya key={f.id} f={f} hid={hid} canManage={canManage} viewerRole={data!.viewerRole} onValtozas={betolt} />
                    ))}
                </div>
            )}

            <div className="glass card">
                <div className="muted" style={{ fontSize: 12 }}>
                    <strong>Megjegyzés:</strong> a feladatokat ADMIN/OWNER hozza létre és osztja ki; a dolgozó a
                    <strong> neki kiosztott</strong> feladat státuszát állíthatja (Indítás / Kész). A szín csak
                    ellenőrzött preset/hex érték lehet. <strong>Nincs</strong> push/e-mail értesítés, ismétlődő feladat
                    vagy külső naptár-szinkron — ezek tervezettek. A kiosztás a Halászati naplóba is bekerül (FELADAT).
                </div>
            </div>
        </div>
    );
}

// ─── Feladat kártya ──────────────────────────────────────────────────────────

function FeladatKartya({ f, hid, canManage, viewerRole, onValtozas }: {
    f: Feladat; hid: string; canManage: boolean; viewerRole: string; onValtozas: () => void;
}) {
    const [fut, setFut] = useState(false);
    const csik = f.szin || ALAP_SZIN;
    const sStatusz = STATUSZ_SZIN[f.statusz] ?? "#64748b";
    const nap = hatralevoNap(f.hatarido);

    async function statuszValt(uj: string) {
        setFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/feladatok/${f.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statusz: uj }),
            });
            if (res.ok) onValtozas();
        } finally { setFut(false); }
    }

    // A gyors státusz-gombok mindenkinek megjelennek; a szerver dönt a
    // jogosultságról (STAFF csak a saját feladatán, különben 403).
    void viewerRole;

    return (
        <div className="glass card" style={{ borderLeft: `4px solid ${csik}`, display: "grid", gap: 8, opacity: f.statusz === "TOROLVE" ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800 }}>{f.cim}</span>
                <span className="badge" style={{ background: `${sStatusz}22`, color: sStatusz, border: `1px solid ${sStatusz}66` }}>
                    {feladatStatuszCimke(f.statusz)}
                </span>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="badge" style={{ background: `${PRIORITAS_SZIN[f.prioritas]}22`, color: PRIORITAS_SZIN[f.prioritas], border: `1px solid ${PRIORITAS_SZIN[f.prioritas]}55`, fontSize: 11 }}>
                    {feladatPrioritasCimke(f.prioritas)}
                </span>
                {f.hatarido && (
                    <span className="badge" style={{ fontSize: 11, color: f.lejart ? "#ff9d9d" : undefined, borderColor: f.lejart ? "rgba(220,38,38,0.5)" : undefined }}>
                        Határidő: {datumRovid(f.hatarido)}{f.lejart ? " (lejárt)" : nap != null && nap >= 0 ? ` (${nap} nap)` : ""}
                    </span>
                )}
            </div>

            {f.leiras && <div className="muted" style={{ fontSize: 13 }}>{f.leiras}</div>}

            <div className="muted" style={{ fontSize: 12, display: "grid", gap: 2 }}>
                <div>Felelős: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{f.felelosNev ?? "nincs kiosztva"}</strong></div>
                {f.toNev && <div>Vízegység: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{f.toNev}</strong></div>}
                <div>Létrehozta: {f.letrehozoNev ?? "—"}</div>
            </div>

            {f.statusz !== "TOROLVE" && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {f.statusz !== "FOLYAMATBAN" && f.statusz !== "KESZ" && (
                        <button className="btn" style={{ fontSize: 12 }} disabled={fut} onClick={() => statuszValt("FOLYAMATBAN")}>Indítás</button>
                    )}
                    {f.statusz !== "KESZ" && (
                        <button className="btn" style={{ fontSize: 12, color: "#16a34a" }} disabled={fut} onClick={() => statuszValt("KESZ")}>Kész</button>
                    )}
                    {f.statusz === "KESZ" && (
                        <button className="btn" style={{ fontSize: 12 }} disabled={fut} onClick={() => statuszValt("FOLYAMATBAN")}>Újranyitás</button>
                    )}
                    {canManage && f.statusz !== "ELHALASZTVA" && (
                        <button className="btn" style={{ fontSize: 12, color: "#f59e0b" }} disabled={fut} onClick={() => statuszValt("ELHALASZTVA")}>Halasztás</button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Új feladat űrlap ────────────────────────────────────────────────────────

function UjFeladatUrlap({ hid, tagok, toak, onKesz }: { hid: string; tagok: Tag[]; toak: ToOpcio[]; onKesz: () => void }) {
    const [cim, setCim] = useState("");
    const [leiras, setLeiras] = useState("");
    const [felelos, setFelelos] = useState("");
    const [toId, setToId] = useState("");
    const [hatarido, setHatarido] = useState("");
    const [prioritas, setPrioritas] = useState("NORMAL");
    const [szin, setSzin] = useState<string>(ALAP_SZIN);
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function mentes() {
        if (cim.trim().length < 2) { setHiba("A cím legalább 2 karakter legyen."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/feladatok`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cim: cim.trim(), leiras: leiras.trim() || null,
                    felelosFelhasznaloId: felelos || null, toId: toId || null,
                    hatarido: hatarido || null, prioritas, szin,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.error ?? "Nem sikerült menteni."); return; }
            onKesz();
        } catch { setHiba("Hálózati hiba."); } finally { setSaving(false); }
    }

    return (
        <div style={{ display: "grid", gap: 10, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 800 }}>Új feladat</div>
            {hiba && <div style={{ color: "#ff9d9d", fontSize: 13 }}>{hiba}</div>}

            <input style={mezo} value={cim} onChange={(e) => setCim(e.target.value)} placeholder="Feladat címe *" />
            <textarea style={{ ...mezo, resize: "vertical" }} rows={2} value={leiras} onChange={(e) => setLeiras(e.target.value)} placeholder="Leírás (opcionális)" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Felelős</span>
                    <select style={mezo} value={felelos} onChange={(e) => setFelelos(e.target.value)}>
                        <option value="">— nincs —</option>
                        {tagok.map((t) => <option key={t.azonosito} value={t.azonosito}>{t.nev || t.email}</option>)}
                    </select></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Vízegység</span>
                    <select style={mezo} value={toId} onChange={(e) => setToId(e.target.value)}>
                        <option value="">— nincs —</option>
                        {toak.map((t) => <option key={t.azonosito} value={t.azonosito}>{t.nev}</option>)}
                    </select></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Határidő</span>
                    <input style={mezo} type="date" value={hatarido} onChange={(e) => setHatarido(e.target.value)} /></label>
                <label style={{ display: "grid", gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Prioritás</span>
                    <select style={mezo} value={prioritas} onChange={(e) => setPrioritas(e.target.value)}>
                        <option value="ALACSONY">Alacsony</option>
                        <option value="NORMAL">Normál</option>
                        <option value="MAGAS">Magas</option>
                        <option value="SURGOS">Sürgős</option>
                    </select></label>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>Szín</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {FELADAT_SZINEK.map((c) => (
                        <button key={c} type="button" onClick={() => setSzin(c)} title={c}
                            style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                                border: szin === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)" }} />
                    ))}
                </div>
            </div>

            <button className="btn btn-primary" onClick={mentes} disabled={saving} style={{ justifySelf: "start" }}>
                {saving ? "Mentés…" : "Feladat létrehozása"}
            </button>
        </div>
    );
}
