"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, History, Plus, Search, SearchX, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import { UTOLSO_HALASZAT_KULCS } from "@/components/app/navigacio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

type HalaszatItem = {
    szerepkor: "OWNER" | "ADMIN" | "STAFF";
    halaszat: {
        azonosito: number;
        nev: string;
        slug: string;
        aktiv: boolean;
        letrehozva: string;
    };
};

const SZEREPKOR_CIMKE = { OWNER: "Tulajdonos", ADMIN: "Adminisztrátor", STAFF: "Dolgozó" } as const;
const SZEREPKOR_BADGE = { OWNER: "primary", ADMIN: "info", STAFF: "secondary" } as const;

/** Ennyi halászat fölött jelenik meg a kereső. */
const KERESO_KUSZOB = 5;

function keresztnev(nev: string | null | undefined) {
    const reszek = (nev ?? "").trim().split(/\s+/).filter(Boolean);
    // Magyar névsorrend: „Vezetéknév Keresztnév” → a második tag a keresztnév.
    return reszek.length > 1 ? reszek[1] : reszek[0] ?? null;
}

/**
 * Halászat-választó: belépés után ez az első oldal. Nem dashboard, hanem egy
 * egyszerű, középre igazított lista — válassz vagy hozz létre egy halászatot.
 */
export default function HalaszatListaClient() {
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);
    const [items, setItems] = useState<HalaszatItem[]>([]);
    const [nev, setNev] = useState<string | null>(null);
    const [utolso, setUtolso] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [ujra, setUjra] = useState(0);

    useEffect(() => {
        try { setUtolso(localStorage.getItem(UTOLSO_HALASZAT_KULCS)); } catch {}
        fetch("/api/auth/me", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => setNev(keresztnev(d?.user?.nev)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setHiba(null);
            try {
                const res = await fetch("/api/halaszatok", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (mounted) setHiba(data?.hiba ?? "Nem sikerült betölteni.");
                    return;
                }
                if (mounted) setItems(data?.halaszatok ?? []);
            } catch {
                if (mounted) setHiba("Hálózati hiba.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [ujra]);

    // Legutóbb megnyitott elöl, utána az aktívak, végül név szerint.
    const rendezett = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items
            .filter((x) => !s || x.halaszat.nev.toLowerCase().includes(s) || SZEREPKOR_CIMKE[x.szerepkor].toLowerCase().includes(s))
            .sort((a, b) =>
                Number(String(b.halaszat.azonosito) === utolso) - Number(String(a.halaszat.azonosito) === utolso) ||
                Number(b.halaszat.aktiv) - Number(a.halaszat.aktiv) ||
                a.halaszat.nev.localeCompare(b.halaszat.nev, "hu")
            );
    }, [items, q, utolso]);

    return (
        <div className="grid gap-6">
            <div className="grid gap-1.5 text-center">
                <p className="text-sm font-medium text-primary">{nev ? `Szia, ${nev}!` : "Üdv újra!"}</p>
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                    {items.length === 0 && !loading ? "Kezdjük az első halászattal" : "Válassz halászatot"}
                </h1>
                <p className="text-balance text-muted-foreground">
                    {items.length === 0 && !loading
                        ? "Egy halászat a tavaid, takarmányaid és a csapatod közös tere."
                        : "Melyik halászattal szeretnél most dolgozni?"}
                </p>
            </div>

            {loading ? (
                <Card className="gap-0 divide-y overflow-hidden p-0 sm:p-0" role="status" aria-label="Halászatok betöltése">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-4">
                            <Skeleton className="size-10 rounded-xl" />
                            <div className="grid flex-1 gap-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                    ))}
                </Card>
            ) : hiba ? (
                <ErrorState title="Nem sikerült betölteni a halászatokat" message={hiba} onRetry={() => setUjra((n) => n + 1)} />
            ) : items.length === 0 ? (
                <Card className="items-center gap-0 px-6 py-10 text-center sm:py-12">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                        <Waves className="size-7" />
                    </div>
                    <h2 className="font-heading text-lg font-bold">Még egy halászathoz sem tartozol</h2>
                    <p className="mt-1.5 max-w-sm text-sm text-balance text-muted-foreground">
                        Hozd létre az elsőt — automatikusan te leszel a tulajdonosa, és utána meghívhatod a csapatot.
                    </p>
                    <Button asChild size="lg" className="mt-6">
                        <Link href="/halaszatok/uj">
                            <Plus />
                            Új halászat létrehozása
                        </Link>
                    </Button>
                </Card>
            ) : (
                <Card className="gap-0 overflow-hidden p-0 sm:p-0">
                    {items.length > KERESO_KUSZOB && (
                        <div className="border-b p-3">
                            <InputGroup>
                                <InputGroupInput
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Keresés név vagy szerepkör szerint…"
                                    aria-label="Keresés a halászatok között"
                                />
                                <InputGroupAddon>
                                    <Search />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    )}

                    {rendezett.length === 0 ? (
                        <EmptyState className="border-0 p-8" icon={<SearchX />} title="Nincs találat" description={`Nincs „${q}” nevű halászat.`} />
                    ) : (
                        <ul className="divide-y" aria-label="Halászataim">
                            {rendezett.map(({ szerepkor, halaszat: h }) => {
                                const legutobbi = String(h.azonosito) === utolso;
                                return (
                                    <li key={h.azonosito} className="group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/60 has-[a:focus-visible]:bg-accent/60">
                                        <div
                                            className={cn(
                                                "flex size-10 shrink-0 items-center justify-center rounded-xl font-heading text-base font-bold",
                                                h.aktiv ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                            )}
                                            aria-hidden="true"
                                        >
                                            {h.nev.trim()[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {/* A link „kifeszítve” az egész sort kattinthatóvá teszi. */}
                                            <Link
                                                href={`/halaszatok/${h.azonosito}`}
                                                className="block truncate font-semibold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                                            >
                                                {h.nev}
                                            </Link>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <Badge variant={SZEREPKOR_BADGE[szerepkor]}>{SZEREPKOR_CIMKE[szerepkor]}</Badge>
                                                {!h.aktiv && <Badge variant="warning">Inaktív</Badge>}
                                                {legutobbi && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <History className="size-3.5" aria-hidden="true" />
                                                        Legutóbb megnyitott
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight
                                            className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                                            aria-hidden="true"
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <Link
                        href="/halaszatok/uj"
                        className="flex items-center gap-3 border-t px-4 py-3.5 text-sm font-semibold text-primary transition-colors outline-none hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:underline"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30" aria-hidden="true">
                            <Plus className="size-5" />
                        </span>
                        Új halászat létrehozása
                    </Link>
                </Card>
            )}

            {!loading && !hiba && (
                <p className="text-center text-sm text-balance text-muted-foreground">
                    Nem találod a halászatodat? Kérd meg a tulajdonosát, hogy vegyen fel dolgozónak.
                </p>
            )}
        </div>
    );
}
