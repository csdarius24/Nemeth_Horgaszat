"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import HibabejelentesModal from "@/components/HibabejelentesModal";
import { AppHeader } from "@/components/app/AppHeader";
import { AppSidebar } from "@/components/app/AppSidebar";
import type { Felhasznalo } from "@/components/app/FelhasznaloMenu";
import type { HalaszatRovid } from "@/components/app/HalaszatValaszto";
import { KalkulatorPanel } from "@/components/app/KalkulatorPanel";
import { MobilAlsoNav } from "@/components/app/MobilAlsoNav";
import { halaszatIdUtvonalbol, UTOLSO_HALASZAT_KULCS } from "@/components/app/navigacio";
import { ValasztoKeret } from "@/components/app/ValasztoKeret";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type HalaszatListaValasz = {
    halaszatok?: { szerepkor: string; halaszat: { azonosito: number; nev: string } }[];
};

/**
 * Az alkalmazás kerete (shadcn Sidebar):
 *  - asztali nézet: összecsukható oldalsáv (ikon-módra, `Ctrl/⌘+B`), az állapot sütiben marad,
 *  - mobil: az oldalsáv kihúzható panel (Sheet) + alsó navigációs sáv,
 *  - felül: morzsamenü és gyorsműveletek.
 */
export default function AppShell({
    children,
    sidebarAlapNyitva = true,
}: {
    children: React.ReactNode;
    sidebarAlapNyitva?: boolean;
}) {
    const pathname = usePathname() ?? "";
    const router = useRouter();

    const [me, setMe] = useState<Felhasznalo | null>(null);
    const [halaszatok, setHalaszatok] = useState<HalaszatRovid[]>([]);
    const [loggingOut, setLoggingOut] = useState(false);
    const [hibaModalNyitva, setHibaModalNyitva] = useState(false);
    const [kalkulatorNyitva, setKalkulatorNyitva] = useState(false);

    const hid = halaszatIdUtvonalbol(pathname);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!mounted) return;
                setMe(data?.user ?? null);
            } catch {}
        })();
        return () => { mounted = false; };
    }, []);

    // A halászat-váltóhoz és a morzsamenühöz (halászat neve). Új halászat
    // létrehozása után a pathname változik, ezért arra frissítünk.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch("/api/halaszatok", { cache: "no-store" });
                const data: HalaszatListaValasz = await res.json().catch(() => ({}));
                if (!mounted || !res.ok) return;
                setHalaszatok(
                    (data.halaszatok ?? []).map((t) => ({
                        azonosito: t.halaszat.azonosito,
                        nev: t.halaszat.nev,
                        szerepkor: t.szerepkor,
                    }))
                );
            } catch {}
        })();
        return () => { mounted = false; };
    }, [hid]);

    async function logout() {
        setLoggingOut(true);
        try { await fetch("/api/auth/logout", { method: "POST" }); }
        finally {
            setLoggingOut(false);
            router.push("/login");
            router.refresh();
        }
    }

    // A választó oldal ezzel emeli előre a legutóbb megnyitott halászatot.
    useEffect(() => {
        if (!hid) return;
        try { localStorage.setItem(UTOLSO_HALASZAT_KULCS, hid); } catch {}
    }, [hid]);

    const halaszatNev = halaszatok.find((h) => String(h.azonosito) === hid)?.nev ?? null;

    const hibaModal = (
        <HibabejelentesModal
            open={hibaModalNyitva}
            onClose={() => setHibaModalNyitva(false)}
            felhasznaloId={me?.azonosito ?? null}
            halaszatId={hid ? Number(hid) : null}
        />
    );

    // Halászaton kívül (választó, új halászat) nincs mit navigálni: oldalsáv nélküli keret.
    if (!hid) {
        return (
            <ValasztoKeret
                felhasznalo={me}
                onKilepes={logout}
                kilepesFolyamatban={loggingOut}
                onHibabejelentes={() => setHibaModalNyitva(true)}
            >
                {children}
                {hibaModal}
            </ValasztoKeret>
        );
    }

    return (
        <SidebarProvider defaultOpen={sidebarAlapNyitva}>
            <a
                href="#fo-tartalom"
                className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
                Ugrás a tartalomra
            </a>

            <AppSidebar
                pathname={pathname}
                hid={hid}
                halaszatok={halaszatok}
                felhasznalo={me}
                onKilepes={logout}
                kilepesFolyamatban={loggingOut}
            />

            <SidebarInset className="min-w-0">
                <AppHeader
                    pathname={pathname}
                    hid={hid}
                    halaszatNev={halaszatNev}
                    onKalkulator={() => setKalkulatorNyitva((n) => !n)}
                    onHibabejelentes={() => setHibaModalNyitva(true)}
                />

                <main
                    id="fo-tartalom"
                    tabIndex={-1}
                    className={`flex-1 px-4 py-5 outline-none sm:px-6 sm:py-6 lg:px-8 ${hid ? "pb-24 md:pb-8" : ""}`}
                >
                    <div className="mx-auto w-full max-w-[1400px]">{children}</div>
                </main>
            </SidebarInset>

            <MobilAlsoNav pathname={pathname} hid={hid} />

            <KalkulatorPanel open={kalkulatorNyitva} onClose={() => setKalkulatorNyitva(false)} />
            {hibaModal}
        </SidebarProvider>
    );
}
