"use client";

import { useEffect, useState } from "react";

type Hibabejelentes = {
    azonosito: number;
    targy: string;
    leiras: string;
    oldalUrl: string | null;
    statusz: "UJ" | "FOLYAMATBAN" | "MEGOLDVA" | "ELUTASITVA";
    letrehozva: string;
    felhasznalo: {
        azonosito: number;
        nev: string | null;
        email: string;
    } | null;
};

export default function HibabejelentesekOldal({ hid }: { hid: string }) {
    const [adatok, setAdatok] = useState<Hibabejelentes[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState("");

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setHiba("");

                const res = await fetch(`/api/halaszatok/${hid}/hibabejelentesek`, {
                    cache: "no-store",
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.hiba || "Lekérési hiba");
                }

                if (!mounted) return;
                setAdatok(data?.adatok ?? []);
            } catch (err) {
                if (!mounted) return;
                setHiba(err instanceof Error ? err.message : "Ismeretlen hiba");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [hid]);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="glass card">
                <h1 className="h1">Hibabejelentések</h1>
                <div className="muted" style={{ marginTop: 8 }}>
                    Az adott halászathoz tartozó beküldött hibák listája.
                </div>
            </div>

            <div className="glass card">
                {loading ? (
                    <div>Betöltés...</div>
                ) : hiba ? (
                    <div className="muted">{hiba}</div>
                ) : adatok.length === 0 ? (
                    <div className="muted">Még nincs hibabejelentés.</div>
                ) : (
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Dátum</th>
                            <th>Státusz</th>
                            <th>Tárgy</th>
                            <th>Bejelentő</th>
                            <th>Oldal</th>
                            <th>Leírás</th>
                        </tr>
                        </thead>
                        <tbody>
                        {adatok.map((sor) => (
                            <tr key={sor.azonosito}>
                                <td>
                                    {new Date(sor.letrehozva).toLocaleString("hu-HU")}
                                </td>
                                <td>
                                    <select
                                        value={sor.statusz}
                                        onChange={async (e) => {
                                            const ujStatusz = e.target.value;

                                            try {
                                                const res = await fetch(`/api/hibabejelentesek/${sor.azonosito}`, {
                                                    method: "PATCH",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        statusz: ujStatusz,
                                                    }),
                                                });

                                                const data = await res.json();

                                                if (!res.ok) {
                                                    throw new Error(data?.hiba || "Nem sikerült frissíteni a státuszt.");
                                                }

                                                setAdatok((elozo) =>
                                                    elozo.map((elem) =>
                                                        elem.azonosito === sor.azonosito
                                                            ? {...elem, statusz: ujStatusz as Hibabejelentes["statusz"]}
                                                            : elem
                                                    )
                                                );
                                            } catch (err) {
                                                alert(err instanceof Error ? err.message : "Ismeretlen hiba");
                                            }
                                        }}
                                        style={{
                                            padding: "8px 10px",
                                            borderRadius: 12,
                                            background: "rgba(0,0,0,0.18)",
                                            border: "1px solid rgba(255,255,255,0.14)",
                                            color: "white",
                                        }}
                                    >
                                        <option value="UJ">ÚJ</option>
                                        <option value="FOLYAMATBAN">FOLYAMATBAN</option>
                                        <option value="MEGOLDVA">MEGOLDVA</option>
                                        <option value="ELUTASITVA">ELUTASÍTVA</option>
                                    </select>
                                </td>
                                <td>{sor.targy}</td>
                                <td>
                                    {sor.felhasznalo?.nev || "Ismeretlen"}
                                    <br/>
                                    <span className="muted">{sor.felhasznalo?.email || "—"}</span>
                                </td>
                                <td style={{maxWidth: 180, wordBreak: "break-word"}}>
                                    {sor.oldalUrl || "—"}
                                </td>
                                <td style={{maxWidth: 320, wordBreak: "break-word"}}>
                                    {sor.leiras}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}