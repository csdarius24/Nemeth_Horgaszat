"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, MessageSquareWarning } from "lucide-react";

import { cn } from "@/lib/utils";
import { MobilLap } from "@/components/app/MobilLap";
import { HALASZAT_NAV, MOBIL_NAV_UTVONALAK, OSSZES_NAV_ELEM, aktivE } from "@/components/app/navigacio";

/**
 * Mobil alsó navigációs sáv (md alatt) — mobilon EZ a navigáció: a 4
 * leggyakoribb modul + „Továbbiak”, ami alulról felcsúszó lapon mutatja a
 * többi modult csoportosítva és a hibabejelentést. (Az oldalsáv mobilon nem nyílik.)
 */
export function MobilAlsoNav({
    pathname,
    hid,
    onHibabejelentes,
}: {
    pathname: string;
    hid: string | null;
    onHibabejelentes: () => void;
}) {
    const [tovabbiNyitva, setTovabbiNyitva] = useState(false);
    if (!hid) return null;

    const base = `/halaszatok/${hid}`;
    const elemek = MOBIL_NAV_UTVONALAK.map((u) => OSSZES_NAV_ELEM.find((e) => e.utvonal === u)!).filter(Boolean);
    const tovabbiCsoportok = HALASZAT_NAV.map((cs) => ({
        ...cs,
        elemek: cs.elemek.filter((e) => !MOBIL_NAV_UTVONALAK.includes(e.utvonal)),
    })).filter((cs) => cs.elemek.length > 0);
    // Ha a „Továbbiak” alatti oldalon vagyunk, az a gomb legyen kiemelve.
    const tovabbiAktiv = tovabbiCsoportok.some((cs) => cs.elemek.some((e) => aktivE(pathname, base, e.utvonal)));

    const elemOsztaly =
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-5";
    const ikonHely = (aktiv: boolean) =>
        cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", aktiv && "bg-accent");
    const csempeOsztaly =
        "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-2 text-center text-xs font-medium transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-5";

    return (
        <>
            <nav
                aria-label="Fő navigáció"
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
                                    <span className={ikonHely(aktiv)}>
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
                            onClick={() => setTovabbiNyitva(true)}
                            aria-haspopup="dialog"
                            aria-expanded={tovabbiNyitva}
                            className={cn(elemOsztaly, tovabbiAktiv ? "text-primary" : "hover:text-foreground")}
                        >
                            <span className={ikonHely(tovabbiAktiv)}>
                                <LayoutGrid />
                            </span>
                            <span>Továbbiak</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <MobilLap open={tovabbiNyitva} onOpenChange={setTovabbiNyitva} cim="Továbbiak">
                <div className="grid gap-4">
                    {tovabbiCsoportok.map((cs) => (
                        <section key={cs.cim} aria-label={cs.cim}>
                            <h3 className="mb-2 text-xs font-medium text-muted-foreground">{cs.cim}</h3>
                            <ul className="grid grid-cols-3 gap-2">
                                {cs.elemek.map((elem) => {
                                    const aktiv = aktivE(pathname, base, elem.utvonal);
                                    return (
                                        <li key={elem.utvonal} className="grid">
                                            <Link
                                                href={base + elem.utvonal}
                                                onClick={() => setTovabbiNyitva(false)}
                                                aria-current={aktiv ? "page" : undefined}
                                                className={cn(
                                                    csempeOsztaly,
                                                    aktiv && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                                )}
                                            >
                                                <elem.ikon aria-hidden="true" />
                                                {elem.cimke}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}

                    <button
                        type="button"
                        onClick={() => {
                            setTovabbiNyitva(false);
                            onHibabejelentes();
                        }}
                        className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <MessageSquareWarning className="size-4" aria-hidden="true" />
                        Hiba bejelentése
                    </button>
                </div>
            </MobilLap>
        </>
    );
}
