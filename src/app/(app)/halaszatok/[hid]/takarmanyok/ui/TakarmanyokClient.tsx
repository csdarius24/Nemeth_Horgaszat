"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Eye,
    EyeOff,
    History,
    MoreHorizontal,
    PackageOpen,
    Plus,
    PlusCircle,
    Search,
    SearchX,
    Trash2,
    TrendingDown,
    Wheat,
} from "lucide-react";
import { Cell, Label, Pie, PieChart } from "recharts";

import { cn } from "@/lib/utils";
import { fmtSzam, GrafikonKartya, VizszintesOszlop } from "@/components/app/grafikonok";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label as FormLabel } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

import { MozgasModal } from "./MozgasModal";
import { MozgasNaploModal } from "./MozgasNaploModal";
import { ALACSONY_KESZLET, fmtMennyiseg, keszletAllapot, szinHex, type Takarmany } from "./takarmany";
import { UjTakarmanyModal } from "./UjTakarmanyModal";

// ─── Készlet-megoszlás fánkdiagram ──────────────────────────────────────────

function MegoszlasFank({ tetelek }: { tetelek: Takarmany[] }) {
    const adat = tetelek.map((t, i) => ({ kulcs: `t${i}`, nev: t.nev, ertek: Number(t.keszlet), fill: szinHex(t.szin) }));
    const config: ChartConfig = Object.fromEntries(adat.map((a) => [a.kulcs, { label: a.nev, color: a.fill }]));
    return (
        <ChartContainer config={config} className="mx-auto aspect-square max-h-60 w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="kulcs" hideLabel />} />
                <Pie data={adat} dataKey="ertek" nameKey="kulcs" innerRadius="58%" strokeWidth={3} paddingAngle={2}>
                    {adat.map((a) => <Cell key={a.kulcs} fill={a.fill} />)}
                    <Label
                        content={({ viewBox }) => {
                            if (!viewBox || !("cx" in viewBox)) return null;
                            return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-heading text-2xl font-bold">
                                        {tetelek.length}
                                    </tspan>
                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                                        takarmány
                                    </tspan>
                                </text>
                            );
                        }}
                    />
                </Pie>
            </PieChart>
        </ChartContainer>
    );
}

// ─── Készlet cella ──────────────────────────────────────────────────────────

function KeszletJelzo({ t }: { t: Takarmany }) {
    const keszlet = Number(t.keszlet);
    const allapot = keszletAllapot(keszlet);
    return (
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
            <span
                className={cn(
                    "font-semibold tabular-nums",
                    allapot === "ures" && "text-destructive",
                    allapot === "alacsony" && "text-warning"
                )}
            >
                {fmtMennyiseg(keszlet, t.egyseg)}
            </span>
            {allapot === "ures" && <Badge variant="danger">Üres</Badge>}
            {allapot === "alacsony" && <Badge variant="warning">Alacsony</Badge>}
        </span>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function TakarmanyokClient({ hid }: { hid: string }) {
    const [takarmanyok, setTakarmanyok] = useState<Takarmany[]>([]);
    const [viewerRole, setViewerRole] = useState<string>("STAFF");
    const [betoltes, setBetoltes] = useState(true);
    const [elsoBetoltes, setElsoBetoltes] = useState(true);
    const [hiba, setHiba] = useState<string | null>(null);

    // UI állapot
    const [inaktivakMutatasa, setInaktivakMutatasa] = useState(false);
    const [q, setQ] = useState("");
    const [ujModalNyitva, setUjModalNyitva] = useState(false);
    const [mozgasCel, setMozgasCel] = useState<{ id: number; tipus: "BEVETEL" | "FELHASZNALVA" } | null>(null);
    const [naploId, setNaploId] = useState<number | null>(null);
    const [torlendo, setTorlendo] = useState<Takarmany | null>(null);
    const [inaktivalando, setInaktivalando] = useState<{ t: Takarmany; uzenet: string } | null>(null);
    const [muveletFut, setMuveletFut] = useState(false);

    const canAdmin = viewerRole === "OWNER" || viewerRole === "ADMIN";

    const betolt = useCallback(async () => {
        setBetoltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok?active=${inaktivakMutatasa ? "0" : "1"}`, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Nem sikerült betölteni a takarmányokat.");
            setTakarmanyok(data.items ?? []);
            setViewerRole(data.viewerRole ?? "STAFF");
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setBetoltes(false);
            setElsoBetoltes(false);
        }
    }, [hid, inaktivakMutatasa]);

    useEffect(() => { void betolt(); }, [betolt]);

    // ─── Műveletek ─────────────────────────────────────────────────────────

    async function aktivValtas(t: Takarmany) {
        setMuveletFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${t.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aktiv: !t.aktiv }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Nem sikerült módosítani.");
            toast.success(t.aktiv ? "Takarmány inaktiválva" : "Takarmány aktiválva", { description: t.nev });
            await betolt();
        } catch (e) {
            toast.error("Hiba", { description: e instanceof Error ? e.message : "Ismeretlen hiba" });
        } finally {
            setMuveletFut(false);
        }
    }

    async function torles(t: Takarmany) {
        setMuveletFut(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/takarmanyok/${t.azonosito}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            setTorlendo(null);
            if (!res.ok) {
                // Ha van már mozgása, nem törölhető — az API inaktiválást ajánl helyette.
                if (data.inaktivalhatjuk) setInaktivalando({ t, uzenet: data.error ?? "Ez a takarmány nem törölhető." });
                else toast.error("Nem sikerült törölni", { description: data.error });
                return;
            }
            toast.success("Takarmány törölve", { description: t.nev });
            await betolt();
        } finally {
            setMuveletFut(false);
        }
    }

    // ─── Származtatott adatok ──────────────────────────────────────────────

    const aktivak = takarmanyok.filter((t) => t.aktiv);
    const osszkeszlet = aktivak.reduce((s, t) => s + Number(t.keszlet), 0);
    const uresDb = aktivak.filter((t) => keszletAllapot(Number(t.keszlet)) === "ures").length;
    const alacsonyDb = aktivak.filter((t) => keszletAllapot(Number(t.keszlet)) === "alacsony").length;

    const keszletesek = useMemo(
        () => takarmanyok.filter((t) => t.aktiv && Number(t.keszlet) > 0).sort((a, b) => Number(b.keszlet) - Number(a.keszlet)),
        [takarmanyok]
    );
    const oszlopAdat = keszletesek.map((t, i) => ({ nev: t.nev, ertek: Number(t.keszlet), kulcs: `t${i}`, fill: szinHex(t.szin) }));
    const oszlopConfig: ChartConfig = Object.fromEntries(oszlopAdat.map((a) => [a.kulcs, { label: a.nev, color: a.fill }]));
    const egysegek = [...new Set(aktivak.map((t) => t.egyseg))];

    const szurt = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? takarmanyok.filter((t) => t.nev.toLowerCase().includes(s) || t.egyseg.toLowerCase().includes(s)) : takarmanyok;
    }, [q, takarmanyok]);

    // ─── Render ────────────────────────────────────────────────────────────

    const fejlec = (
        <PageHeader
            className="mb-0"
            title="Takarmányok"
            description="Takarmánykészlet nyilvántartása: bevétel, felhasználás és a készlet követése."
            actions={canAdmin && (
                <Button onClick={() => setUjModalNyitva(true)}>
                    <Plus />
                    Új takarmány
                </Button>
            )}
        />
    );

    if (elsoBetoltes) {
        return (
            <div className="grid gap-6" role="status" aria-label="Takarmányok betöltése">
                {fejlec}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
                </div>
                <Skeleton className="h-80 rounded-2xl" />
            </div>
        );
    }

    const muveletMenu = (t: Takarmany) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Műveletek: ${t.nev}`} disabled={muveletFut}>
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setNaploId(t.azonosito)}>
                    <History />
                    Mozgásnapló
                </DropdownMenuItem>
                {canAdmin && (
                    <>
                        <DropdownMenuItem onSelect={() => setMozgasCel({ id: t.azonosito, tipus: "BEVETEL" })}>
                            <PlusCircle />
                            Bevétel rögzítése
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMozgasCel({ id: t.azonosito, tipus: "FELHASZNALVA" })}>
                            <TrendingDown />
                            Felhasználás rögzítése
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => void aktivValtas(t)}>
                            {t.aktiv ? <EyeOff /> : <Eye />}
                            {t.aktiv ? "Inaktiválás" : "Aktiválás"}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setTorlendo(t)}>
                            <Trash2 />
                            Törlés
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            {fejlec}

            {hiba && <ErrorState title="Nem sikerült betölteni a takarmányokat" message={hiba} onRetry={() => betolt()} />}

            {/* KPI-k */}
            <StatGrid className="xl:grid-cols-4">
                <StatCard cim="Takarmányfajták" ertek={aktivak.length} alcim="aktív típus" ikon={Wheat} />
                <StatCard
                    cim="Összkészlet"
                    ertek={fmtSzam(osszkeszlet)}
                    alcim={egysegek.length === 0 ? "nincs készlet" : egysegek.length === 1 ? egysegek[0] : "vegyes mértékegység"}
                    ikon={PackageOpen}
                    tonus="success"
                />
                <StatCard
                    cim="Üres készlet"
                    ertek={uresDb}
                    alcim="feltöltésre vár"
                    ikon={AlertTriangle}
                    tonus={uresDb > 0 ? "danger" : "success"}
                />
                <StatCard
                    cim="Alacsony készlet"
                    ertek={alacsonyDb}
                    alcim={`${ALACSONY_KESZLET} egység alatt`}
                    ikon={TrendingDown}
                    tonus={alacsonyDb > 0 ? "warning" : "success"}
                />
            </StatGrid>

            {/* Grafikonok */}
            {keszletesek.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <GrafikonKartya cim="Készlet takarmányonként" leiras="Aktív takarmányok, saját mértékegységben">
                        <VizszintesOszlop adat={oszlopAdat} config={oszlopConfig} mertekegyseg="" />
                    </GrafikonKartya>
                    <GrafikonKartya cim="Készlet megoszlása" leiras="Arány az összkészletből">
                        <MegoszlasFank tetelek={keszletesek} />
                    </GrafikonKartya>
                </div>
            )}

            {/* Lista */}
            <Card>
                <CardHeader>
                    <CardTitle>Takarmánylista</CardTitle>
                    <CardDescription>
                        {canAdmin ? "Bevételt, felhasználást a sor menüjéből rögzíthetsz." : "A készletmozgásokat a sor menüjéből nézheted meg."}
                    </CardDescription>
                    <CardAction className="flex items-center gap-2">
                        <Switch
                            id="inaktivak"
                            checked={inaktivakMutatasa}
                            onCheckedChange={setInaktivakMutatasa}
                        />
                        <FormLabel htmlFor="inaktivak" className="text-sm font-normal text-muted-foreground">
                            Inaktívak is
                        </FormLabel>
                    </CardAction>
                </CardHeader>
                <CardContent className={cn("grid gap-3", betoltes && "opacity-60")} aria-busy={betoltes}>
                    {takarmanyok.length > 0 && (
                        <InputGroup className="sm:max-w-xs">
                            <InputGroupInput
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Keresés név vagy egység szerint…"
                                aria-label="Keresés a takarmányok között"
                            />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                        </InputGroup>
                    )}

                    {takarmanyok.length === 0 ? (
                        <EmptyState
                            className="p-6 md:p-10"
                            icon={<Wheat />}
                            title="Nincs takarmány rögzítve"
                            description={canAdmin ? "Vedd fel az első takarmányt, aztán rögzítsd a bevételt." : "Takarmányt tulajdonos vagy adminisztrátor vehet fel."}
                            action={canAdmin && (
                                <Button onClick={() => setUjModalNyitva(true)}>
                                    <Plus />
                                    Új takarmány
                                </Button>
                            )}
                        />
                    ) : szurt.length === 0 ? (
                        <EmptyState className="p-6" icon={<SearchX />} title="Nincs találat" description={`Nincs „${q}” nevű takarmány.`} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Takarmány</TableHead>
                                    <TableHead className="hidden sm:table-cell">Egység</TableHead>
                                    <TableHead className="text-right">Készlet</TableHead>
                                    <TableHead className="hidden md:table-cell">Állapot</TableHead>
                                    <TableHead className="w-0"><span className="sr-only">Műveletek</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {szurt.map((t) => (
                                    <TableRow key={t.azonosito} className={cn(!t.aktiv && "opacity-60")}>
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => setNaploId(t.azonosito)}
                                                className="flex items-center gap-2.5 rounded-sm text-left font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <span className="size-2.5 shrink-0 rounded-full" style={{ background: szinHex(t.szin) }} aria-hidden="true" />
                                                {t.nev}
                                            </button>
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground sm:table-cell">{t.egyseg}</TableCell>
                                        <TableCell className="text-right"><KeszletJelzo t={t} /></TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant={t.aktiv ? "success" : "secondary"}>{t.aktiv ? "Aktív" : "Inaktív"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {canAdmin && t.aktiv && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="hidden sm:inline-flex"
                                                        onClick={() => setMozgasCel({ id: t.azonosito, tipus: "BEVETEL" })}
                                                    >
                                                        <PlusCircle />
                                                        Mozgás
                                                    </Button>
                                                )}
                                                {muveletMenu(t)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modálok */}
            {canAdmin && (
                <UjTakarmanyModal hid={hid} open={ujModalNyitva} onOpenChange={setUjModalNyitva} onLetrehozva={() => void betolt()} />
            )}
            <MozgasModal
                hid={hid}
                takarmany={takarmanyok.find((t) => t.azonosito === mozgasCel?.id) ?? null}
                kezdoTipus={mozgasCel?.tipus}
                onOpenChange={(v) => !v && setMozgasCel(null)}
                onMentve={() => void betolt()}
            />
            <MozgasNaploModal
                hid={hid}
                takarmany={takarmanyok.find((t) => t.azonosito === naploId) ?? null}
                onOpenChange={(v) => !v && setNaploId(null)}
            />

            <ConfirmDialog
                open={torlendo != null}
                onOpenChange={(v) => !v && setTorlendo(null)}
                title={`Törlöd: „${torlendo?.nev ?? ""}”?`}
                description="A takarmány véglegesen törlődik. Ha már van rögzített mozgása, csak inaktiválni lehet."
                confirmLabel="Törlés"
                destructive
                loading={muveletFut}
                onConfirm={() => { if (torlendo) void torles(torlendo); }}
            />
            <ConfirmDialog
                open={inaktivalando != null}
                onOpenChange={(v) => !v && setInaktivalando(null)}
                title="Nem törölhető"
                description={inaktivalando?.uzenet}
                confirmLabel="Inaktiválás helyette"
                loading={muveletFut}
                onConfirm={async () => {
                    if (!inaktivalando) return;
                    await aktivValtas(inaktivalando.t);
                    setInaktivalando(null);
                }}
            />
        </div>
    );
}
