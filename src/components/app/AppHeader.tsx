"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, MessageSquareWarning } from "lucide-react";

import { FelhasznaloGomb, type Felhasznalo } from "@/components/app/FelhasznaloMenu";
import { MobilHalaszatValto, type HalaszatRovid } from "@/components/app/HalaszatValaszto";
import { aktualisNavElem } from "@/components/app/navigacio";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Felső sáv, görgetéskor a tetején marad.
 *  - asztali: oldalsáv-kapcsoló, morzsamenü (halászat → modul), gyorsműveletek,
 *  - mobil: „hol vagyok?” — halászat-váltó + aktuális oldal (részletoldalon
 *    vissza gomb), jobbra számológép és profil. A navigáció az alsó sávban van.
 */
export function AppHeader({
    pathname,
    hid,
    halaszatNev,
    halaszatok,
    felhasznalo,
    onKilepes,
    kilepesFolyamatban,
    onKalkulator,
    onHibabejelentes,
}: {
    pathname: string;
    hid: string | null;
    halaszatNev: string | null;
    halaszatok: HalaszatRovid[];
    felhasznalo: Felhasznalo | null;
    onKilepes: () => void;
    kilepesFolyamatban: boolean;
    onKalkulator: () => void;
    onHibabejelentes: () => void;
}) {
    const base = hid ? `/halaszatok/${hid}` : "/halaszatok";
    const aktualis = hid ? aktualisNavElem(pathname, base) : undefined;
    const melyebb = aktualis && pathname !== base + aktualis.utvonal; // pl. tó részletező

    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4 md:h-16">
            <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
            <Separator orientation="vertical" className="mr-1 hidden data-[orientation=vertical]:h-5 md:block" />

            {/* Mobil: hol vagyok? */}
            <div className="flex min-w-0 flex-1 items-center gap-1 md:hidden">
                {melyebb && aktualis && (
                    <Button asChild variant="ghost" size="icon-sm" className="-ml-1 shrink-0">
                        <Link href={base + aktualis.utvonal} aria-label={`Vissza: ${aktualis.cimke}`}>
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                )}
                <MobilHalaszatValto
                    halaszatok={halaszatok}
                    aktivId={hid ? Number(hid) : null}
                    halaszatNev={halaszatNev}
                    alcim={aktualis ? (melyebb ? `${aktualis.cimke} · Részletek` : aktualis.cimke) : undefined}
                />
            </div>

            <Breadcrumb className="hidden min-w-0 flex-1 md:block">
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
                {/* Mobilon a hibabejelentés a „Továbbiak” lapon van, itt a profil a helye. */}
                <IconButton
                    label="Hiba bejelentése"
                    icon={<MessageSquareWarning className="size-4" />}
                    size="icon-sm"
                    onClick={onHibabejelentes}
                    className="hidden md:inline-flex"
                />
                <div className="md:hidden">
                    <FelhasznaloGomb felhasznalo={felhasznalo} onKilepes={onKilepes} kilepesFolyamatban={kilepesFolyamatban} />
                </div>
            </div>
        </header>
    );
}
