"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";

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
                            {/* Összecsukott (ikon) módban a teljes név nem fér ki: rövid felirat. */}
                            <span className="hidden size-4 items-center justify-center font-heading text-[11px] font-extrabold group-data-[collapsible=icon]:flex">
                                FA
                            </span>
                            <div className="grid flex-1 text-left leading-tight">
                                <span className="truncate font-heading font-bold text-foreground">Fish App</span>
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
