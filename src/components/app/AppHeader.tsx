"use client";

import Link from "next/link";
import { Calculator, MessageSquareWarning } from "lucide-react";

import { aktualisNavElem } from "@/components/app/navigacio";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { IconButton } from "@/components/ui/icon-button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Felső sáv: oldalsáv-kapcsoló, morzsamenü (halászat → aktuális modul) és
 * gyorsműveletek. Mobilon is látszik, görgetéskor a tetején marad.
 */
export function AppHeader({
    pathname,
    hid,
    halaszatNev,
    onKalkulator,
    onHibabejelentes,
}: {
    pathname: string;
    hid: string | null;
    halaszatNev: string | null;
    onKalkulator: () => void;
    onHibabejelentes: () => void;
}) {
    const base = hid ? `/halaszatok/${hid}` : "/halaszatok";
    const aktualis = hid ? aktualisNavElem(pathname, base) : undefined;
    const melyebb = aktualis && pathname !== base + aktualis.utvonal; // pl. tó részletező

    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4 md:h-16">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />

            <Breadcrumb className="min-w-0 flex-1">
                <BreadcrumbList className="flex-nowrap">
                    {!hid && (
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-semibold">Halászataim</BreadcrumbPage>
                        </BreadcrumbItem>
                    )}

                    {hid && (
                        <>
                            <BreadcrumbItem className="hidden min-w-0 md:inline-flex">
                                <BreadcrumbLink asChild className="truncate">
                                    <Link href={base}>{halaszatNev ?? "Halászat"}</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            {aktualis && <BreadcrumbSeparator className="hidden md:block" />}
                            {aktualis && (
                                <BreadcrumbItem className="min-w-0">
                                    {melyebb ? (
                                        <BreadcrumbLink asChild className="truncate">
                                            <Link href={base + aktualis.utvonal}>{aktualis.cimke}</Link>
                                        </BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage className="truncate font-semibold">{aktualis.cimke}</BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                            )}
                            {melyebb && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="font-semibold">Részletek</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </>
                    )}
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-1">
                <IconButton label="Számológép" icon={<Calculator className="size-4" />} size="icon-sm" onClick={onKalkulator} />
                <IconButton label="Hiba bejelentése" icon={<MessageSquareWarning className="size-4" />} size="icon-sm" onClick={onHibabejelentes} />
            </div>
        </header>
    );
}
