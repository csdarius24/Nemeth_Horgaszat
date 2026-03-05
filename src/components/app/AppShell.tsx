"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function Icon({ name }: { name: "home" | "users" | "fish" | "lake" | "settings" }) {
    const common = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2 };
    switch (name) {
        case "home":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M6 10v10h12V10" />
                </svg>
            );
        case "users":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case "lake":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M3 16c3 0 3-2 6-2s3 2 6 2 3-2 6-2" />
                    <path d="M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2" />
                </svg>
            );
        case "fish":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M22 12s-4-6-10-6S2 12 2 12s4 6 10 6 10-6 10-6Z" />
                    <path d="M2 12l-2-2 2 2-2 2 2-2Z" />
                    <circle cx="9" cy="12" r="1" />
                </svg>
            );
        case "settings":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                    <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04-1.7 1.7-.04-.04A1.8 1.8 0 0 0 16 19.4a1.8 1.8 0 0 0-1 .2l-.06.02V22h-2v-2.38l-.06-.02a1.8 1.8 0 0 0-1-.2 1.8 1.8 0 0 0-1.98.36l-.04.04-1.7-1.7.04-.04A1.8 1.8 0 0 0 4.6 16a1.8 1.8 0 0 0-.2-1l-.02-.06H2v-2h2.38l.02-.06a1.8 1.8 0 0 0 .2-1 1.8 1.8 0 0 0-.36-1.98l-.04-.04 1.7-1.7.04.04A1.8 1.8 0 0 0 8 4.6a1.8 1.8 0 0 0 1-.2l.06-.02V2h2v2.38l.06.02a1.8 1.8 0 0 0 1 .2 1.8 1.8 0 0 0 1.98-.36l.04-.04 1.7 1.7-.04.04A1.8 1.8 0 0 0 19.4 8c.1.33.1.67 0 1l-.02.06H22v2h-2.62l.02.06c.1.33.1.67 0 1Z" />
                </svg>
            );
    }
}

function NavItem({ href, icon, active }: { href: string; icon: React.ReactNode; active: boolean }) {
    return (
        <a
            href={href}
            className="iconbtn"
            style={{
                background: active ? "rgba(255,255,255,0.18)" : undefined,
                borderColor: active ? "rgba(255,255,255,0.24)" : undefined,
            }}
            title={href}
        >
            {icon}
        </a>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const isAuth = pathname?.startsWith("/login") || pathname?.startsWith("/register");
    if (isAuth) return <>{children}</>;

    const isHalaszat = pathname?.startsWith("/halaszatok");
    const hidMatch = pathname?.match(/^\/halaszatok\/(\d+)/);
    const hid = hidMatch?.[1];

    const base = hid ? `/halaszatok/${hid}` : "/halaszatok";

    const [me, setMe] = useState<{ nev: string | null; email: string } | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!mounted) return;
                setMe(data?.user ?? null);
            } catch {
                // ignore
            }
        })();

        return () => {
            mounted = false;
        };
    }, [pathname]);

    async function logout() {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            setLoggingOut(false);
            router.push("/login");
            router.refresh();
        }
    }

    const avatarLetter =
        me?.nev?.trim()?.[0]?.toUpperCase() ??
        me?.email?.trim()?.[0]?.toUpperCase() ??
        "U";

    return (
        <div className="container-app">
            <aside className="sidebar">
                <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
                    <div className="iconbtn" title="Németh Horgászat" style={{ background: "rgba(255,255,255,0.18)" }}>
                        <span style={{ fontWeight: 800 }}>NH</span>
                    </div>

                    <div style={{ height: 10 }} />

                    <NavItem href="/halaszatok" icon={<Icon name="home" />} active={pathname === "/halaszatok"} />
                    <NavItem href={base} icon={<Icon name="lake" />} active={isHalaszat && pathname === base} />

                    {hid && (
                        <>
                            <NavItem href={`${base}/halfajok`} icon={<Icon name="fish" />} active={pathname.includes("/halfajok")} />
                            <NavItem href={`${base}/dolgozok`} icon={<Icon name="users" />} active={pathname.includes("/dolgozok")} />
                        </>
                    )}

                    <div style={{ flex: 1, height: 18 }} />


                </div>
            </aside>

            <main className="main">
                <div className="topbar">
                    <div className="search">
                        <span style={{ opacity: 0.7 }}>⌕</span>
                        <input placeholder="Keresés…" />
                    </div>

                    <div className="spacer" />

                    <button className="iconbtn" title="Gyors művelet">＋</button>
                    <button className="iconbtn" title="Értesítések">!</button>

                    <div
                        className="glass"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 16,
                            minWidth: 240,
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.18)",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 800,
                            }}
                            title="Profil"
                        >
                            {avatarLetter}
                        </div>

                        <div style={{ lineHeight: 1.1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {me?.nev || "Felhasználó"}
                            </div>
                            <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {me?.email || "—"}
                            </div>
                        </div>

                        <div style={{ flex: 1 }} />

                        <button className="btn" onClick={logout} disabled={loggingOut} title="Kilépés">
                            {loggingOut ? "..." : "Kilépés"}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: 18 }}>{children}</div>
            </main>
        </div>
    );
}