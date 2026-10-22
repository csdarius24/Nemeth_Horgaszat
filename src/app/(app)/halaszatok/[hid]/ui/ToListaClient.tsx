"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import { toTipusCimke } from "@/lib/toak/attekintes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

import { UjVizegysegModal } from "../toak/ui/UjVizegysegModal";

type ToItem = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
    letrehozva: string;
};

type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

export default function ToListaClient({
    hid,
    viewerRole,
    onValtozas,
}: {
    hid: string;
    viewerRole: ViewerRole;
    /** Új vízegység után (pl. a dashboard összesítő frissítéséhez). */
    onValtozas?: () => void;
}) {
    const [toak, setToak] = useState<ToItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [modalNyitva, setModalNyitva] = useState(false);

    const canCreate = viewerRole === "OWNER" || viewerRole === "ADMIN";

    async function load() {
        setLoading(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/toak`, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült betölteni a tavakat.");
                return;
            }
            setToak(data?.toak ?? []);
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hid]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return toak;
        return toak.filter((t) => t.nev.toLowerCase().includes(s) || t.tipus.toLowerCase().includes(s));
    }, [q, toak]);

    function ujModal() {
        setModalNyitva(true);
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Vízegységek</CardTitle>
                <CardDescription>Tavak és telelők gyors elérése.</CardDescription>
                {canCreate && (
                    <CardAction>
                        <Button size="sm" onClick={ujModal}>
                            <Plus />
                            Új tó
                        </Button>
                    </CardAction>
                )}
            </CardHeader>

            <CardContent className="grid gap-3">
                {toak.length > 0 && (
                    <InputGroup>
                        <InputGroupInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Keresés tavak között…"
                            aria-label="Keresés tavak között"
                        />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                )}

                {loading ? (
                    <div className="grid gap-2" role="status" aria-label="Tavak betöltése">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                    </div>
                ) : hiba ? (
                    <ErrorState message={hiba} onRetry={() => load()} />
                ) : toak.length === 0 ? (
                    <EmptyState
                        className="p-6 md:p-8"
                        icon={<Waves />}
                        title="Még nincs vízegység"
                        description={canCreate ? "Hozd létre az első tavat vagy telelőt." : "A tavakat tulajdonos vagy adminisztrátor hozhatja létre."}
                        action={canCreate && <Button size="sm" onClick={ujModal}><Plus />Új tó</Button>}
                    />
                ) : filtered.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nincs találat „{q}” keresésre.</p>
                ) : (
                    <ul className="-mx-2 grid gap-1">
                        {filtered.map((t) => (
                            <li key={t.azonosito}>
                                <Link
                                    href={`/halaszatok/${hid}/toak/${t.azonosito}`}
                                    className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Waves className="size-4" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{t.nev}</span>
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span
                                                className={cn("size-1.5 rounded-full", t.aktiv ? "bg-success" : "bg-muted-foreground/50")}
                                                aria-hidden="true"
                                            />
                                            {t.aktiv ? "Aktív" : "Inaktív"}
                                        </span>
                                    </span>
                                    <Badge variant={t.tipus === "TO" ? "secondary" : "info"}>
                                        {toTipusCimke(t.tipus)}
                                    </Badge>
                                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>

            {canCreate && (
                <UjVizegysegModal
                    hid={hid}
                    open={modalNyitva}
                    onOpenChange={setModalNyitva}
                    onLetrehozva={() => {
                        onValtozas?.();
                        void load();
                    }}
                />
            )}
        </Card>
    );
}
