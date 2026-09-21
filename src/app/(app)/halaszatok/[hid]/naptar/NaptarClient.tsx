"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Típusok ─────────────────────────────────────────────────────────────────

interface Bejegyzes {
    azonosito: number;
    datum: string;
    cim: string;
    tartalom: string | null;
    szin: string | null;
}

// ─── Konstansok ───────────────────────────────────────────────────────────────

const NAPOK = ["H", "K", "Sz", "Cs", "P", "Szo", "V"];
const HONAPOK = [
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December",
];
const SZINEK = [
    { ertek: "narancs", label: "Narancs", hex: "#d08a5b" },
    { ertek: "piros",   label: "Piros",   hex: "#b24b25" },
    { ertek: "zold",    label: "Zöld",    hex: "#3a7d44" },
    { ertek: "kek",     label: "Kék",     hex: "#2e6da4" },
    { ertek: "lila",    label: "Lila",    hex: "#7c4dab" },
    { ertek: "szurke",  label: "Szürke",  hex: "#6b7280" },
];

function szinHex(szin: string | null): string {
    return SZINEK.find((s) => s.ertek === szin)?.hex ?? "#d08a5b";
}

// ─── Segédfüggvények ──────────────────────────────────────────────────────────

/** Visszaadja az adott hónap napjait + az előző/következő hónap feltöltő napjait
 *  úgy, hogy a hét hétfőn kezdődjön. */
function honapRacsa(ev: number, honap: number): Array<{ datum: Date; aktualisHonap: boolean }> {
    const elsoNap = new Date(ev, honap - 1, 1);
    const utolsoNap = new Date(ev, honap, 0);

    // JS: 0=vasárnap → igazítjuk hétfőre
    const elsoHetNap = (elsoNap.getDay() + 6) % 7;

    const napok: Array<{ datum: Date; aktualisHonap: boolean }> = [];

    // Előző hónap feltöltő napjai
    for (let i = elsoHetNap - 1; i >= 0; i--) {
        const d = new Date(ev, honap - 1, -i);
        napok.push({ datum: d, aktualisHonap: false });
    }

    // Az aktuális hónap napjai
    for (let i = 1; i <= utolsoNap.getDate(); i++) {
        napok.push({ datum: new Date(ev, honap - 1, i), aktualisHonap: true });
    }

    // Következő hónap feltöltő napjai (hogy 6 teljes sor legyen = 42 cella)
    const maradek = 42 - napok.length;
    for (let i = 1; i <= maradek; i++) {
        napok.push({ datum: new Date(ev, honap, i), aktualisHonap: false });
    }

    return napok;
}

function datumKulcs(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function maKulcs(): string {
    return datumKulcs(new Date());
}

// ─── Fő komponens ─────────────────────────────────────────────────────────────

export default function NaptarClient({ hid }: { hid: string }) {
    const ma = new Date();
    const [ev, setEv] = useState(ma.getFullYear());
    const [honap, setHonap] = useState(ma.getMonth() + 1);

    const [bejegyzesek, setBejegyzesek] = useState<Bejegyzes[]>([]);
    const [betoltes, setBetoltes] = useState(false);

    // Modal állapotok
    const [kivalasztottNap, setKivalasztottNap] = useState<string | null>(null);
    const [szerkesztett, setSzerkesztett] = useState<Bejegyzes | null>(null);
    const [modalNyitva, setModalNyitva] = useState(false);

    // ── Betöltés ──────────────────────────────────────────────────────────────

    const betolt = useCallback(async () => {
        setBetoltes(true);
        try {
            const res = await fetch(
                `/api/halaszatok/${hid}/naptar?ev=${ev}&honap=${honap}`,
                { cache: "no-store" }
            );
            const json = await res.json().catch(() => ({}));
            setBejegyzesek(json.bejegyzesek ?? []);
        } finally {
            setBetoltes(false);
        }
    }, [hid, ev, honap]);

    useEffect(() => { void betolt(); }, [betolt]);

    // ── Navigáció ──────────────────────────────────────────────────────────────

    function elozoHonap() {
        if (honap === 1) { setEv((v) => v - 1); setHonap(12); }
        else setHonap((v) => v - 1);
    }

    function kovetkezoHonap() {
        if (honap === 12) { setEv((v) => v + 1); setHonap(1); }
        else setHonap((v) => v + 1);
    }

    function vissza() {
        setEv(ma.getFullYear());
        setHonap(ma.getMonth() + 1);
    }

    // ── Nap kattintás ─────────────────────────────────────────────────────────

    function napKattintas(kulcs: string) {
        setKivalasztottNap(kulcs);
        setSzerkesztett(null);
        setModalNyitva(true);
    }

    function bejegyzesKattintas(e: React.MouseEvent, b: Bejegyzes) {
        e.stopPropagation();
        setKivalasztottNap(b.datum.slice(0, 10));
        setSzerkesztett(b);
        setModalNyitva(true);
    }

    function modalZarasa() {
        setModalNyitva(false);
        setSzerkesztett(null);
        setKivalasztottNap(null);
    }

    async function mentesUtan() {
        modalZarasa();
        await betolt();
    }

    // ── Rács ─────────────────────────────────────────────────────────────────

    const racs = honapRacsa(ev, honap);
    const maKulcsStr = maKulcs();

    // Bejegyzések napok szerint csoportosítva
    const bejegyzesekNaponkent = bejegyzesek.reduce<Record<string, Bejegyzes[]>>(
        (acc, b) => {
            const k = b.datum.slice(0, 10);
            (acc[k] ??= []).push(b);
            return acc;
        },
        {}
    );

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* ── Fejléc / navigáció ── */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button className="iconbtn" onClick={elozoHonap} title="Előző hónap" style={{ fontSize: 18 }}>‹</button>

                <div style={{ flex: 1, textAlign: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>
                        {ev}. {HONAPOK[honap - 1]}
                    </span>
                </div>

                <button className="iconbtn" onClick={kovetkezoHonap} title="Következő hónap" style={{ fontSize: 18 }}>›</button>

                <button className="btn" onClick={vissza} style={{ fontSize: 13 }}>
                    Ma
                </button>

                {betoltes && (
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#d08a5b", animation: "spin 0.8s linear infinite" }} />
                )}
            </div>

            {/* ── Naptár rács ── */}
            <div className="glass card" style={{ padding: 0, overflow: "hidden" }}>

                {/* Napok fejlécsor */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {NAPOK.map((nap) => (
                        <div
                            key={nap}
                            style={{
                                padding: "10px 6px",
                                textAlign: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.45)",
                            }}
                        >
                            {nap}
                        </div>
                    ))}
                </div>

                {/* Nap cellák */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {racs.map(({ datum, aktualisHonap }, idx) => {
                        const kulcs = datumKulcs(datum);
                        const napi = bejegyzesekNaponkent[kulcs] ?? [];
                        const ma = kulcs === maKulcsStr;
                        const hetVege = idx % 7 >= 5;

                        return (
                            <div
                                key={kulcs + idx}
                                onClick={() => napKattintas(kulcs)}
                                style={{
                                    minHeight: 90,
                                    padding: "8px 8px 6px",
                                    borderRight: idx % 7 < 6 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                                    borderBottom: idx < 35 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                                    background: ma
                                        ? "rgba(208,138,91,0.10)"
                                        : hetVege
                                            ? "rgba(0,0,0,0.10)"
                                            : undefined,
                                    cursor: "pointer",
                                    transition: "background 0.12s",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                                onMouseEnter={(e) => {
                                    if (!ma) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.background = ma
                                        ? "rgba(208,138,91,0.10)"
                                        : hetVege ? "rgba(0,0,0,0.10)" : "";
                                }}
                            >
                                {/* Nap száma */}
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 26,
                                        height: 26,
                                        borderRadius: "50%",
                                        fontSize: 13,
                                        fontWeight: ma ? 800 : 500,
                                        color: ma
                                            ? "#d08a5b"
                                            : aktualisHonap
                                                ? "rgba(255,255,255,0.85)"
                                                : "rgba(255,255,255,0.25)",
                                        background: ma ? "rgba(208,138,91,0.20)" : undefined,
                                        marginBottom: 4,
                                    }}
                                >
                                    {datum.getDate()}
                                </div>

                                {/* Bejegyzések */}
                                <div style={{ display: "grid", gap: 3 }}>
                                    {napi.slice(0, 3).map((b) => (
                                        <div
                                            key={b.azonosito}
                                            onClick={(e) => bejegyzesKattintas(e, b)}
                                            title={b.cim}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: "2px 6px",
                                                borderRadius: 6,
                                                background: `${szinHex(b.szin)}28`,
                                                borderLeft: `3px solid ${szinHex(b.szin)}`,
                                                color: "rgba(255,255,255,0.88)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                cursor: "pointer",
                                                transition: "background 0.1s",
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.background = `${szinHex(b.szin)}45`;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.background = `${szinHex(b.szin)}28`;
                                            }}
                                        >
                                            {b.cim}
                                        </div>
                                    ))}
                                    {napi.length > 3 && (
                                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", paddingLeft: 4 }}>
                                            +{napi.length - 3} további
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Bejegyzés modal ── */}
            {modalNyitva && kivalasztottNap && (
                <BejegyzesModal
                    hid={hid}
                    datum={kivalasztottNap}
                    bejegyzes={szerkesztett}
                    napiBejegyzesek={bejegyzesekNaponkent[kivalasztottNap] ?? []}
                    onZaras={modalZarasa}
                    onMentes={mentesUtan}
                />
            )}
        </div>
    );
}

// ─── Bejegyzés modal ──────────────────────────────────────────────────────────

interface ModalProps {
    hid: string;
    datum: string;
    bejegyzes: Bejegyzes | null;     // null = új bejegyzés
    napiBejegyzesek: Bejegyzes[];    // az adott napon lévő összes bejegyzés
    onZaras: () => void;
    onMentes: () => void;
}

function BejegyzesModal({ hid, datum, bejegyzes, napiBejegyzesek, onZaras, onMentes }: ModalProps) {
    const [nezet, setNezet] = useState<"lista" | "uj" | "szerkeszt">(
        bejegyzes ? "szerkeszt" : napiBejegyzesek.length === 0 ? "uj" : "lista"
    );

    const [aktualisBejegyzes, setAktualisBejegyzes] = useState<Bejegyzes | null>(bejegyzes);

    const [cim, setCim] = useState(bejegyzes?.cim ?? "");
    const [tartalom, setTartalom] = useState(bejegyzes?.tartalom ?? "");
    const [szin, setSzin] = useState(bejegyzes?.szin ?? "narancs");
    const [mentes, setMentes] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);
    const [torlés, setTorlés] = useState(false);

    // Dátum olvasható formában
    const datumObj = new Date(datum + "T12:00:00");
    const datumNev = datumObj.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

    function urlapVisszaallitas(b?: Bejegyzes) {
        setCim(b?.cim ?? "");
        setTartalom(b?.tartalom ?? "");
        setSzin(b?.szin ?? "narancs");
        setHiba(null);
    }

    function szerkesztesInditas(b: Bejegyzes) {
        setAktualisBejegyzes(b);
        urlapVisszaallitas(b);
        setNezet("szerkeszt");
    }

    function ujInditas() {
        setAktualisBejegyzes(null);
        urlapVisszaallitas();
        setNezet("uj");
    }

    async function kuldes() {
        if (!cim.trim()) { setHiba("A cím kötelező."); return; }
        setMentes(true);
        setHiba(null);

        try {
            const isUj = nezet === "uj";
            const url = isUj
                ? `/api/halaszatok/${hid}/naptar`
                : `/api/halaszatok/${hid}/naptar/${aktualisBejegyzes!.azonosito}`;

            const res = await fetch(url, {
                method: isUj ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ datum, cim: cim.trim(), tartalom: tartalom.trim() || null, szin }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Mentési hiba.");
            onMentes();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setMentes(false);
        }
    }

    async function torol(b: Bejegyzes) {
        if (!confirm(`Törlöd ezt a bejegyzést?\n"${b.cim}"`)) return;
        setTorlés(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/naptar/${b.azonosito}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error ?? "Törlési hiba.");
            }
            onMentes();
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
            setTorlés(false);
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onZaras}
                style={{
                    position: "fixed", inset: 0, zIndex: 998,
                    background: "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 999,
                    width: "min(460px, calc(100vw - 32px))",
                    maxHeight: "80vh",
                    overflowY: "auto",
                    borderRadius: 22,
                    background: "rgba(26,10,7,0.96)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                }}
            >
                {/* Modal fejléc */}
                <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.92)" }}>
                            {nezet === "lista" ? "Napi bejegyzések" : nezet === "uj" ? "Új bejegyzés" : "Szerkesztés"}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{datumNev}</div>
                    </div>
                    <button onClick={onZaras} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
                </div>

                <div style={{ padding: "16px 20px 20px" }}>

                    {/* ── LISTA NÉZET ── */}
                    {nezet === "lista" && (
                        <div style={{ display: "grid", gap: 10 }}>
                            {napiBejegyzesek.map((b) => (
                                <div
                                    key={b.azonosito}
                                    style={{
                                        padding: "12px 14px",
                                        borderRadius: 14,
                                        background: `${szinHex(b.szin)}18`,
                                        borderLeft: `3px solid ${szinHex(b.szin)}`,
                                        display: "grid",
                                        gap: 6,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{b.cim}</span>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                className="btn"
                                                onClick={() => szerkesztesInditas(b)}
                                                style={{ padding: "4px 10px", fontSize: 12 }}
                                            >Szerk.</button>
                                            <button
                                                className="btn"
                                                onClick={() => torol(b)}
                                                disabled={torlés}
                                                style={{ padding: "4px 10px", fontSize: 12, color: "#e07070", borderColor: "rgba(224,112,112,0.3)" }}
                                            >Törlés</button>
                                        </div>
                                    </div>
                                    {b.tartalom && <div className="muted" style={{ fontSize: 13 }}>{b.tartalom}</div>}
                                </div>
                            ))}

                            <button className="btn btn-primary" onClick={ujInditas} style={{ marginTop: 4, width: "100%", justifyContent: "center" }}>
                                + Új bejegyzés erre a napra
                            </button>
                        </div>
                    )}

                    {/* ── ÚJ / SZERKESZT NÉZET ── */}
                    {(nezet === "uj" || nezet === "szerkeszt") && (
                        <div style={{ display: "grid", gap: 14 }}>

                            {/* Cím */}
                            <div>
                                <label style={labelStil}>Cím *</label>
                                <input
                                    value={cim}
                                    onChange={(e) => setCim(e.target.value)}
                                    placeholder="pl. Ponty telepítés, Verseny nap…"
                                    autoFocus
                                    style={inputStil}
                                    onKeyDown={(e) => { if (e.key === "Enter") kuldes(); }}
                                />
                            </div>

                            {/* Tartalom */}
                            <div>
                                <label style={labelStil}>Megjegyzés (opcionális)</label>
                                <textarea
                                    value={tartalom}
                                    onChange={(e) => setTartalom(e.target.value)}
                                    placeholder="Részletek, teendők…"
                                    rows={3}
                                    style={{ ...inputStil, borderRadius: 14, resize: "vertical" }}
                                />
                            </div>

                            {/* Szín */}
                            <div>
                                <label style={labelStil}>Szín / kategória</label>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                                    {SZINEK.map((s) => (
                                        <button
                                            key={s.ertek}
                                            onClick={() => setSzin(s.ertek)}
                                            title={s.label}
                                            style={{
                                                width: 30, height: 30,
                                                borderRadius: 10,
                                                background: s.hex,
                                                border: szin === s.ertek ? "3px solid rgba(255,255,255,0.9)" : "3px solid transparent",
                                                cursor: "pointer",
                                                transition: "transform 0.1s, border-color 0.1s",
                                                transform: szin === s.ertek ? "scale(1.15)" : undefined,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Hiba */}
                            {hiba && (
                                <div style={{ color: "#e07070", fontSize: 13, background: "rgba(224,112,112,0.1)", padding: "8px 12px", borderRadius: 10 }}>
                                    {hiba}
                                </div>
                            )}

                            {/* Akciók */}
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                                {nezet === "szerkeszt" && napiBejegyzesek.length > 1 && (
                                    <button className="btn" onClick={() => setNezet("lista")} style={{ fontSize: 13 }}>← Vissza</button>
                                )}
                                <button className="btn" onClick={onZaras} style={{ fontSize: 13 }}>Mégse</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={kuldes}
                                    disabled={mentes}
                                    style={{ fontSize: 13, minWidth: 90 }}
                                >
                                    {mentes ? "Mentés…" : nezet === "uj" ? "Létrehozás" : "Mentés"}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}

// ─── Shared stílusok ──────────────────────────────────────────────────────────

const labelStil: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
};

const inputStil: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.22)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    outline: "none",
};
