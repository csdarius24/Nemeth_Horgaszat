"use client";

import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";

import { BrandMark } from "@/components/app/BrandMark";
import { FelhasznaloGomb, type Felhasznalo } from "@/components/app/FelhasznaloMenu";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Keret a halászaton kívüli oldalakhoz (halászat-választó, új halászat).
 * Itt még nincs mit navigálni, ezért nincs oldalsáv: csak egy könnyű felső
 * sáv és középre igazított, keskeny tartalom — a login világához közelebb.
 */
export function ValasztoKeret({
    felhasznalo,
    onKilepes,
    kilepesFolyamatban,
    onHibabejelentes,
    children,
}: {
    felhasznalo: Felhasznalo | null;
    onKilepes: () => void;
    kilepesFolyamatban: boolean;
    onHibabejelentes: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col bg-muted">
            <a
                href="#fo-tartalom"
                className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
                Ugrás a tartalomra
            </a>

            <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 sm:px-6">
                <Link href="/halaszatok" className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    <BrandMark size="sm" />
                </Link>
                <div className="flex items-center gap-1">
                    <IconButton
                        label="Hiba bejelentése"
                        icon={<MessageSquareWarning className="size-4" />}
                        size="icon-sm"
                        onClick={onHibabejelentes}
                    />
                    <FelhasznaloGomb felhasznalo={felhasznalo} onKilepes={onKilepes} kilepesFolyamatban={kilepesFolyamatban} />
                </div>
            </header>

            <main id="fo-tartalom" tabIndex={-1} className="flex-1 px-4 pt-6 pb-12 outline-none sm:px-6 sm:pt-12">
                <div className="mx-auto w-full max-w-xl">{children}</div>
            </main>
        </div>
    );
}
