"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ESEMENY_TIPUS_CIMKE, AKTIV_ESEMENY_TIPUSOK } from "@/lib/naplo/format";

// ─── Tipusok ─────────────────────────────────────────────────────────────────

type NaploBejegyzes = {
    id: number;
    tipus: string;
    tipusCimke: string;
    cim: string;
    leiras: string | null;
    datum: string;
    rogzitoNev: string | null;
    toId: number | null;
    toNev: string | null;
    halfajNev: string | null;
    mennyisegKg: number | null;
    darab: number | null;
    ervenyes: boolean;
    reszletek: unknown;
};

type Valasz = {
    esemenyek: NaploBejegyzes[];
    talalatOsszesen: number;
    tenantOsszesen: number;
    limit: number;
};

type ToOpcio = { azonosito: number; nev: string };

const TIPUS_SZIN: Record<string, string> = {
    TELEPITES: "#d08a5b",
    KIVETEL: "#7a2a17",
    ETETES: "#b24b25",
    TAKARMANY_BEVETEL: "#4caf50",
    TAKARMANY_FELHASZNALAS: "#c06535",
};

const PERIODUSOK = [
    { ertek: "", cimke: "Összes" },
    { ertek: "day", cimke: "Napi" },
    { ertek: "week", cimke: "Heti" },
    { ertek: "month", cimke: "Havi" },
] as const;

const mezoStilus: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
};

function maUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function HalaszatiNaploClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [tipus, setTipus] = useState("");
    const [toId, setToId] = useState("");
    const [periodus, setPeriodus] = useState<string>("");
    const [datum, setDatum] = useState(maUtc());
    const [toak, setToak] = useState<ToOpcio[]>([]);

    // Kereső debounce
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    // Tavak a szűrőhöz (best-effort)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" });
                const json = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(json?.toak)) {
                    setToak(json.toak.map((t: any) => ({ azonosito: t.azonosito, nev: t.nev })));
                }
            } catch { /* a szűrő opcionális */ }
        })();
    }, [hid]);

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const p = new URLSearchParams();
            if (debouncedQ) p.set("q", debouncedQ);
            if (tipus) p.set("tipus", tipus);
            if (toId) p.set("toId", toId);
            if (periodus) { p.set("period", periodus); p.set("date", datum); }
            const res = await fetch(`/api/halaszatok/${hid}/naplo?${p}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid, debouncedQ, tipus, toId, periodus, datum]);

    useEffect(() => { void betolt(); }, [betolt]);

    const exportUrl = useMemo(() => {
        if (!periodus) return null;
        const p = new URLSearchParams({ period: periodus, date: datum });
        if (toId) p.set("toId", toId);
        if (tipus) p.set("tipus", tipus);
        return `/api/halaszatok/${hid}/naplo/export?${p}`;
    }, [hid, periodus, datum, toId, tipus]);

    const esemenyek = data?.esemenyek ?? [];

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* ── Fejléc ── */}
            <div className="glass card" style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h1 className="h1">Halászati napló</h1>
                        <div className="muted" style={{ marginTop: 6 }}>
                            {data
                                ? <>összesen {data.tenantOsszesen} naplózott esemény &bull; a szűrőkre {data.talalatOsszesen} találat (max {data.limit} látható)</>
                                : "Műveleti napló betöltése…"}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        {exportUrl ? (
                            <a className="btn btn-primary" href={exportUrl} target="_blank" rel="noopener noreferrer">
                                Exportálás (nyomtatható)
                            </a>
                        ) : (
                            <span className="btn" style={{ opacity: 0.5, cursor: "not-allowed" }} title="Az exporthoz válassz időszakot: Napi / Heti / Havi">
                                Exportálás (nyomtatható)
                            </span>
                        )}
                    </div>
                </div>

                {/* Kereső */}
                <div className="search" style={{ maxWidth: 420 }}>
                    <span style={{ opacity: 0.7 }}>⌕</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés a naplóban…" />
                </div>

                {/* Szűrők */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={tipus} onChange={(e) => setTipus(e.target.value)} style={mezoStilus}>
                        <option value="">Minden típus</option>
                        {AKTIV_ESEMENY_TIPUSOK.map((t) => (
                            <option key={t} value={t}>{ESEMENY_TIPUS_CIMKE[t]}</option>
                        ))}
                    </select>

                    <select value={toId} onChange={(e) => setToId(e.target.value)} style={mezoStilus}>
                        <option value="">Minden vízegység</option>
                        {toak.map((t) => (
                            <option key={t.azonosito} value={t.azonosito}>{t.nev}</option>
                        ))}
                    </select>

                    {/* Időszak chipek */}
                    <div style={{ display: "flex", gap: 6 }}>
                        {PERIODUSOK.map((p) => {
                            const aktiv = periodus === p.ertek;
                            return (
                                <button
                                    key={p.ertek || "osszes"}
                                    className="btn"
                                    onClick={() => setPeriodus(p.ertek)}
                                    style={{
                                        fontSize: 13,
                                        background: aktiv ? "rgba(208,138,91,0.25)" : undefined,
                                        borderColor: aktiv ? "rgba(208,138,91,0.7)" : undefined,
                                        color: aktiv ? "#d08a5b" : undefined,
                                        fontWeight: aktiv ? 700 : undefined,
                                    }}
                                >
                                    {p.cimke}
                                </button>
                            );
                        })}
                    </div>

                    <input
                        type="date"
                        value={datum}
                        onChange={(e) => setDatum(e.target.value || maUtc())}
                        style={{ ...mezoStilus, opacity: periodus ? 1 : 0.5 }}
                        disabled={!periodus}
                        title={periodus ? "Az időszak dátuma" : "Előbb válassz időszakot"}
                    />
                </div>
            </div>

            {/* ── Lista ── */}
            {loading ? (
                <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#d08a5b",
                        animation: "spin 0.8s linear infinite",
                    }} />
                    <span className="muted">Napló betöltése…</span>
                </div>
            ) : hiba ? (
                <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.3)", background: "rgba(100,20,20,0.2)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba</div>
                    <div className="muted">{hiba}</div>
                </div>
            ) : esemenyek.length === 0 ? (
                <div className="glass card" style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {data && data.tenantOsszesen === 0 ? "Még nincs naplózott esemény" : "Nincs találat"}
                    </div>
                    <div className="muted">
                        {data && data.tenantOsszesen === 0
                            ? "A műveletek (telepítés, kivét, etetés, takarmánymozgás) automatikusan ide naplózódnak."
                            : "Módosítsd a keresést, a szűrőt vagy az időszakot."}
                    </div>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 8 }}>
                    {esemenyek.map((e) => {
                        const szin = TIPUS_SZIN[e.tipus] ?? "#8a8a8a";
                        return (
                            <div key={e.id} className="glass card" style={{ borderLeft: `3px solid ${szin}`, display: "grid", gap: 6, padding: "12px 16px" }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <span className="badge" style={{ background: `${szin}22`, color: szin, border: `1px solid ${szin}55` }}>
                                        {e.tipusCimke}
                                    </span>
                                    <span style={{ fontWeight: 700 }}>{e.cim}</span>
                                    <span className="badge" style={{
                                        background: e.ervenyes ? "rgba(76,175,80,0.15)" : "rgba(150,30,30,0.2)",
                                        color: e.ervenyes ? "#6bcb77" : "#ff9d9d",
                                        border: `1px solid ${e.ervenyes ? "rgba(76,175,80,0.3)" : "rgba(150,30,30,0.4)"}`,
                                        marginLeft: "auto",
                                    }}>
                                        {e.ervenyes ? "Érvényes" : "Érvénytelenítve"}
                                    </span>
                                </div>

                                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }} className="muted">
                                    <span>
                                        {new Date(e.datum).toLocaleString("hu-HU", {
                                            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                                        })}
                                    </span>
                                    {e.toNev && <span>Vízegység: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{e.toNev}</strong></span>}
                                    {e.halfajNev && <span>Faj: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{e.halfajNev}</strong></span>}
                                    {e.mennyisegKg != null && <span>Mennyiség: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{e.mennyisegKg} kg</strong></span>}
                                    {e.darab != null && <span>Darab: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{e.darab} db</strong></span>}
                                    <span>
                                        {e.rogzitoNev
                                            ? <>Rögzítette: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{e.rogzitoNev}</strong></>
                                            : <span style={{ opacity: 0.7 }}>Rögzítő: nincs adat</span>}
                                    </span>
                                </div>

                                {e.leiras && (
                                    <div className="muted" style={{ fontSize: 13 }}>{e.leiras}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Megjegyzés ── */}
            <div className="glass card">
                <div className="muted" style={{ fontSize: 12 }}>
                    <strong>Megjegyzés:</strong> a napló a ténylegesen megvalósított műveletekből épül
                    (telepítés, kivét, áttelepítés, etetés, takarmány-bevétel/-felhasználás). Az export
                    <strong> nyomtatóbarát HTML</strong> — a böngésző „Nyomtatás → Mentés PDF-ként"
                    funkciójával menthető PDF-be; a közvetlen PDF-generálás tervezett. A bejegyzések
                    érvénytelenítése (audit-flow) szintén tervezett — jelenleg minden bejegyzés „Érvényes".
                    A régi (a napló-bővítés előtti) eseményeknél a rögzítő „nincs adat" lehet.
                </div>
            </div>
        </div>
    );
}
