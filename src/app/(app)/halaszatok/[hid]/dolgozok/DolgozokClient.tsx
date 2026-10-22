"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, MoreHorizontal, Plus, Search, SearchX, ShieldCheck, UserMinus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { monogram } from "@/components/app/monogram";
import { HibaAlert } from "@/components/app/urlap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ViewerRole = "OWNER" | "ADMIN" | "STAFF";

type Item = {
    azonosito: number; // HalaszatTagsag id
    szerepkor: ViewerRole;
    aktiv: boolean;
    letrehozva: string;
    felhasznalo: {
        azonosito: number;
        email: string;
        nev: string | null;
        aktiv: boolean;
    };
};

const SZEREPKOR_CIMKE: Record<ViewerRole, string> = { OWNER: "Tulajdonos", ADMIN: "Adminisztrátor", STAFF: "Dolgozó" };
const SZEREPKOR_BADGE: Record<ViewerRole, "primary" | "info" | "secondary"> = { OWNER: "primary", ADMIN: "info", STAFF: "secondary" };

function canManageTarget(viewer: ViewerRole, target: ViewerRole) {
    // OWNER-t senki nem módosít/deaktivál
    if (target === "OWNER") return false;
    if (viewer === "OWNER") return true; // OWNER: ADMIN + STAFF
    if (viewer === "ADMIN") return target === "STAFF"; // ADMIN: csak STAFF
    return false;
}

// ─── Új dolgozó modál ────────────────────────────────────────────────────────

function UjDolgozoModal({ apiBase, viewerRole, open, onOpenChange, onLetrehozva }: {
    apiBase: string;
    viewerRole: ViewerRole;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLetrehozva: (eredmeny: { email: string; tempPassword: string | null }) => void;
}) {
    const [nev, setNev] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
    const [creating, setCreating] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function createWorker(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setHiba(null);
        try {
            const res = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    nev: nev.trim(),
                    role: viewerRole === "ADMIN" ? "STAFF" : role, // ADMIN csak STAFF-ot vehet fel
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return setHiba(data?.error || "Nem sikerült létrehozni.");

            onLetrehozva({ email: email.trim(), tempPassword: data?.tempPassword ? String(data.tempPassword) : null });
            setNev("");
            setEmail("");
            setRole("STAFF");
            onOpenChange(false);
        } catch {
            setHiba("Hálózati hiba.");
        } finally {
            setCreating(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={(v) => { if (!v) setHiba(null); onOpenChange(v); }}
            title="Új dolgozó"
            description="Ha az e-mail címmel még nincs fiók, ideiglenes jelszót generálunk hozzá."
            preventClose={creating}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Mégse</Button>
                    <Button type="submit" form="uj-dolgozo" loading={creating}>Hozzáadás</Button>
                </>
            }
        >
            <form id="uj-dolgozo" onSubmit={createWorker}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="dolgozo-nev">Név (opcionális)</FieldLabel>
                        <Input id="dolgozo-nev" value={nev} onChange={(e) => setNev(e.target.value)} autoComplete="off" disabled={creating} autoFocus />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="dolgozo-email">E-mail cím</FieldLabel>
                        <Input
                            id="dolgozo-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="pelda@email.com"
                            autoComplete="off"
                            disabled={creating}
                            required
                        />
                    </Field>
                    {viewerRole === "OWNER" ? (
                        <FieldSet>
                            <FieldLegend variant="label">Szerepkör</FieldLegend>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                spacing={2}
                                value={role}
                                onValueChange={(v) => v && setRole(v as "ADMIN" | "STAFF")}
                                aria-label="Szerepkör"
                                className="grid w-full grid-cols-2"
                            >
                                <ToggleGroupItem value="STAFF">Dolgozó</ToggleGroupItem>
                                <ToggleGroupItem value="ADMIN">Adminisztrátor</ToggleGroupItem>
                            </ToggleGroup>
                            <FieldDescription>
                                {role === "ADMIN"
                                    ? "Kezelheti a tavakat, takarmányokat, feladatokat és a dolgozókat."
                                    : "Rögzíthet etetést, és a neki kiosztott feladatok státuszát állíthatja."}
                            </FieldDescription>
                        </FieldSet>
                    ) : (
                        <FieldDescription>Adminisztrátorként csak <strong>Dolgozó</strong> szerepkörrel vehetsz fel tagot.</FieldDescription>
                    )}
                    <HibaAlert uzenet={hiba} />
                </FieldGroup>
            </form>
        </Modal>
    );
}

// ─── Ideiglenes jelszó modál ─────────────────────────────────────────────────

function JelszoModal({ adat, onClose }: { adat: { email: string; tempPassword: string } | null; onClose: () => void }) {
    const [masolva, setMasolva] = useState(false);

    async function masolas() {
        if (!adat) return;
        try {
            await navigator.clipboard.writeText(adat.tempPassword);
            setMasolva(true);
            toast.success("Jelszó a vágólapra másolva");
            setTimeout(() => setMasolva(false), 2000);
        } catch {
            toast.error("Nem sikerült másolni", { description: "Jelöld ki és másold kézzel." });
        }
    }

    return (
        <Modal
            open={adat != null}
            onOpenChange={(v) => !v && onClose()}
            title="Dolgozó hozzáadva"
            description={adat?.email}
            size="sm"
            footer={<Button onClick={onClose}>Kész, elmentettem</Button>}
        >
            <div className="grid gap-4">
                <Alert variant="warning">
                    <KeyRound />
                    <AlertTitle>Ideiglenes jelszó</AlertTitle>
                    <AlertDescription>
                        <p>Most másold ki és add át a dolgozónak — később nem jelenik meg újra.</p>
                    </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2">
                    <code className="flex h-11 flex-1 items-center rounded-lg border bg-muted px-3 font-mono text-base tracking-wider select-all">
                        {adat?.tempPassword}
                    </code>
                    <IconButton label={masolva ? "Másolva" : "Másolás"} icon={masolva ? <Check /> : <Copy />} variant="outline" size="icon-lg" onClick={masolas} />
                </div>
            </div>
        </Modal>
    );
}

// ─── Fő komponens ────────────────────────────────────────────────────────────

export default function DolgozokClient({ halaszatId }: { halaszatId: number }) {
    const apiBase = useMemo(() => `/api/halaszatok/${halaszatId}/dolgozok`, [halaszatId]);

    const [items, setItems] = useState<Item[]>([]);
    const [viewerRole, setViewerRole] = useState<ViewerRole>("STAFF"); // fallback
    const [loading, setLoading] = useState(true);
    const [hiba, setHiba] = useState<{ uzenet: string; tiltott: boolean } | null>(null);

    const [q, setQ] = useState("");
    const [ujNyitva, setUjNyitva] = useState(false);
    const [jelszo, setJelszo] = useState<{ email: string; tempPassword: string } | null>(null);
    const [deaktivalando, setDeaktivalando] = useState<Item | null>(null);
    const [muveletFut, setMuveletFut] = useState(false);

    const load = useCallback(async () => {
        setHiba(null);
        try {
            const res = await fetch(apiBase, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba({ uzenet: data?.error || "Hiba a dolgozók lekérésekor.", tiltott: res.status === 403 });
                return;
            }
            setItems(data.items || []);
            if (data.viewerRole === "OWNER" || data.viewerRole === "ADMIN" || data.viewerRole === "STAFF") {
                setViewerRole(data.viewerRole);
            }
        } catch {
            setHiba({ uzenet: "Hálózati hiba.", tiltott: false });
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        if (!Number.isFinite(halaszatId)) return;
        void load();
    }, [halaszatId, load]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((it) => {
            const n = (it.felhasznalo.nev || "").toLowerCase();
            const e = it.felhasznalo.email.toLowerCase();
            const r = SZEREPKOR_CIMKE[it.szerepkor].toLowerCase();
            return n.includes(s) || e.includes(s) || r.includes(s);
        });
    }, [items, q]);

    const stats = useMemo(() => ({
        active: items.filter((x) => x.aktiv).length,
        admins: items.filter((x) => x.aktiv && (x.szerepkor === "ADMIN" || x.szerepkor === "OWNER")).length,
        staff: items.filter((x) => x.aktiv && x.szerepkor === "STAFF").length,
    }), [items]);

    async function updateRole(it: Item, newRole: "ADMIN" | "STAFF") {
        if (newRole === it.szerepkor) return;
        setMuveletFut(true);
        try {
            const res = await fetch(`${apiBase}/${it.azonosito}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.hiba || data?.error || "Nem sikerült módosítani.");
            toast.success("Szerepkör módosítva", { description: `${it.felhasznalo.nev || it.felhasznalo.email}: ${SZEREPKOR_CIMKE[newRole]}` });
            await load();
        } catch (e) {
            toast.error("Nem sikerült módosítani", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setMuveletFut(false);
        }
    }

    async function deactivate(it: Item) {
        setMuveletFut(true);
        try {
            const res = await fetch(`${apiBase}/${it.azonosito}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.hiba || data?.error || "Nem sikerült deaktiválni.");
            toast.success("Dolgozó deaktiválva", { description: it.felhasznalo.nev || it.felhasznalo.email });
            setDeaktivalando(null);
            await load();
        } catch (e) {
            toast.error("Nem sikerült deaktiválni", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setMuveletFut(false);
        }
    }

    const kezelo = viewerRole === "OWNER" || viewerRole === "ADMIN";

    if (hiba?.tiltott) {
        return (
            <div className="grid gap-6">
                <PageHeader className="mb-0" title="Dolgozók" />
                <EmptyState
                    icon={<ShieldCheck />}
                    title="Nincs hozzáférésed"
                    description="A dolgozók listáját tulajdonos vagy adminisztrátor kezelheti."
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Dolgozók"
                description={
                    loading
                        ? "A halászat csapata."
                        : viewerRole === "OWNER"
                            ? "Tulajdonosként adminisztrátorokat és dolgozókat kezelhetsz."
                            : "Adminisztrátorként dolgozókat vehetsz fel és deaktiválhatsz."
                }
                actions={kezelo && (
                    <Button onClick={() => setUjNyitva(true)}>
                        <Plus />
                        Új dolgozó
                    </Button>
                )}
            />

            {hiba && <ErrorState title="Nem sikerült betölteni a dolgozókat" message={hiba.uzenet} onRetry={() => load()} />}

            {loading ? (
                <div className="grid gap-4" role="status" aria-label="Dolgozók betöltése">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            ) : (
                <>
                    <StatGrid className="lg:grid-cols-3">
                        <StatCard cim="Aktív tag" ertek={stats.active} alcim={items.length > stats.active ? `${items.length - stats.active} inaktív` : "a halászatban"} ikon={Users} />
                        <StatCard cim="Vezetők" ertek={stats.admins} alcim="tulajdonos + admin" ikon={ShieldCheck} tonus="info" />
                        <StatCard cim="Dolgozók" ertek={stats.staff} alcim="aktív" ikon={Users} tonus="success" />
                    </StatGrid>

                    <Card>
                        <CardHeader>
                            <CardTitle>Csapat</CardTitle>
                            <CardDescription>Szerepkört és deaktiválást a sor menüjéből érsz el.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {items.length > 0 && (
                                <InputGroup className="sm:max-w-xs">
                                    <InputGroupInput
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Név, e-mail vagy szerepkör…"
                                        aria-label="Keresés a dolgozók között"
                                    />
                                    <InputGroupAddon>
                                        <Search />
                                    </InputGroupAddon>
                                </InputGroup>
                            )}

                            {items.length === 0 ? (
                                <EmptyState className="p-6" icon={<Users />} title="Még nincs dolgozó" description="Vedd fel a csapat tagjait e-mail cím alapján." />
                            ) : filtered.length === 0 ? (
                                <EmptyState className="p-6" icon={<SearchX />} title="Nincs találat" description={`Nincs „${q}” keresésnek megfelelő tag.`} />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Név</TableHead>
                                            <TableHead>Szerepkör</TableHead>
                                            <TableHead className="hidden md:table-cell">Állapot</TableHead>
                                            <TableHead className="w-0"><span className="sr-only">Műveletek</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((it) => {
                                            const canManage = canManageTarget(viewerRole, it.szerepkor) && it.aktiv;
                                            const canRoleChange = viewerRole === "OWNER" && it.szerepkor !== "OWNER" && it.aktiv;
                                            const nev = it.felhasznalo.nev || it.felhasznalo.email;
                                            return (
                                                <TableRow key={it.azonosito} className={cn(!it.aktiv && "opacity-60")}>
                                                    <TableCell>
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <Avatar className="size-9">
                                                                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                                                    {monogram(it.felhasznalo.nev || it.felhasznalo.email)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold">{it.felhasznalo.nev || "—"}</p>
                                                                <p className="truncate text-xs text-muted-foreground">{it.felhasznalo.email}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={SZEREPKOR_BADGE[it.szerepkor]}>{SZEREPKOR_CIMKE[it.szerepkor]}</Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <Badge variant={it.aktiv ? "success" : "secondary"}>{it.aktiv ? "Aktív" : "Inaktív"}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {(canManage || canRoleChange) && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon-sm" aria-label={`Műveletek: ${nev}`} disabled={muveletFut}>
                                                                        <MoreHorizontal />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-56">
                                                                    {canRoleChange && (
                                                                        <>
                                                                            <DropdownMenuLabel className="text-xs text-muted-foreground">Szerepkör</DropdownMenuLabel>
                                                                            <DropdownMenuRadioGroup
                                                                                value={it.szerepkor}
                                                                                onValueChange={(v) => void updateRole(it, v as "ADMIN" | "STAFF")}
                                                                            >
                                                                                <DropdownMenuRadioItem value="STAFF">Dolgozó</DropdownMenuRadioItem>
                                                                                <DropdownMenuRadioItem value="ADMIN">Adminisztrátor</DropdownMenuRadioItem>
                                                                            </DropdownMenuRadioGroup>
                                                                            <DropdownMenuSeparator />
                                                                        </>
                                                                    )}
                                                                    {canManage && (
                                                                        <DropdownMenuItem variant="destructive" onSelect={() => setDeaktivalando(it)}>
                                                                            <UserMinus />
                                                                            Deaktiválás
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {kezelo && (
                <UjDolgozoModal
                    apiBase={apiBase}
                    viewerRole={viewerRole}
                    open={ujNyitva}
                    onOpenChange={setUjNyitva}
                    onLetrehozva={({ email, tempPassword }) => {
                        if (tempPassword) setJelszo({ email, tempPassword });
                        else toast.success("Dolgozó hozzáadva", { description: email });
                        void load();
                    }}
                />
            )}
            <JelszoModal adat={jelszo} onClose={() => setJelszo(null)} />
            <ConfirmDialog
                open={deaktivalando != null}
                onOpenChange={(v) => !v && setDeaktivalando(null)}
                title={`Deaktiválod: ${deaktivalando?.felhasznalo.nev || deaktivalando?.felhasznalo.email || ""}?`}
                description="A tag nem fér hozzá többé ehhez a halászathoz. Az általa rögzített adatok megmaradnak."
                confirmLabel="Deaktiválás"
                destructive
                loading={muveletFut}
                onConfirm={() => { if (deaktivalando) void deactivate(deaktivalando); }}
            />
        </div>
    );
}
