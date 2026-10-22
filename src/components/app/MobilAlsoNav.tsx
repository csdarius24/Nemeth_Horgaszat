"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { MOBIL_NAV_UTVONALAK, OSSZES_NAV_ELEM, aktivE } from "@/components/app/navigacio";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Mobil alsó navigációs sáv (md alatt): a 4 leggyakoribb modul + „Menü”, ami
 * a teljes oldalsávot nyitja. Hüvelykujjal is kényelmesen elérhető.
 */
export function MobilAlsoNav({ pathname, hid }: { pathname: string; hid: string | null }) {
    const { setOpenMobile, openMobile } = useSidebar();
    if (!hid) return null;

    const base = `/halaszatok/${hid}`;
    const elemek = MOBIL_NAV_UTVONALAK.map((u) => OSSZES_NAV_ELEM.find((e) => e.utvonal === u)!).filter(Boolean);

    const elemOsztaly =
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-5";

    return (
        <nav
            aria-label="Gyors navigáció"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
        >
            <ul className="flex items-stretch gap-1">
                {elemek.map((elem) => {
                    const aktiv = aktivE(pathname, base, elem.utvonal);
                    return (
                        <li key={elem.utvonal} className="flex flex-1">
                            <Link
                                href={base + elem.utvonal}
                                aria-current={aktiv ? "page" : undefined}
                                className={cn(elemOsztaly, aktiv ? "text-primary" : "hover:text-foreground")}
                            >
                                <span
                                    className={cn(
                                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                                        aktiv && "bg-accent"
                                    )}
                                >
                                    <elem.ikon />
                                </span>
                                <span className="max-w-full truncate">{elem.rovidCimke ?? elem.cimke}</span>
                            </Link>
                        </li>
                    );
                })}
                <li className="flex flex-1">
                    <button
                        type="button"
                        onClick={() => setOpenMobile(true)}
                        aria-expanded={openMobile}
                        className={cn(elemOsztaly, "hover:text-foreground")}
                    >
                        <span className="flex h-7 w-12 items-center justify-center rounded-full">
                            <Menu />
                        </span>
                        <span>Menü</span>
                    </button>
                </li>
            </ul>
        </nav>
    );
}
