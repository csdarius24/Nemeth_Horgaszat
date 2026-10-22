"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, SearchX, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tudnivalok } from "@/components/app/Tudnivalok";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { FeladatKartya } from "./FeladatKartya";
import type { Feladat, Tag, ToOpcio } from "./feladat";
import { UjFeladatModal } from "./UjFeladatModal";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Valasz = {
    feladatok: Feladat[];
    osszesen: number;
    nyitottDb: number;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

type DolgozoApiTetel = { felhasznalo: { azonosito: number; nev: string | null; email: string } };

/** A Radix Select / ToggleGroup nem enged üres értéket, ezért ez jelöli a „mind” opciót. */
const MIND = "mind";

const SZUROK = [
    { ertek: MIND, cimke: "Összes" },
    { ertek: "UJ", cimke: "Új" },
    { ertek: "FOLYAMATBAN", cimke: "Folyamatban" },
    { ertek: "KESZ", cimke: "Kész" },
    { ertek: "ELHALASZTVA", cimke: "Halasztva" },
] as const;

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function FeladatokClient({ hid }: { hid: string }) {
    const [data, setData] = useState<Valasz | null>(null);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [statusz, setStatusz] = useState<string>(MIND);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [felelos, setFelelos] = useState(MIND);
    const [toId, setToId] = useState(MIND);
    const [modalNyitva, setModalNyitva] = useState(false);

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
            if (statusz !== MIND) p.set("statusz", statusz);
            if (debouncedQ) p.set("q", debouncedQ);
            if (felelos !== MIND) p.set("felelosFelhasznaloId", felelos);
            if (toId !== MIND) p.set("toId", toId);
            const res = await fetch(`/api/halaszatok/${hid}/feladatok?${p}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Betöltési hiba.");
            setData(json);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba.");
        } finally {
            setLoading(false);
        }
    }, [hid, statusz, debouncedQ, felelos, toId]);

    useEffect(() => { void betolt(); }, [betolt]);

    const canManage = data?.viewerRole === "OWNER" || data?.viewerRole === "ADMIN";

    // Tagok + tavak a szűrőkhöz / űrlaphoz (a tagok listája csak ADMIN+-nak érhető el a dolgozók API-n).
    // Csak egyszer kell — a szerepkör nem változik az oldalon.
    const vanAdat = data != null;
    useEffect(() => {
        if (!vanAdat) return;
        (async () => {
            try {
                const [tRes, toRes] = await Promise.all([
                    canManage ? fetch(`/api/halaszatok/${hid}/dolgozok`, { cache: "no-store" }) : Promise.resolve(null),
                    fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" }),
                ]);
                if (tRes) {
                    const tj = await tRes.json().catch(() => ({}));
                    if (tRes.ok && Array.isArray(tj?.items)) {
                        setTagok((tj.items as DolgozoApiTetel[]).map((i) => ({
                            azonosito: i.felhasznalo.azonosito,
                            nev: i.felhasznalo.nev,
                            email: i.felhasznalo.email,
                        })));
                    }
                }
                const toj = await toRes.json().catch(() => ({}));
                if (toRes.ok && Array.isArray(toj?.toak)) {
                    setToak((toj.toak as ToOpcio[]).map((t) => ({ azonosito: t.azonosito, nev: t.nev })));
                }
            } catch { /* opcionális */ }
        })();
    }, [hid, canManage, vanAdat]);

    const feladatok = useMemo(() => data?.feladatok ?? [], [data]);
    const lejartDb = feladatok.filter((f) => f.lejart).length;
    const vanSzuro = !!q || statusz !== MIND || felelos !== MIND || toId !== MIND;

    function szurokTorlese() {
        setQ("");
        setStatusz(MIND);
        setFelelos(MIND);
        setToId(MIND);
    }

    const ujGomb = canManage && (
        <Button onClick={() => setModalNyitva(true)}>
            <Plus />
            Új feladat
        </Button>
    );

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Feladatok"
                description={
                    data ? (
                        <span>
                            {data.osszesen} feladat · {data.nyitottDb} nyitott
                            {lejartDb > 0 && <span className="font-medium text-destructive"> · {lejartDb} lejárt</span>}
                        </span>
                    ) : "Csapat feladatai és határidői."
                }
                actions={ujGomb}
            />

            {/* ── Szűrők ── (minmax(0,1fr): a görgethető chip-sor ne szélesítse az oszlopot) */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <InputGroup>
                        <InputGroupInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Keresés cím vagy leírás szerint…"
                            aria-label="Keresés a feladatok között"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                    {canManage && tagok.length > 0 && (
                        <Select value={felelos} onValueChange={setFelelos}>
                            <SelectTrigger className="w-full md:w-48" aria-label="Felelős">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={MIND}>Minden felelős</SelectItem>
                                {tagok.map((t) => <SelectItem key={t.azonosito} value={String(t.azonosito)}>{t.nev || t.email}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    {toak.length > 0 && (
                        <Select value={toId} onValueChange={setToId}>
                            <SelectTrigger className="w-full md:w-48" aria-label="Vízegység">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={MIND}>Minden vízegység</SelectItem>
                                {toak.map((t) => <SelectItem key={t.azonosito} value={String(t.azonosito)}>{t.nev}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Mobilon vízszintesen görgethető chip-sor */}
                    <ScrollArea className="-mx-4 min-w-0 flex-1 px-4 sm:mx-0 sm:px-0">
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={2}
                            value={statusz}
                            onValueChange={(v) => v && setStatusz(v)}
                            aria-label="Szűrés státusz szerint"
                            className="pb-2 sm:pb-0"
                        >
                            {SZUROK.map((s) => (
                                <ToggleGroupItem key={s.ertek} value={s.ertek} className="px-3">{s.cimke}</ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    {vanSzuro && (
                        <Button variant="ghost" size="sm" onClick={szurokTorlese}>
                            <X />
                            Szűrők törlése
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Lista ── */}
            {loading && !data ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Feladatok betöltése">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                </div>
            ) : hiba ? (
                <ErrorState title="Nem sikerült betölteni a feladatokat" message={hiba} onRetry={() => betolt()} />
            ) : feladatok.length === 0 ? (
                vanSzuro ? (
                    <EmptyState
                        icon={<SearchX />}
                        title="Nincs találat"
                        description="Nincs a szűrőknek megfelelő feladat."
                        action={<Button variant="outline" onClick={szurokTorlese}>Szűrők törlése</Button>}
                    />
                ) : (
                    <EmptyState
                        icon={<ClipboardList />}
                        title="Még nincs feladat"
                        description={canManage ? "Hozz létre feladatot, és oszd ki a csapat egy tagjának." : "Jelenleg nincs neked kiosztott feladat."}
                        action={ujGomb}
                    />
                )
            ) : (
                <div className={cn("grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3", loading && "opacity-60")} aria-busy={loading}>
                    {feladatok.map((f) => (
                        <FeladatKartya key={f.id} f={f} hid={hid} canManage={canManage} onValtozas={() => void betolt()} />
                    ))}
                </div>
            )}

            <Tudnivalok cim="Hogyan működnek a feladatok?">
                <p>
                    A feladatokat tulajdonos vagy adminisztrátor hozza létre és osztja ki; a dolgozó a{" "}
                    <strong>neki kiosztott</strong> feladat státuszát állíthatja (Indítás / Kész). A kiosztás a Halászati
                    naplóba is bekerül.
                </p>
                <p>
                    Még <strong>nincs</strong> push- vagy e-mail-értesítés, ismétlődő feladat és külső naptár-szinkron —
                    ezek tervezettek.
                </p>
            </Tudnivalok>

            {canManage && (
                <UjFeladatModal
                    hid={hid}
                    open={modalNyitva}
                    onOpenChange={setModalNyitva}
                    tagok={tagok}
                    toak={toak}
                    onLetrehozva={() => void betolt()}
                />
            )}
        </div>
    );
}
