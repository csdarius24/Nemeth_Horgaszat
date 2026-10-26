"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";

import { ARCULAT, ArculatKep } from "@/components/app/BrandMark";
import { MobilLap } from "@/components/app/MobilLap";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export type HalaszatRovid = { azonosito: number; nev: string; szerepkor?: string };

const SZEREPKOR_CIMKE: Record<string, string> = {
    OWNER: "Tulajdonos",
    ADMIN: "Adminisztrátor",
    STAFF: "Dolgozó",
};

/**
 * Oldalsáv fejléce: logó + az aktuális halászat, legördülő listával a
 * halászatok közötti váltáshoz (shadcn „team switcher” minta).
 */
export function HalaszatValaszto({
    halaszatok,
    aktivId,
}: {
    halaszatok: HalaszatRovid[];
    aktivId: number | null;
}) {
    const { isMobile } = useSidebar();
    const aktiv = halaszatok.find((h) => h.azonosito === aktivId);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {/* Logó (kép); összecsukott oldalsávban egyedül ez látszik. Nincs saját
                                lekerekítés/vágás: a sarkok formáját maga a kép adja, így mindig egyezik. */}
                            <span className="flex size-9 shrink-0 items-center justify-center group-data-[collapsible=icon]:size-8">
                                <ArculatKep kep={ARCULAT.logo} alt="" className="size-full" />
                            </span>
                            <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
                                <ArculatKep kep={ARCULAT.nev} alt="Fish App" className="h-5 max-w-full object-contain object-left" />
                                <span className="truncate text-xs text-muted-foreground">
                                    {aktiv?.nev ?? "Válassz halászatot"}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Halászataid</DropdownMenuLabel>
                        {halaszatok.length === 0 && (
                            <DropdownMenuItem disabled>Még nincs halászatod</DropdownMenuItem>
                        )}
                        {halaszatok.map((h) => (
                            <DropdownMenuItem key={h.azonosito} asChild className="gap-2 p-2">
                                <Link href={`/halaszatok/${h.azonosito}`}>
                                    <div className="flex size-6 items-center justify-center rounded-md border bg-muted text-xs font-bold">
                                        {h.nev.trim()[0]?.toUpperCase()}
                                    </div>
                                    <div className="grid min-w-0 flex-1">
                                        <span className="truncate">{h.nev}</span>
                                        {h.szerepkor && (
                                            <span className="text-xs text-muted-foreground">
                                                {SZEREPKOR_CIMKE[h.szerepkor] ?? h.szerepkor}
                                            </span>
                                        )}
                                    </div>
                                    {h.azonosito === aktivId && <Check className="ml-auto text-primary" />}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="gap-2 p-2">
                            <Link href="/halaszatok">
                                <LayoutGrid />
                                Összes halászat
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 p-2">
                            <Link href="/halaszatok/uj">
                                <Plus />
                                Új halászat
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

/**
 * Mobil felső sáv bal oldala: halászat neve (▾) + az aktuális oldal. Koppintásra
 * alulról felcsúszó lapon lehet halászatot váltani.
 */
export function MobilHalaszatValto({
    halaszatok,
    aktivId,
    halaszatNev,
    alcim,
}: {
    halaszatok: HalaszatRovid[];
    aktivId: number | null;
    halaszatNev: string | null;
    alcim?: string;
}) {
    const [nyitva, setNyitva] = useState(false);
    const zar = () => setNyitva(false);
    const sorOsztaly =
        "flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50";

    return (
        <>
            <button
                type="button"
                onClick={() => setNyitva(true)}
                aria-haspopup="dialog"
                aria-expanded={nyitva}
                className="-ml-1 flex min-w-0 flex-col items-start rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                <span className="flex max-w-full items-center gap-1 text-sm font-semibold">
                    <span className="truncate">{halaszatNev ?? "Halászat"}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </span>
                {alcim && <span className="max-w-full truncate text-xs text-muted-foreground">{alcim}</span>}
            </button>

            <MobilLap open={nyitva} onOpenChange={setNyitva} cim="Halászat váltása">
                <ul className="grid gap-0.5">
                    {halaszatok.map((h) => {
                        const aktiv = h.azonosito === aktivId;
                        return (
                            <li key={h.azonosito}>
                                <Link
                                    href={`/halaszatok/${h.azonosito}`}
                                    onClick={zar}
                                    aria-current={aktiv ? "page" : undefined}
                                    className={sorOsztaly}
                                >
                                    <span
                                        className={
                                            aktiv
                                                ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary"
                                                : "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold"
                                        }
                                    >
                                        {h.nev.trim()[0]?.toUpperCase()}
                                    </span>
                                    <span className="grid min-w-0 flex-1">
                                        <span className="truncate font-medium">{h.nev}</span>
                                        {h.szerepkor && (
                                            <span className="text-xs text-muted-foreground">
                                                {SZEREPKOR_CIMKE[h.szerepkor] ?? h.szerepkor}
                                            </span>
                                        )}
                                    </span>
                                    {aktiv && <Check className="size-4 text-primary" aria-hidden="true" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="my-2 h-px bg-border" />
                <div className="grid gap-0.5">
                    <Link href="/halaszatok" onClick={zar} className={sorOsztaly}>
                        <LayoutGrid className="size-4 text-muted-foreground" aria-hidden="true" />
                        Összes halászat
                    </Link>
                    <Link href="/halaszatok/uj" onClick={zar} className={sorOsztaly}>
                        <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
                        Új halászat
                    </Link>
                </div>
            </MobilLap>
        </>
    );
}
