"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HibabejelentesModal from "@/components/HibabejelentesModal";
import KalkulatorModal from "@/components/app/KalkulatorModal";

function Icon({ name }: { name: "home" | "users" | "fish" | "lake" | "settings" | "alert" | "calculator" | "calendar" | "wheat" | "hatchery" }) {
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
        case "alert":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.84 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.7 3.84a2 2 0 0 0-3.4 0Z" />
                </svg>
            );
        case "calculator":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <rect x="4" y="2" width="16" height="20" rx="3" />
                    <path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2" />
                </svg>
            );
        case "calendar":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth={2.5} strokeLinecap="round" />
                </svg>
            );
        case "wheat":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <path d="M12 22V12" />
                    <path d="M12 12C12 12 8 10 8 6a4 4 0 0 1 8 0c0 4-4 6-4 6Z" />
                    <path d="M12 12C12 12 8.5 14.5 6 14a3.5 3.5 0 0 1 3-6c2.5.5 3 4 3 4Z" />
                    <path d="M12 12C12 12 15.5 14.5 18 14a3.5 3.5 0 0 0-3-6c-2.5.5-3 4-3 4Z" />
                    <path d="M6 20c1.5-1 4-1.5 6-1s4.5 0 6 1" />
                </svg>
            );
        case "hatchery":
            return (
                <svg {...common} viewBox="0 0 24 24">
                    <ellipse cx="12" cy="13" rx="6" ry="7" />
                    <path d="M12 6C12 6 10 3 12 2s2 4 2 4" />
                    <path d="M9 10c0 1.5 1 3 3 3s3-1.5 3-3" />
                </svg>
            );
    }
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <a
            href={href}
            className={"sidebar-nav-item" + (active ? " sidebar-nav-item--active" : "")}
            title={label}
        >
            <span className="sidebar-nav-icon">{icon}</span>
            <span className="sidebar-nav-label">{label}</span>
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

    const [me, setMe] = useState<{
        azonosito: number;
        nev: string | null;
        email: string;
    } | null>(null);

    const [loggingOut, setLoggingOut] = useState(false);
    const [hibaModalNyitva, setHibaModalNyitva] = useState(false);
    const [kalkulatorNyitva, setKalkulatorNyitva] = useState(false);

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
                <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

                    {/* Brand */}
                    <div style={{ marginBottom: 8 }}>
                        <div className="sidebar-nav-item" style={{ pointerEvents: "none" }}>
                            <span className="sidebar-nav-icon">
                                <div style={{
                                    width: 34, height: 34, borderRadius: 12,
                                    background: "rgba(255,255,255,0.18)",
                                    display: "grid", placeItems: "center",
                                    fontWeight: 800, fontSize: 13,
                                }}>
                                    NH
                                </div>
                            </span>
                            <span className="sidebar-nav-label" style={{ fontWeight: 800, fontSize: 14 }}>
                                Németh Horgászat
                            </span>
                        </div>
                    </div>

                    {/* Fő navigáció */}
                    <NavItem href="/halaszatok" icon={<Icon name="home" />} label="Halászatok" active={pathname === "/halaszatok"} />
                    <NavItem href={base} icon={<Icon name="lake" />} label="Halászat" active={isHalaszat && pathname === base} />

                    {hid && (
                        <>
                            <NavItem href={`${base}/halfajok`}         icon={<Icon name="fish" />}       label="Halfajok"          active={pathname.includes("/halfajok")} />
                            <NavItem href={`${base}/takarmanyok`}      icon={<Icon name="wheat" />}      label="Takarmányok"       active={pathname.includes("/takarmanyok")} />
                            <NavItem href={`${base}/halkeltes`}        icon={<Icon name="hatchery" />}   label="Halkeltetés"       active={pathname.includes("/halkeltes")} />
                            <NavItem href={`${base}/dolgozok`}         icon={<Icon name="users" />}      label="Dolgozók"          active={pathname.includes("/dolgozok")} />
                            <NavItem href={`${base}/naptar`}           icon={<Icon name="calendar" />}   label="Naptár"            active={pathname.includes("/naptar")} />
                            <NavItem href={`${base}/hibabejelentesek`} icon={<Icon name="alert" />}      label="Hibabejelentések"  active={pathname.includes("/hibabejelentesek")} />
                        </>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Számológép */}
                    <button
                        className={"sidebar-nav-item" + (kalkulatorNyitva ? " sidebar-nav-item--active" : "")}
                        title="Számológép"
                        onClick={() => setKalkulatorNyitva((v) => !v)}
                        style={{
                            background: kalkulatorNyitva ? "rgba(208,138,91,0.22)" : undefined,
                            borderColor: kalkulatorNyitva ? "rgba(208,138,91,0.55)" : undefined,
                            color: kalkulatorNyitva ? "#d08a5b" : undefined,
                        }}
                    >
                        <span className="sidebar-nav-icon"><Icon name="calculator" /></span>
                        <span className="sidebar-nav-label">Számológép</span>
                    </button>

                </div>
            </aside>

            <KalkulatorModal
                open={kalkulatorNyitva}
                onClose={() => setKalkulatorNyitva(false)}
            />

            <main className="main">
                <div className="topbar">
                    <div className="search">
                        <span style={{ opacity: 0.7 }}>⌕</span>
                        <input placeholder="Keresés…" />
                    </div>

                    <div className="spacer" />

                    <button className="iconbtn" title="Gyors művelet">＋</button>
                    <button
                        className="iconbtn"
                        title="Hibabejelentés"
                        onClick={() => setHibaModalNyitva(true)}
                    >
                        !
                    </button>

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

                <HibabejelentesModal
                    open={hibaModalNyitva}
                    onClose={() => setHibaModalNyitva(false)}
                    felhasznaloId={me?.azonosito ?? null}
                    halaszatId={hid ? Number(hid) : null}
                />
            </main>
        </div>
    );
}