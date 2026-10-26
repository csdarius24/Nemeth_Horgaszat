"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export type Felhasznalo = { azonosito: number; nev: string | null; email: string };

function monogram(f: Felhasznalo | null) {
    const forras = f?.nev?.trim() || f?.email?.trim() || "";
    const reszek = forras.split(/\s+/).filter(Boolean);
    const betuk = reszek.length > 1 ? reszek[0][0] + reszek[reszek.length - 1][0] : forras.slice(0, 1);
    return betuk.toUpperCase() || "?";
}

function FelhasznaloFej({ felhasznalo }: { felhasznalo: Felhasznalo | null }) {
    return (
        <>
            <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    {monogram(felhasznalo)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">{felhasznalo?.nev || "Felhasználó"}</span>
                <span className="truncate text-xs text-muted-foreground">{felhasznalo?.email ?? ""}</span>
            </div>
        </>
    );
}

const TEMAK = [
    { ertek: "light", cimke: "Világos", ikon: Sun },
    { ertek: "dark", cimke: "Sötét", ikon: Moon },
    { ertek: "system", cimke: "Rendszer", ikon: Monitor },
] as const;

/** Témaválasztó a felhasználói menüben (világos / sötét / a rendszer beállítása szerint). */
function TemaValaszto() {
    const { theme = "system", setTheme } = useTheme();
    return (
        <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Megjelenés</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                {TEMAK.map(({ ertek, cimke, ikon: Ikon }) => (
                    // Kiválasztás után a menü nyitva marad, hogy az eredmény azonnal látszódjon.
                    <DropdownMenuRadioItem key={ertek} value={ertek} onSelect={(e) => e.preventDefault()}>
                        <Ikon />
                        {cimke}
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </>
    );
}

/** Oldalsáv lábléce: felhasználó + kilépés (shadcn „nav-user” minta). */
export function FelhasznaloMenu({
    felhasznalo,
    onKilepes,
    kilepesFolyamatban,
}: {
    felhasznalo: Felhasznalo | null;
    onKilepes: () => void;
    kilepesFolyamatban: boolean;
}) {
    const { isMobile } = useSidebar();

    const fej = <FelhasznaloFej felhasznalo={felhasznalo} />;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {fej}
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "top" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5">{fej}</div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <TemaValaszto />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            disabled={kilepesFolyamatban}
                            onSelect={onKilepes}
                        >
                            <LogOut />
                            Kilépés
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

/**
 * Kompakt változat oldalsáv nélküli oldalakra (pl. halászat-választó):
 * csak az avatar látszik, a név és a kilépés a lenyíló menüben.
 */
export function FelhasznaloGomb({
    felhasznalo,
    onKilepes,
    kilepesFolyamatban,
}: {
    felhasznalo: Felhasznalo | null;
    onKilepes: () => void;
    kilepesFolyamatban: boolean;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Felhasználói menü" className="rounded-lg">
                    <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                            {monogram(felhasznalo)}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-lg" align="end" sideOffset={6}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <FelhasznaloFej felhasznalo={felhasznalo} />
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <TemaValaszto />
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={kilepesFolyamatban} onSelect={onKilepes}>
                    <LogOut />
                    Kilépés
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
