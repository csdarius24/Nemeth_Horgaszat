"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete, GripHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";

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

type Pozicio = { x: number; y: number };

const KEZDO: KalcState = {
    kijelzes: "0",
    elozo: null,
    operator: null,
    ujSzamVarando: false,
};

/** Ennyi helyet hagyunk a képernyő széleitől húzáskor. */
const SZEGELY = 8;

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

/** A panelt a látható területen belül tartja. */
function korlatoz(p: Pozicio, panel: HTMLElement): Pozicio {
    const maxX = window.innerWidth - panel.offsetWidth - SZEGELY;
    const maxY = window.innerHeight - panel.offsetHeight - SZEGELY;
    return {
        x: Math.min(Math.max(SZEGELY, p.x), Math.max(SZEGELY, maxX)),
        y: Math.min(Math.max(SZEGELY, p.y), Math.max(SZEGELY, maxY)),
    };
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

const OPERATOR_BILLENTYU: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

/**
 * Lebegő, mozgatható számológép. Nem modális: a háttér nem homályosodik el és
 * használható marad, így a számológép mellett az oldal adatai is olvashatók.
 * A fejlécénél fogva húzható (egérrel és érintéssel is); a pozícióját megjegyzi,
 * amíg az alkalmazás nyitva van.
 */
export function KalkulatorPanel({ open, onClose }: Props) {
    const [allapot, beallitAllapot] = useState<KalcState>(KEZDO);
    // null = alapértelmezett hely (jobb alsó sarok), húzás után abszolút pozíció
    const [pozicio, setPozicio] = useState<Pozicio | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const huzas = useRef<{ dx: number; dy: number } | null>(null);
    const elozoFokusz = useRef<HTMLElement | null>(null);

    // Megnyitáskor a panelre kerül a fókusz (azonnal gépelhető), záráskor visszaadjuk.
    useEffect(() => {
        if (!open) return;
        elozoFokusz.current = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => elozoFokusz.current?.focus?.();
    }, [open]);

    // Ablak átméretezésekor se lógjon ki a képből.
    useEffect(() => {
        if (!open || !pozicio) return;
        const igazit = () => panelRef.current && setPozicio((p) => (p ? korlatoz(p, panelRef.current!) : p));
        window.addEventListener("resize", igazit);
        return () => window.removeEventListener("resize", igazit);
    }, [open, pozicio]);

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
        beallitAllapot((prev) => ({ ...prev, kijelzes: formatKimenet(-parseFloat(prev.kijelzes)) }));
    }, []);

    const szazalekNyomas = useCallback(() => {
        beallitAllapot((prev) => ({ ...prev, kijelzes: formatKimenet(parseFloat(prev.kijelzes) / 100) }));
    }, []);

    /** Billentyűzetes kezelés — csak amíg a számológépen van a fókusz. */
    function onKeyDown(e: React.KeyboardEvent) {
        let kezelt = true;
        if (e.key === "Escape") onClose();
        else if (/^[0-9]$/.test(e.key)) digitNyomas(e.key);
        else if (e.key === "." || e.key === ",") pontNyomas();
        else if (OPERATOR_BILLENTYU[e.key]) operatorNyomas(OPERATOR_BILLENTYU[e.key]);
        else if (e.key === "Enter" || e.key === "=") {
            // Enter egy fókuszált gombon azt a gombot nyomja meg, ne az egyenlőt.
            if (e.key === "Enter" && e.target !== e.currentTarget) return;
            egyenloNyomas();
        } else if (e.key === "Backspace") backspaceNyomas();
        else if (e.key === "Delete") beallitAllapot(KEZDO);
        else kezelt = false;
        if (kezelt) e.preventDefault();
    }

    // ── Húzás (pointer events: egér + érintés) ──────────────────────────────

    function huzasKezdete(e: React.PointerEvent<HTMLDivElement>) {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        const rect = panelRef.current!.getBoundingClientRect();
        huzas.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function huzasMozgas(e: React.PointerEvent<HTMLDivElement>) {
        if (!huzas.current || !panelRef.current) return;
        setPozicio(korlatoz({ x: e.clientX - huzas.current.dx, y: e.clientY - huzas.current.dy }, panelRef.current));
    }

    function huzasVege(e: React.PointerEvent<HTMLDivElement>) {
        huzas.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (!open) return null;

    const { kijelzes, operator } = allapot;

    return (
        <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="kalkulator-cim"
            aria-describedby="kalkulator-sugo"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={pozicio ? { left: pozicio.x, top: pozicio.y } : undefined}
            className={cn(
                "fixed z-50 w-[248px] rounded-2xl border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                !pozicio && "right-4 bottom-24 md:right-6 md:bottom-6"
            )}
        >
            {/* Fejléc = fogantyú */}
            <div
                onPointerDown={huzasKezdete}
                onPointerMove={huzasMozgas}
                onPointerUp={huzasVege}
                onPointerCancel={huzasVege}
                className="flex cursor-grab touch-none items-center gap-2 border-b py-1.5 pr-1.5 pl-3 select-none active:cursor-grabbing"
            >
                <GripHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 id="kalkulator-cim" className="flex-1 font-heading text-sm font-semibold">
                    Számológép
                </h2>
                <IconButton label="Bezárás" icon={<X />} size="icon-xs" onClick={onClose} tooltipSide="top" />
                <p id="kalkulator-sugo" className="sr-only">
                    Billentyűzettel is használható: számok, + − * /, Enter, Backspace, Delete, Esc a bezáráshoz.
                    A fejlécénél fogva mozgatható.
                </p>
            </div>

            {/* Kijelző */}
            <div className="mx-3 mt-3 rounded-lg bg-muted px-3 py-2 text-right">
                <div className="h-4 truncate text-xs font-medium text-muted-foreground tabular-nums">
                    {operator && `${allapot.elozo} ${operator}`}
                </div>
                <output
                    aria-live="polite"
                    className={cn(
                        "block truncate font-heading font-semibold tracking-tight tabular-nums",
                        kijelzes.length > 10 ? "text-xl" : kijelzes.length > 7 ? "text-2xl" : "text-3xl"
                    )}
                >
                    {kijelzes}
                </output>
            </div>

            {/* Gombok */}
            <div className="grid grid-cols-4 gap-1.5 p-3">
                <KalcGomb label="AC" felirat="Törlés" onClick={() => beallitAllapot(KEZDO)} tipus="utility" />
                <KalcGomb label="+/−" felirat="Előjelváltás" onClick={plusMinuszNyomas} tipus="utility" />
                <KalcGomb label="%" felirat="Százalék" onClick={szazalekNyomas} tipus="utility" />
                <KalcGomb label="÷" felirat="Osztás" onClick={() => operatorNyomas("÷")} aktiv={operator === "÷"} tipus="operator" />

                <KalcGomb label="7" onClick={() => digitNyomas("7")} />
                <KalcGomb label="8" onClick={() => digitNyomas("8")} />
                <KalcGomb label="9" onClick={() => digitNyomas("9")} />
                <KalcGomb label="×" felirat="Szorzás" onClick={() => operatorNyomas("×")} aktiv={operator === "×"} tipus="operator" />

                <KalcGomb label="4" onClick={() => digitNyomas("4")} />
                <KalcGomb label="5" onClick={() => digitNyomas("5")} />
                <KalcGomb label="6" onClick={() => digitNyomas("6")} />
                <KalcGomb label="−" felirat="Kivonás" onClick={() => operatorNyomas("−")} aktiv={operator === "−"} tipus="operator" />

                <KalcGomb label="1" onClick={() => digitNyomas("1")} />
                <KalcGomb label="2" onClick={() => digitNyomas("2")} />
                <KalcGomb label="3" onClick={() => digitNyomas("3")} />
                <KalcGomb label="+" felirat="Összeadás" onClick={() => operatorNyomas("+")} aktiv={operator === "+"} tipus="operator" />

                <KalcGomb label="0" onClick={() => digitNyomas("0")} />
                <KalcGomb label="." felirat="Tizedesvessző" onClick={pontNyomas} />
                <KalcGomb label={<Delete className="size-4" />} felirat="Visszatörlés" onClick={backspaceNyomas} />
                <KalcGomb label="=" felirat="Egyenlő" onClick={egyenloNyomas} tipus="egyenlo" />
            </div>
        </div>
    );
}

// ─── Gomb komponens ───────────────────────────────────────────────────────────

function KalcGomb({
    label,
    felirat,
    onClick,
    tipus = "szam",
    aktiv = false,
}: {
    label: React.ReactNode;
    /** Képernyőolvasónak szóló név, ha a felirat egy szimbólum. */
    felirat?: string;
    onClick: () => void;
    tipus?: "szam" | "operator" | "utility" | "egyenlo";
    aktiv?: boolean;
}) {
    const styles = {
        szam: "border bg-background hover:bg-accent",
        utility: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        operator: aktiv
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary hover:bg-primary/15",
        egyenlo: "bg-primary text-primary-foreground hover:bg-primary/90",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={felirat}
            aria-pressed={tipus === "operator" ? aktiv : undefined}
            className={cn(
                "flex h-10 items-center justify-center rounded-lg text-base font-semibold tabular-nums transition-colors outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                styles[tipus]
            )}
        >
            {label}
        </button>
    );
}
