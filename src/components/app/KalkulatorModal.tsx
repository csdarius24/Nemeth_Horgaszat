"use client";

import { useEffect, useCallback } from "react";

// ─── Típusok ─────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
}

// ─── Segéd: számológép logika hook ───────────────────────────────────────────

import { useState } from "react";

type KalcState = {
    kijelzes: string;       // amit a display mutat
    elozo: string | null;   // előző szám string-ként
    operator: string | null;
    ujSzamVarando: boolean; // következő digit felülírja a kijelzőt
};

const KEZDO: KalcState = {
    kijelzes: "0",
    elozo: null,
    operator: null,
    ujSzamVarando: false,
};

function szamit(a: number, b: number, op: string): number {
    switch (op) {
        case "+": return a + b;
        case "−": return a - b;
        case "×": return a * b;
        case "÷": return b === 0 ? NaN : a / b;
        default: return b;
    }
}

function formatKimenet(n: number): string {
    if (!Number.isFinite(n)) return "Hiba";
    // Ha az eredmény egész, mutassuk egészként, egyébként max 10 tizedessel
    const s = Number.isInteger(n) ? String(n) : n.toPrecision(10).replace(/\.?0+$/, "");
    return s.length > 13 ? n.toExponential(6) : s;
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function KalkulatorModal({ open, onClose }: Props) {
    const [allapot, beallitAllapot] = useState<KalcState>(KEZDO);

    // Billentyűzet kezelés
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") { onClose(); return; }
            if (/^[0-9]$/.test(e.key)) { digitNyomas(e.key); return; }
            if (e.key === ".") { pontNyomas(); return; }
            if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
                const op = e.key === "+" ? "+" : e.key === "-" ? "−" : e.key === "*" ? "×" : "÷";
                operatorNyomas(op);
                return;
            }
            if (e.key === "Enter" || e.key === "=") { egyenloNyomas(); return; }
            if (e.key === "Backspace") { backspaceNyomas(); return; }
            if (e.key === "Delete") { beallitAllapot(KEZDO); return; }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, allapot]);

    const digitNyomas = useCallback((d: string) => {
        beallitAllapot((prev) => {
            if (prev.ujSzamVarando) {
                return { ...prev, kijelzes: d, ujSzamVarando: false };
            }
            const uj = prev.kijelzes === "0" ? d : prev.kijelzes.length >= 13 ? prev.kijelzes : prev.kijelzes + d;
            return { ...prev, kijelzes: uj };
        });
    }, []);

    const pontNyomas = useCallback(() => {
        beallitAllapot((prev) => {
            if (prev.ujSzamVarando) return { ...prev, kijelzes: "0.", ujSzamVarando: false };
            if (prev.kijelzes.includes(".")) return prev;
            return { ...prev, kijelzes: prev.kijelzes + "." };
        });
    }, []);

    const operatorNyomas = useCallback((op: string) => {
        beallitAllapot((prev) => {
            const aktualis = parseFloat(prev.kijelzes);
            if (prev.elozo !== null && prev.operator && !prev.ujSzamVarando) {
                const eredmeny = szamit(parseFloat(prev.elozo), aktualis, prev.operator);
                const s = formatKimenet(eredmeny);
                return { kijelzes: s, elozo: s, operator: op, ujSzamVarando: true };
            }
            return { ...prev, elozo: prev.kijelzes, operator: op, ujSzamVarando: true };
        });
    }, []);

    const egyenloNyomas = useCallback(() => {
        beallitAllapot((prev) => {
            if (prev.elozo === null || prev.operator === null) return prev;
            const eredmeny = szamit(parseFloat(prev.elozo), parseFloat(prev.kijelzes), prev.operator);
            const s = formatKimenet(eredmeny);
            return { kijelzes: s, elozo: null, operator: null, ujSzamVarando: true };
        });
    }, []);

    const backspaceNyomas = useCallback(() => {
        beallitAllapot((prev) => {
            if (prev.ujSzamVarando || prev.kijelzes.length <= 1) return { ...prev, kijelzes: "0", ujSzamVarando: false };
            return { ...prev, kijelzes: prev.kijelzes.slice(0, -1) };
        });
    }, []);

    const plusMinuszNyomas = useCallback(() => {
        beallitAllapot((prev) => {
            const n = parseFloat(prev.kijelzes);
            return { ...prev, kijelzes: formatKimenet(-n) };
        });
    }, []);

    const szazalekNyomas = useCallback(() => {
        beallitAllapot((prev) => {
            const n = parseFloat(prev.kijelzes);
            return { ...prev, kijelzes: formatKimenet(n / 100) };
        });
    }, []);

    if (!open) return null;

    const { kijelzes, operator } = allapot;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    zIndex: 999,
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(2px)",
                    WebkitBackdropFilter: "blur(2px)",
                }}
            />

            {/* Kalkulátor ablak */}
            <div
                style={{
                    position: "fixed",
                    bottom: 24,
                    left: 104,          // sidebar (84px) + 20px gap
                    zIndex: 1000,
                    width: 280,
                    borderRadius: 22,
                    background: "rgba(26,10,7,0.92)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    overflow: "hidden",
                    userSelect: "none",
                }}
            >
                {/* Fejléc */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Számológép
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}
                    >
                        ×
                    </button>
                </div>

                {/* Kijelző */}
                <div style={{ padding: "4px 16px 16px", textAlign: "right" }}>
                    {operator && (
                        <div style={{ fontSize: 13, color: "rgba(208,138,91,0.8)", marginBottom: 2, minHeight: 18 }}>
                            {allapot.elozo} {operator}
                        </div>
                    )}
                    <div
                        style={{
                            fontSize: kijelzes.length > 10 ? 22 : kijelzes.length > 7 ? 28 : 36,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.95)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.02em",
                            minHeight: 42,
                            wordBreak: "break-all",
                        }}
                    >
                        {kijelzes}
                    </div>
                </div>

                {/* Gombok rács */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", padding: 1 }}>
                    {/* Sor 1 */}
                    <KalcGomb label="AC" onClick={() => beallitAllapot(KEZDO)} tipusStilus="utility" />
                    <KalcGomb label="+/−" onClick={plusMinuszNyomas} tipusStilus="utility" />
                    <KalcGomb label="%" onClick={szazalekNyomas} tipusStilus="utility" />
                    <KalcGomb label="÷" onClick={() => operatorNyomas("÷")} aktiv={operator === "÷"} tipusStilus="operator" />

                    {/* Sor 2 */}
                    <KalcGomb label="7" onClick={() => digitNyomas("7")} />
                    <KalcGomb label="8" onClick={() => digitNyomas("8")} />
                    <KalcGomb label="9" onClick={() => digitNyomas("9")} />
                    <KalcGomb label="×" onClick={() => operatorNyomas("×")} aktiv={operator === "×"} tipusStilus="operator" />

                    {/* Sor 3 */}
                    <KalcGomb label="4" onClick={() => digitNyomas("4")} />
                    <KalcGomb label="5" onClick={() => digitNyomas("5")} />
                    <KalcGomb label="6" onClick={() => digitNyomas("6")} />
                    <KalcGomb label="−" onClick={() => operatorNyomas("−")} aktiv={operator === "−"} tipusStilus="operator" />

                    {/* Sor 4 */}
                    <KalcGomb label="1" onClick={() => digitNyomas("1")} />
                    <KalcGomb label="2" onClick={() => digitNyomas("2")} />
                    <KalcGomb label="3" onClick={() => digitNyomas("3")} />
                    <KalcGomb label="+" onClick={() => operatorNyomas("+")} aktiv={operator === "+"} tipusStilus="operator" />

                    {/* Sor 5 */}
                    <KalcGomb label="0" onClick={() => digitNyomas("0")} span2 />
                    <KalcGomb label="⌫" onClick={backspaceNyomas} />
                    <KalcGomb label="=" onClick={egyenloNyomas} tipusStilus="egyenlo" />
                </div>
            </div>
        </>
    );
}

// ─── Gomb komponens ───────────────────────────────────────────────────────────

function KalcGomb({
    label,
    onClick,
    tipusStilus = "szam",
    aktiv = false,
    span2 = false,
}: {
    label: string;
    onClick: () => void;
    tipusStilus?: "szam" | "operator" | "utility" | "egyenlo";
    aktiv?: boolean;
    span2?: boolean;
}) {
    const alap: React.CSSProperties = {
        gridColumn: span2 ? "span 2" : undefined,
        padding: "18px 8px",
        border: "none",
        cursor: "pointer",
        fontSize: 17,
        fontWeight: 600,
        transition: "background 0.1s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: span2 ? "flex-start" : "center",
        paddingLeft: span2 ? 28 : undefined,
    };

    const stilus: Record<string, React.CSSProperties> = {
        szam: { background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.92)" },
        utility: { background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" },
        operator: {
            background: aktiv ? "rgba(208,138,91,0.85)" : "rgba(208,138,91,0.35)",
            color: aktiv ? "#1b0b08" : "#d08a5b",
        },
        egyenlo: { background: "rgba(178,75,37,0.9)", color: "#fff" },
    };

    return (
        <button
            onClick={onClick}
            style={{ ...alap, ...stilus[tipusStilus] }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.15)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "";
            }}
            onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
            }}
            onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
            }}
        >
            {label}
        </button>
    );
}
