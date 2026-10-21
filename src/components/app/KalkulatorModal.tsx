"use client";

import { useEffect, useCallback, useState } from "react";
import { X } from "lucide-react";

// ─── Típusok ─────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
}

type KalcState = {
    kijelzes: string;
    elozo: string | null;
    operator: string | null;
    ujSzamVarando: boolean;
};

const KEZDO: KalcState = {
    kijelzes: "0",
    elozo: null,
    operator: null,
    ujSzamVarando: false,
};

// ─── Segéd: számológép logika ───────────────────────────────────────────────

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
    const s = Number.isInteger(n) ? String(n) : n.toPrecision(10).replace(/\.?0+$/, "");
    return s.length > 13 ? n.toExponential(6) : s;
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function KalkulatorModal({ open, onClose }: Props) {
    const [allapot, beallitAllapot] = useState<KalcState>(KEZDO);

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
    }, [open, allapot, onClose]);

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
        <div className="fixed inset-0 z-[999] flex items-center justify-center sm:items-end sm:justify-start sm:p-8 p-4 pointer-events-none">
            
            {/* Backdrop: finom elhomályosítás, események engedélyezése a bezáráshoz */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] transition-opacity pointer-events-auto"
            />

            {/* Kalkulátor Kártya: Nincsenek vastag keretek, tiszta fehér lebegő panel */}
            <div className="relative z-[1000] w-full max-w-[320px] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-left-8 fade-in duration-300 pointer-events-auto">
                
                {/* Fejléc: teljesen egybeolvad a kártyával, nincs szürke csík */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Számológép
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Kijelző: Tágas, tiszta */}
                <div className="px-6 pt-2 pb-6 text-right">
                    <div className="h-5 text-[13px] font-medium text-primary/70 mb-1">
                        {operator && `${allapot.elozo} ${operator}`}
                    </div>
                    <div 
                        className={`font-semibold text-slate-800 tracking-tight break-all ${
                            kijelzes.length > 10 ? "text-3xl" : kijelzes.length > 7 ? "text-4xl" : "text-[44px]"
                        }`}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {kijelzes}
                    </div>
                </div>

                {/* Gombok Rács: Nincs szürke háttér (bg-slate-100 kivéve), csak a gombok maguk adnak formát */}
                <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                    <KalcGomb label="AC" onClick={() => beallitAllapot(KEZDO)} tipus="utility" />
                    <KalcGomb label="+/−" onClick={plusMinuszNyomas} tipus="utility" />
                    <KalcGomb label="%" onClick={szazalekNyomas} tipus="utility" />
                    <KalcGomb label="÷" onClick={() => operatorNyomas("÷")} aktiv={operator === "÷"} tipus="operator" />

                    <KalcGomb label="7" onClick={() => digitNyomas("7")} />
                    <KalcGomb label="8" onClick={() => digitNyomas("8")} />
                    <KalcGomb label="9" onClick={() => digitNyomas("9")} />
                    <KalcGomb label="×" onClick={() => operatorNyomas("×")} aktiv={operator === "×"} tipus="operator" />

                    <KalcGomb label="4" onClick={() => digitNyomas("4")} />
                    <KalcGomb label="5" onClick={() => digitNyomas("5")} />
                    <KalcGomb label="6" onClick={() => digitNyomas("6")} />
                    <KalcGomb label="−" onClick={() => operatorNyomas("−")} aktiv={operator === "−"} tipus="operator" />

                    <KalcGomb label="1" onClick={() => digitNyomas("1")} />
                    <KalcGomb label="2" onClick={() => digitNyomas("2")} />
                    <KalcGomb label="3" onClick={() => digitNyomas("3")} />
                    <KalcGomb label="+" onClick={() => operatorNyomas("+")} aktiv={operator === "+"} tipus="operator" />

                    <KalcGomb label="0" onClick={() => digitNyomas("0")} span2 />
                    <KalcGomb label="." onClick={pontNyomas} />
                    <KalcGomb label="=" onClick={egyenloNyomas} tipus="egyenlo" />
                </div>
            </div>
        </div>
    );
}

// ─── Gomb komponens ───────────────────────────────────────────────────────────

function KalcGomb({
    label,
    onClick,
    tipus = "szam",
    aktiv = false,
    span2 = false,
}: {
    label: string;
    onClick: () => void;
    tipus?: "szam" | "operator" | "utility" | "egyenlo";
    aktiv?: boolean;
    span2?: boolean;
}) {
    
    // Nincs border, csak finom háttérszínek és tiszta kerekítések (rounded-xl)
    const baseStyle = "flex items-center justify-center text-[22px] font-medium rounded-xl h-14 transition-all duration-150 active:scale-95";
    
    const styles = {
        szam: "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        utility: "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800",
        operator: aktiv 
            ? "bg-primary text-white shadow-md shadow-primary/20" 
            : "bg-primary/10 text-primary hover:bg-primary/20",
        egyenlo: "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90",
    };

    return (
        <button
            onClick={onClick}
            className={`${baseStyle} ${styles[tipus]} ${span2 ? "col-span-2 aspect-auto" : "aspect-square"}`}
        >
            {label}
        </button>
    );
}
