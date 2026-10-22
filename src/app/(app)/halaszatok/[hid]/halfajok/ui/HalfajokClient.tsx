"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Fish, MoreHorizontal, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFajSzinek } from "@/components/app/fajSzinek";
import { HibaAlert } from "@/components/app/urlap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

// ─── Típusok ─────────────────────────────────────────────────────────────────

type Halfaj = { azonosito: number; nev: string; aktiv: boolean };
type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

// ─── Név modál (új / átnevezés) ──────────────────────────────────────────────

function NevModal({ hid, cel, onClose, onMentve }: {
    hid: string;
    /** "uj" = új halfaj, Halfaj = átnevezés, null = zárva */
    cel: "uj" | Halfaj | null;
    onClose: () => void;
    onMentve: () => void;
}) {
    const [nev, setNev] = useState("");
    const [fut, setFut] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);
    const uj = cel === "uj";

    useEffect(() => {
        if (!cel) return;
        setNev(cel === "uj" ? "" : cel.nev);
        setHiba(null);
    }, [cel]);

    async function mentes(e: React.FormEvent) {
        e.preventDefault();
        const n = nev.trim();
        if (!n || !cel) return;
        setFut(true);
        setHiba(null);
        try {
            const res = await fetch(
                uj ? `/api/halaszatok/${hid}/halfajok` : `/api/halaszatok/${hid}/halfajok/${(cel as Halfaj).azonosito}`,
                {
                    method: uj ? "POST" : "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nev: n }),
                }
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return setHiba(json?.error ?? "Nem sikerült menteni.");
            toast.success(uj ? "Halfaj hozzáadva" : "Halfaj átnevezve", { description: n });
            onClose();
            onMentve();
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setFut(false);
        }
    }

    return (
        <Modal
            open={cel != null}
            onOpenChange={(v) => !v && onClose()}
            title={uj ? "Új halfaj" : "Halfaj átnevezése"}
            description={uj ? "A halfaj ezután választható telepítésnél és kivételnél." : undefined}
            size="sm"
            preventClose={fut}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={fut}>Mégse</Button>
                    <Button type="submit" form="halfaj-nev" loading={fut} disabled={!nev.trim()}>
                        {uj ? "Hozzáadás" : "Mentés"}
                    </Button>
                </>
            }
        >
            <form id="halfaj-nev" onSubmit={mentes}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="halfaj-nev-input">Név</FieldLabel>
                        <Input
                            id="halfaj-nev-input"
                            value={nev}
                            onChange={(e) => setNev(e.target.value)}
                            placeholder="pl. Ponty, Amur, Németh Hybrid 1"
                            disabled={fut}
                            required
                            autoFocus
                        />
                    </Field>
                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}

// ─── Fő komponens ─────────────────────────────────────────────────────────────

export default function HalfajokClient({ hid }: { hid: string }) {
    const [loading, setLoading] = useState(true);
    const [elsoBetoltes, setElsoBetoltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    const [viewerRole, setViewerRole] = useState<ViewerRole>("STAFF");
    const canEdit = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const [items, setItems] = useState<Halfaj[]>([]);
    const [q, setQ] = useState("");
    const [inaktivakMutatasa, setInaktivakMutatasa] = useState(false);

    const [nevCel, setNevCel] = useState<"uj" | Halfaj | null>(null);
    const [torlendo, setTorlendo] = useState<Halfaj | null>(null);
    const [inaktivalando, setInaktivalando] = useState<Halfaj | null>(null);
    const [muveletFut, setMuveletFut] = useState(false);

    // ── Betöltés ──────────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        setHiba(null);
        try {
            const url = `/api/halaszatok/${hid}/halfajok${inaktivakMutatasa ? "?active=0" : ""}`;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Hiba a halfajok lekérésekor.");
            setItems(json?.items ?? []);
            if (json?.viewerRole) setViewerRole(json.viewerRole);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setLoading(false);
            setElsoBetoltes(false);
        }
    }, [hid, inaktivakMutatasa]);

    useEffect(() => { void load(); }, [load]);

    // ── Aktív váltás / törlés ─────────────────────────────────────────────────

    async function aktivValtas(h: Halfaj, ujAktiv = !h.aktiv) {
        setMuveletFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok/${h.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aktiv: ujAktiv }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error ?? "Frissítési hiba.");
            toast.success(ujAktiv ? "Halfaj aktiválva" : "Halfaj inaktiválva", { description: h.nev });
            await load();
        } catch (e) {
            toast.error("Nem sikerült módosítani", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setMuveletFut(false);
        }
    }

    async function torles(h: Halfaj) {
        setMuveletFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/halfajok/${h.azonosito}`, { method: "DELETE" });
            const json = await res.json().catch(() => ({}));
            setTorlendo(null);
            // Ha állományhoz vagy eseményhez kötődik, nem törölhető — inaktiválást ajánlunk.
            if (res.status === 409 && json?.inaktivalhatjuk) {
                setInaktivalando(h);
                return;
            }
            if (!res.ok) throw new Error(json?.error ?? "Törlési hiba.");
            toast.success("Halfaj törölve", { description: h.nev });
            await load();
        } catch (e) {
            toast.error("Nem sikerült törölni", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setMuveletFut(false);
        }
    }

    // ── Szűrés ────────────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? items.filter((h) => h.nev.toLowerCase().includes(s)) : items;
    }, [items, q]);

    const aktivDb = items.filter((x) => x.aktiv).length;
    const fajSzinek = useFajSzinek(hid, items.map((h) => h.nev));

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Halfajok"
                description={
                    elsoBetoltes
                        ? "A halászatban használt halfajok."
                        : `${aktivDb} aktív halfaj${items.length > aktivDb ? ` · ${items.length - aktivDb} inaktív` : ""}`
                }
                actions={canEdit && (
                    <Button onClick={() => setNevCel("uj")}>
                        <Plus />
                        Új halfaj
                    </Button>
                )}
            />

            {hiba && <ErrorState title="Nem sikerült betölteni a halfajokat" message={hiba} onRetry={() => load()} />}

            <Card>
                <CardHeader>
                    <CardTitle>Halfaj lista</CardTitle>
                    <CardDescription>
                        A szín a grafikonokon is ezt a fajt jelöli.
                        {!canEdit && " Halfajt tulajdonos vagy adminisztrátor vehet fel."}
                    </CardDescription>
                    <CardAction className="flex items-center gap-2">
                        <Switch id="inaktiv-halfajok" checked={inaktivakMutatasa} onCheckedChange={setInaktivakMutatasa} />
                        <Label htmlFor="inaktiv-halfajok" className="text-sm font-normal text-muted-foreground">Inaktívak is</Label>
                    </CardAction>
                </CardHeader>
                <CardContent className={cn("grid gap-3", loading && !elsoBetoltes && "opacity-60")} aria-busy={loading}>
                    {items.length > 0 && (
                        <InputGroup className="sm:max-w-xs">
                            <InputGroupInput
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="pl. ponty, amur…"
                                aria-label="Keresés a halfajok között"
                            />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                        </InputGroup>
                    )}

                    {elsoBetoltes ? (
                        <div className="grid gap-2" role="status" aria-label="Halfajok betöltése">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
                        </div>
                    ) : items.length === 0 ? (
                        <EmptyState
                            className="p-6 md:p-10"
                            icon={<Fish />}
                            title="Még nincs halfaj"
                            description="Vegyél fel halfajokat, hogy telepítést és kivételt rögzíthess."
                            action={canEdit && (
                                <Button onClick={() => setNevCel("uj")}>
                                    <Plus />
                                    Új halfaj
                                </Button>
                            )}
                        />
                    ) : filtered.length === 0 ? (
                        <EmptyState className="p-6" icon={<SearchX />} title="Nincs találat" description={`Nincs „${q}” nevű halfaj.`} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Név</TableHead>
                                    <TableHead>Állapot</TableHead>
                                    {canEdit && <TableHead className="w-0"><span className="sr-only">Műveletek</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((h) => (
                                    <TableRow key={h.azonosito} className={cn(!h.aktiv && "opacity-60")}>
                                        <TableCell>
                                            <span className="flex items-center gap-2.5 font-semibold">
                                                <span
                                                    className="size-2.5 shrink-0 rounded-full"
                                                    style={{ background: fajSzinek.get(h.nev)?.szin }}
                                                    aria-hidden="true"
                                                />
                                                {h.nev}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={h.aktiv ? "success" : "secondary"}>{h.aktiv ? "Aktív" : "Inaktív"}</Badge>
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon-sm" aria-label={`Műveletek: ${h.nev}`} disabled={muveletFut}>
                                                            <MoreHorizontal />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onSelect={() => setNevCel(h)}>
                                                            <Pencil />
                                                            Átnevezés
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => void aktivValtas(h)}>
                                                            {h.aktiv ? <EyeOff /> : <Eye />}
                                                            {h.aktiv ? "Inaktiválás" : "Aktiválás"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem variant="destructive" onSelect={() => setTorlendo(h)}>
                                                            <Trash2 />
                                                            Törlés
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {canEdit && <NevModal hid={hid} cel={nevCel} onClose={() => setNevCel(null)} onMentve={() => void load()} />}

            <ConfirmDialog
                open={torlendo != null}
                onOpenChange={(v) => !v && setTorlendo(null)}
                title={`Törlöd: „${torlendo?.nev ?? ""}”?`}
                description="Ha a halfaj állományhoz vagy eseményhez kötődik, nem törölhető — ilyenkor inaktiválást ajánlunk."
                confirmLabel="Törlés"
                destructive
                loading={muveletFut}
                onConfirm={() => { if (torlendo) void torles(torlendo); }}
            />
            <ConfirmDialog
                open={inaktivalando != null}
                onOpenChange={(v) => !v && setInaktivalando(null)}
                title="Nem törölhető"
                description={`„${inaktivalando?.nev ?? ""}” állományhoz vagy eseményhez kötődik. Inaktiválod helyette? Az előzmények megmaradnak, de új műveletnél nem lesz választható.`}
                confirmLabel="Inaktiválás helyette"
                loading={muveletFut}
                onConfirm={async () => {
                    if (!inaktivalando) return;
                    await aktivValtas(inaktivalando, false);
                    setInaktivalando(null);
                }}
            />
        </div>
    );
}
