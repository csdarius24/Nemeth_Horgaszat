"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    NINCS_ADAT,
    toTipusCimke,
    allapotCimke,
    ertekVagyNincsAdat,
    type Allapot,
} from "@/lib/toak/attekintes";

// ─── Tipusok ─────────────────────────────────────────────────────────────────

type Egyseg = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
    teruletHa: number | null;
    atlagMelysegMeter: number | null;
    kapacitasKg: number | null;
    allomanyDarab: number;
    allomanyKg: number | null;
    allomanyBecsultReszleges: boolean;
    foFajok: string | null;
    utolsoEtetes: string | null;
    utolsoEtetesNapja: number | null;
    atlagNapiEtetesKg: number;
    fedezetNap: number | null;
    utolsoEsemeny: string | null;
    utolsoEsemenyNapja: number | null;
    telitettsegSzazalek: number | null;
    vizminosegPont: number | null;
    egeszsegPont: number | null;
    allapot: Allapot;
};

type Valasz = {
    egysegek: Egyseg[];
    osszesen: number;
    days: number;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
    takarmany: { keszletKg: number; halaszatAtlagNapiKg: number; halaszatFedezetNap: number | null };
};

const SZUROK = [
    { ertek: "OSSZES", cimke: "Összes" },
    { ertek: "TO", cimke: "Tó" },
    { ertek: "TELELO", cimke: "Telelő" },
    { ertek: "IVADEKNEVELO", cimke: "Ivadéknevelő" },
    { ertek: "KELTETO_MEDENCE", cimke: "Keltető medence" },
] as const;

const ALLAPOT_SZIN: Record<Allapot, string> = {
    kivalo: "#6bcb77",
    jo: "#d08a5b",
    figyelendo: "#ffa94d",
    nincs_adat: "#8a8a8a",
};

const mezoStilus: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    width: "100%",
};

function datumSzoveg(iso: string | null): string {
    if (!iso) return NINCS_ADAT;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return NINCS_ADAT;
    return d.toLocaleString("hu-HU", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
}

// ─── Mutato (score) sav ──────────────────────────────────────────────────────

function Mutato({ cimke, ertek, egyseg }: { cimke: string; ertek: number | null; egyseg?: string }) {
    const vanAdat = ertek != null && Number.isFinite(ertek);
    const szazalek = vanAdat ? Math.max(0, Math.min(100, ertek)) : 0;

    return (
        <div style={{ flex: 1, minWidth: 90 }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{cimke}</div>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                {vanAdat && (
                    <div style={{ width: `${szazalek}%`, height: "100%", background: "#d08a5b", borderRadius: 999 }} />
                )}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: vanAdat ? 0.9 : 0.5 }}>
                {vanAdat ? `${ertek}${egyseg ?? ""}` : NINCS_ADAT}
            </div>
        </div>
    );
}

// ─── Kartya ──────────────────────────────────────────────────────────────────

function EgysegKartya({ e, hid }: { e: Egyseg; hid: string }) {
    const szin = ALLAPOT_SZIN[e.allapot];

    return (
        <div className="glass card" style={{ borderLeft: `3px solid ${szin}`, display: "grid", gap: 12 }}>
            {/* Fejlec */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{e.nev}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <span className="badge">{toTipusCimke(e.tipus)}</span>
                        {!e.aktiv && <span className="badge" style={{ opacity: 0.7 }}>Inaktív</span>}
                    </div>
                </div>
                <span
                    className="badge"
                    style={{ background: `${szin}22`, color: szin, border: `1px solid ${szin}55`, height: "fit-content" }}
                >
                    {allapotCimke(e.allapot)}
                </span>
            </div>

            {/* Muszaki adatok */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                <span className="muted">
                    Terület: <strong style={{ color: "rgba(255,255,255,0.85)" }}>
                        {ertekVagyNincsAdat(e.teruletHa, (x) => `${x} ha`)}
                    </strong>
                </span>
                <span className="muted">
                    Átl. mélység: <strong style={{ color: "rgba(255,255,255,0.85)" }}>
                        {ertekVagyNincsAdat(e.atlagMelysegMeter, (x) => `${x} m`)}
                    </strong>
                </span>
            </div>

            {/* Mutatok */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Mutato cimke="Vízminőség" ertek={e.vizminosegPont} />
                <Mutato cimke="Egészség" ertek={e.egeszsegPont} />
                <Mutato cimke="Telítettség" ertek={e.telitettsegSzazalek} egyseg="%" />
            </div>

            {/* Allomany */}
            <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
                <div>
                    <span className="muted">Halállomány: </span>
                    <strong>
                        {e.allomanyKg != null ? `~${e.allomanyKg} kg` : NINCS_ADAT}
                    </strong>
                    <span className="muted" style={{ fontSize: 12 }}> ({e.allomanyDarab} db)</span>
                    {e.allomanyBecsultReszleges && (
                        <span className="muted" style={{ fontSize: 11 }}> &bull; részleges súlyadat</span>
                    )}
                </div>
                <div>
                    <span className="muted">Fő faj: </span>
                    <strong>{e.foFajok ?? NINCS_ADAT}</strong>
                </div>
            </div>

            {/* Etetes */}
            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                <div className="muted">Utolsó etetés: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{datumSzoveg(e.utolsoEtetes)}</strong></div>
                <div className="muted">
                    Takarmány-fedezet:{" "}
                    <strong style={{ color: "rgba(255,255,255,0.85)" }}>
                        {ertekVagyNincsAdat(e.fedezetNap, (x) => `~${x} nap`)}
                    </strong>
                </div>
            </div>

            <a className="btn" href={`/halaszatok/${hid}/toak/${e.azonosito}`} style={{ justifySelf: "start" }}>
                Megnyitás &rarr;
            </a>
        </div>
    );
}

// ─── Fo komponens ────────────────────────────────────────────────────────────

export default function ToakAttekintesClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [szuro, setSzuro] = useState<string>("OSSZES");
    const [urlapNyitva, setUrlapNyitva] = useState(false);

    const betolt = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak/attekintes`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e: any) {
            setHiba(e?.message ?? "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid]);

    useEffect(() => { void betolt(); }, [betolt]);

    const egysegek = data?.egysegek ?? [];
    const canCreate = data?.viewerRole === "OWNER" || data?.viewerRole === "ADMIN";

    const szurtek = useMemo(() => {
        const s = q.trim().toLowerCase();
        return egysegek.filter((e) => {
            if (szuro !== "OSSZES" && e.tipus !== szuro) return false;
            if (!s) return true;
            return (
                e.nev.toLowerCase().includes(s) ||
                toTipusCimke(e.tipus).toLowerCase().includes(s) ||
                (e.foFajok ?? "").toLowerCase().includes(s)
            );
        });
    }, [egysegek, q, szuro]);

    if (loading) {
        return (
            <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#d08a5b",
                    animation: "spin 0.8s linear infinite",
                }} />
                <span className="muted">Vízegységek betöltése…</span>
            </div>
        );
    }

    if (hiba) {
        return (
            <div className="glass card" style={{ borderColor: "rgba(255,120,120,0.3)", background: "rgba(100,20,20,0.2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Hiba</div>
                <div className="muted">{hiba}</div>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* ── Fejlec ── */}
            <div className="glass card" style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h1 className="h1">Tavak és telelők</h1>
                        <div className="muted" style={{ marginTop: 6 }}>
                            {data?.osszesen ?? 0} kezelt vízegység
                            {data?.takarmany?.halaszatFedezetNap != null && (
                                <> &bull; halászat-szintű takarmány-fedezet: ~{data.takarmany.halaszatFedezetNap} nap</>
                            )}
                        </div>
                    </div>
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => setUrlapNyitva((v) => !v)}>
                            {urlapNyitva ? "Mégse" : "+ Új tó / telelő"}
                        </button>
                    )}
                </div>

                {/* Kereses */}
                <div className="search" style={{ maxWidth: 420 }}>
                    <span style={{ opacity: 0.7 }}>⌕</span>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Keresés név, típus vagy faj szerint…"
                    />
                </div>

                {/* Szuro chipek */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {SZUROK.map((s) => {
                        const aktiv = szuro === s.ertek;
                        const db = s.ertek === "OSSZES"
                            ? egysegek.length
                            : egysegek.filter((e) => e.tipus === s.ertek).length;
                        return (
                            <button
                                key={s.ertek}
                                className="btn"
                                onClick={() => setSzuro(s.ertek)}
                                style={{
                                    fontSize: 13,
                                    background: aktiv ? "rgba(208,138,91,0.25)" : undefined,
                                    borderColor: aktiv ? "rgba(208,138,91,0.7)" : undefined,
                                    color: aktiv ? "#d08a5b" : undefined,
                                    fontWeight: aktiv ? 700 : undefined,
                                }}
                            >
                                {s.cimke} ({db})
                            </button>
                        );
                    })}
                </div>

                {urlapNyitva && canCreate && (
                    <UjEgysegUrlap
                        hid={hid}
                        onKesz={() => { setUrlapNyitva(false); void betolt(); }}
                    />
                )}
            </div>

            {/* ── Ures allapotok / kartyak ── */}
            {egysegek.length === 0 ? (
                <div className="glass card" style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Még nincs vízegység</div>
                    <div className="muted">
                        {canCreate
                            ? "Hozz létre egy tavat vagy telelőt a fenti gombbal."
                            : "Új vízegység létrehozása ADMIN/OWNER jogot igényel."}
                    </div>
                </div>
            ) : szurtek.length === 0 ? (
                <div className="glass card" style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Nincs találat</div>
                    <div className="muted">Módosítsd a keresést vagy a szűrőt.</div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {szurtek.map((e) => <EgysegKartya key={e.azonosito} e={e} hid={hid} />)}
                </div>
            )}

            {/* ── Adathiany magyarazat (atlathatosag) ── */}
            <div className="glass card">
                <div className="muted" style={{ fontSize: 12 }}>
                    <strong>Megjegyzés az adatokhoz:</strong> a <em>Vízminőség</em> és az <em>Egészség</em>{" "}
                    mutatóhoz jelenleg <strong>nincs adatforrás</strong> (külön modul, SZD2) — ezért „{NINCS_ADAT}".
                    A halállomány kg-ban <strong>becsült</strong> érték (darabszám × a tömegtartomány középértéke).
                    A <em>Telítettség</em> csak akkor számolható, ha a vízegységhez megadtak kapacitást (kg).
                    A takarmánykészlet <strong>halászat-szintű</strong> (megosztott); a kártyán látható fedezet azt
                    mutatja, hány napra elegendő, ha csak az adott vízegység fogyasztana a jelenlegi ütemével.
                </div>
            </div>
        </div>
    );
}

// ─── Uj egyseg urlap ─────────────────────────────────────────────────────────

function UjEgysegUrlap({ hid, onKesz }: { hid: string; onKesz: () => void }) {
    const [nev, setNev] = useState("");
    const [tipus, setTipus] = useState("TO");
    const [teruletHa, setTeruletHa] = useState("");
    const [melyseg, setMelyseg] = useState("");
    const [kapacitas, setKapacitas] = useState("");
    const [saving, setSaving] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function kuldes(ev: React.FormEvent) {
        ev.preventDefault();
        if (nev.trim().length < 2) { setHiba("A név legalább 2 karakter legyen."); return; }
        setSaving(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev: nev.trim(),
                    tipus,
                    teruletHa: teruletHa || null,
                    atlagMelysegMeter: melyseg || null,
                    kapacitasKg: kapacitas || null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setHiba(json?.hiba ?? json?.error ?? "Nem sikerült létrehozni."); return; }
            onKesz();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={kuldes} style={{ display: "grid", gap: 10, maxWidth: 560, paddingTop: 6 }}>
            <div style={{ fontWeight: 800 }}>Új vízegység</div>
            {hiba && <div style={{ color: "#ff9d9d", fontSize: 13 }}>{hiba}</div>}

            <input style={mezoStilus} value={nev} onChange={(e) => setNev(e.target.value)} placeholder="Név (pl. Nagy-tó)" disabled={saving} />

            <select style={mezoStilus} value={tipus} onChange={(e) => setTipus(e.target.value)} disabled={saving}>
                <option value="TO">Tó</option>
                <option value="TELELO">Telelő</option>
                <option value="IVADEKNEVELO">Ivadéknevelő</option>
                <option value="KELTETO_MEDENCE">Keltető medence</option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
                <input style={mezoStilus} type="number" step="0.01" min="0" value={teruletHa}
                       onChange={(e) => setTeruletHa(e.target.value)} placeholder="Terület (ha) — opcionális" disabled={saving} />
                <input style={mezoStilus} type="number" step="0.01" min="0" value={melyseg}
                       onChange={(e) => setMelyseg(e.target.value)} placeholder="Átl. mélység (m) — opcionális" disabled={saving} />
                <input style={mezoStilus} type="number" step="0.01" min="0" value={kapacitas}
                       onChange={(e) => setKapacitas(e.target.value)} placeholder="Kapacitás (kg) — opcionális" disabled={saving} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: "start" }}>
                {saving ? "Mentés…" : "Létrehozás"}
            </button>
        </form>
    );
}
