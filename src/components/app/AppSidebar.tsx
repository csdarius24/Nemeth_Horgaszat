"use client";

import Link from "next/link";

import { FelhasznaloMenu, type Felhasznalo } from "@/components/app/FelhasznaloMenu";
import { HalaszatValaszto, type HalaszatRovid } from "@/components/app/HalaszatValaszto";
import { HALASZAT_NAV, aktivE } from "@/components/app/navigacio";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({
    pathname,
    hid,
    halaszatok,
    felhasznalo,
    onKilepes,
    kilepesFolyamatban,
}: {
    pathname: string;
    hid: string | null;
    halaszatok: HalaszatRovid[];
    felhasznalo: Felhasznalo | null;
    onKilepes: () => void;
    kilepesFolyamatban: boolean;
}) {
    const { isMobile, setOpenMobile } = useSidebar();
    const base = hid ? `/halaszatok/${hid}` : "/halaszatok";

    // Mobilon (Sheet) egy menüpont kiválasztása után zárjuk a panelt.
    const zarMobilon = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border">
                <HalaszatValaszto halaszatok={halaszatok} aktivId={hid ? Number(hid) : null} />
            </SidebarHeader>

            <SidebarContent>
                {hid &&
                    HALASZAT_NAV.map((csoport) => (
                        <SidebarGroup key={csoport.cim}>
                            <SidebarGroupLabel>{csoport.cim}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {csoport.elemek.map((elem) => {
                                        const aktiv = aktivE(pathname, base, elem.utvonal);
                                        return (
                                            <SidebarMenuItem key={elem.utvonal}>
                                                <SidebarMenuButton asChild isActive={aktiv} tooltip={elem.cimke}>
                                                    <Link
                                                        href={base + elem.utvonal}
                                                        aria-current={aktiv ? "page" : undefined}
                                                        onClick={zarMobilon}
                                                    >
                                                        <elem.ikon />
                                                        <span>{elem.cimke}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}

            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <FelhasznaloMenu
                    felhasznalo={felhasznalo}
                    onKilepes={onKilepes}
                    kilepesFolyamatban={kilepesFolyamatban}
                />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
