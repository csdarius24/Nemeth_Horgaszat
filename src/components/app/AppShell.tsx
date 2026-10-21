"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HibabejelentesModal from "@/components/HibabejelentesModal";
import KalkulatorModal from "@/components/app/KalkulatorModal";
import { Input } from "@/components/ui/Input";
import { 
    Home, Users, Fish, Map, AlertCircle, 
    Calculator, Calendar, Wheat, Droplets, Book, CheckSquare, 
    Search, Plus, LogOut, ChevronLeft, ChevronRight, Menu
} from "lucide-react";

// NavItem: Világos témához igazítva, keretek nélkül, puha hover effekttel
function NavItem({ href, icon, label, active, collapsed }: { href: string; icon: React.ReactNode; label: string; active: boolean; collapsed: boolean }) {
    return (
        <a
            href={href}
            title={label}
            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${
                active 
                ? "bg-primary/10 text-primary" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            } ${collapsed ? "justify-center px-0" : ""}`}
        >
            <span className={`flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 shrink-0 transition-transform duration-200 ${
                active ? "scale-110" : "group-hover:scale-110"
            }`}>
                {icon}
            </span>
            <span className={`truncate ${collapsed ? "hidden" : "block"}`}>{label}</span>
        </a>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [me, setMe] = useState<{ azonosito: number; nev: string | null; email: string; } | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);
    const [hibaModalNyitva, setHibaModalNyitva] = useState(false);
    const [kalkulatorNyitva, setKalkulatorNyitva] = useState(false);
    
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const isHalaszat = pathname?.startsWith("/halaszatok");
    const hidMatch = pathname?.match(/^\/halaszatok\/(\d+)/);
    const hid = hidMatch?.[1];
    const base = hid ? `/halaszatok/${hid}` : "/halaszatok";

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
    }, [pathname]);

    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

    async function logout() {
        setLoggingOut(true);
        try { await fetch("/api/auth/logout", { method: "POST" }); } 
        finally {
            setLoggingOut(false);
            router.push("/login");
            router.refresh();
        }
    }

    const avatarLetter = me?.nev?.trim()?.[0]?.toUpperCase() ?? me?.email?.trim()?.[0]?.toUpperCase() ?? "U";
    const sidebarWidth = isSidebarCollapsed ? "lg:w-[100px]" : "lg:w-[320px]";

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-foreground">
            
            {/* 1. OLDALSÁV (Világos, tiszta fehér háttérrel) */}
            <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out lg:relative flex flex-col overflow-hidden ${sidebarWidth} ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                
                {/* Fejléc / Logó */}
                <div className={`relative z-10 flex items-center h-28 shrink-0 border-b border-slate-100 transition-all ${isSidebarCollapsed ? "justify-center" : "justify-between px-8"}`}>
                    
                    <div className={`flex items-center gap-3.5 ${isSidebarCollapsed ? "hidden" : "flex"}`}>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.2)] shrink-0">
                            <Fish className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight text-foreground truncate">
                            Fish App
                        </span>
                    </div>

                    {isSidebarCollapsed && (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.2)] shrink-0 mx-auto">
                            <Fish className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Összecsukó gomb */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 ${isSidebarCollapsed ? "absolute -right-4 top-10 bg-white z-50 shadow-sm" : ""}`}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Navigáció */}
                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-2 custom-scrollbar">
                    <NavItem href="/halaszatok" icon={<Home />} label="Kezdőlap" active={pathname === "/halaszatok"} collapsed={isSidebarCollapsed} />
                    
                    {hid && (
                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <div className={`px-4 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest truncate ${isSidebarCollapsed ? "text-center px-0" : ""}`}>
                                {isSidebarCollapsed ? "Akt." : "Aktuális Halászat"}
                            </div>
                            <div className="space-y-1.5">
                                <NavItem href={base}                      icon={<Map />}           label="Áttekintés"        active={pathname === base} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/toak`}            icon={<Map />}           label="Tavak és telelők"  active={/\/toak\/?$/.test(pathname ?? "")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/halfajok`}         icon={<Fish />}          label="Halfajok"          active={pathname.includes("/halfajok")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/takarmanyok`}      icon={<Wheat />}         label="Takarmányok"       active={pathname.includes("/takarmanyok")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/halkeltes`}        icon={<Droplets />}      label="Halkeltetés"       active={pathname.includes("/halkeltes")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/dolgozok`}         icon={<Users />}         label="Dolgozók"          active={pathname.includes("/dolgozok")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/feladatok`}        icon={<CheckSquare />}   label="Feladatok"         active={pathname.includes("/feladatok")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/naplo`}            icon={<Book />}          label="Halászati napló"   active={pathname.includes("/naplo")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/naptar`}           icon={<Calendar />}      label="Naptár"            active={pathname.includes("/naptar")} collapsed={isSidebarCollapsed} />
                                <NavItem href={`${base}/hibabejelentesek`} icon={<AlertCircle />}   label="Hibabejelentések"  active={pathname.includes("/hibabejelentesek")} collapsed={isSidebarCollapsed} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Alsó panel (Számológép) */}
                <div className="p-5 border-t border-slate-100 bg-white">
                    <button
                        title="Számológép"
                        onClick={() => setKalkulatorNyitva((v) => !v)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${
                            kalkulatorNyitva 
                            ? "bg-amber-50 text-amber-600" 
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                    >
                        <span className={`flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 shrink-0 transition-transform group-hover:scale-110 ${kalkulatorNyitva ? "text-amber-500" : ""}`}>
                            <Calculator />
                        </span>
                        <span className={`truncate ${isSidebarCollapsed ? "hidden" : "block"}`}>Számológép</span>
                    </button>
                </div>
            </aside>

            {/* Mobilos Backdrop */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" 
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <KalkulatorModal open={kalkulatorNyitva} onClose={() => setKalkulatorNyitva(false)} />

            {/* 2. FŐ TARTALOM (Világos) */}
            <main className="flex-1 flex flex-col h-screen min-w-0 bg-slate-50 relative">
                
                {/* Felső sáv (Topbar) - Nincsenek felesleges keretek! */}
                <header className="sticky top-0 z-20 flex items-center justify-between h-24 px-6 sm:px-10 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                    
                    <div className="flex items-center gap-4 flex-1">
                        <button 
                            className="lg:hidden flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary transition-all"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="hidden sm:block w-full max-w-[350px]">
                            <Input 
                                placeholder="Keresés a rendszerben..." 
                                icon={<Search />}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        
                        {/* Akció gombok: csak ikon, finom hover háttérrel, keret nélkül */}
                        <div className="flex items-center">
                            <button className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-400 hover:bg-primary/10 hover:text-primary transition-all group" title="Gyors rögzítés">
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                                className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-500 transition-all group" 
                                title="Hibabejelentés"
                                onClick={() => setHibaModalNyitva(true)}
                            >
                                <AlertCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        <div className="w-px h-8 bg-slate-200 hidden sm:block mx-2" />

                        {/* Profil - Egyszerű, tiszta (nincs lefelé nyíl, nincs Adminisztrátor szöveg) */}
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                                {avatarLetter}
                            </div>
                            <div className="hidden md:block min-w-0">
                                <div className="text-sm font-bold text-foreground truncate">
                                    {me?.nev || "Felhasználó"}
                                </div>
                            </div>
                        </div>

                        {/* Kilépés gomb */}
                        <button 
                            onClick={logout} 
                            disabled={loggingOut} 
                            title="Kilépés"
                            className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-400 hover:bg-red-50 hover:text-danger transition-all ml-2"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Oldal tartalma */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </div>

                <HibabejelentesModal open={hibaModalNyitva} onClose={() => setHibaModalNyitva(false)} felhasznaloId={me?.azonosito ?? null} halaszatId={hid ? Number(hid) : null} />
            </main>
        </div>
    );
}
