import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import Link from "next/link";
import ToListaClient from "./ui/ToListaClient";

export default async function HalaszatDashboardPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    const halaszatId = Number(hid);

    if (!Number.isFinite(halaszatId) || halaszatId < 1) redirect("/halaszatok");

    const access = await requireHalaszatRole(halaszatId, "STAFF");
    if (!access.ok) {
        if (access.status === 401) redirect("/login");
        return (
            <div className="glass card">
                <h1 className="h1">Nincs hozzáférés</h1>
                <div className="muted" style={{ marginTop: 6 }}>{access.error}</div>
            </div>
        );
    }

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { azonosito: true, nev: true, slug: true, aktiv: true },
    });

    if (!halaszat) {
        return (
            <div className="glass card">
                <h1 className="h1">Nincs ilyen halászat</h1>
            </div>
        );
    }

    const role = access.role; // OWNER | ADMIN | STAFF
    const canManage = role === "OWNER" || role === "ADMIN";

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Header card */}
            <div
                className="glass card"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
            >
                <div>
                    <h1 className="h1">{halaszat.nev}</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        slug: <span style={{ color: "rgba(255,255,255,0.9)" }}>{halaszat.slug}</span> • szerepkör:{" "}
                        <span className="badge">{role}</span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link className="btn" href={`/halaszatok/${hid}/dolgozok`}>
                        Dolgozók →
                    </Link>
                    <Link className="btn btn-primary" href={`/halaszatok/${hid}/halfajok`}>
                        Halfajok →
                    </Link>
                </div>
            </div>

            {/* Quick modules grid */}
            <div className="grid-2">
                <div className="glass card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <h2 className="h2">Modulok</h2>
                        <span className="badge">{halaszat.aktiv ? "Aktív" : "Inaktív"}</span>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>Halfajok</div>
                                    <div className="muted" style={{ marginTop: 4 }}>Tenant-specifikus halfaj lista</div>
                                </div>
                                <Link className="btn btn-primary" href={`/halaszatok/${hid}/halfajok`}>Megnyitás</Link>
                            </div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>Dolgozók</div>
                                    <div className="muted" style={{ marginTop: 4 }}>
                                        Munkatársak kezelése (OWNER/ADMIN jogosultság)
                                    </div>
                                </div>
                                <Link className="btn" href={`/halaszatok/${hid}/dolgozok`}>Megnyitás</Link>
                            </div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>Tavak</div>
                                    <div className="muted" style={{ marginTop: 4 }}>
                                        Tavak / telelők listája {canManage ? "és létrehozása" : "(csak megtekintés)"}
                                    </div>
                                </div>
                                <a className="btn" href="#toak">Ugrás ↓</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: “profile/stat” card vibe */}
                <div className="glass card">
                    <h2 className="h2">Áttekintés</h2>
                    <div className="muted" style={{ marginTop: 6 }}>
                        Gyors infók a halászatról (később ide jöhet halállomány summary, események, stb.)
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Halászat ID
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{halaszat.azonosito}</div>
                        </div>

                        <div className="glass" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
                            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Szerepköröd
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{role}</div>
                            <div className="muted" style={{ marginTop: 6 }}>
                                {role === "STAFF"
                                    ? "Megtekintés + műveletek (később finomítjuk)."
                                    : "Kezelési jogosultságok elérhetők."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lakes section */}
            <div id="toak">
                <ToListaClient hid={String(halaszat.azonosito)} viewerRole={role} />
            </div>
        </div>
    );
}