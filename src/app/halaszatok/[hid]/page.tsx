import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import Link from "next/link";
import ToListaClient from "./ui/ToListaClient";
import HalaszatStatClient from "./ui/HalaszatStatClient";

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
                <h1 className="h1">Nincs ilyen halaszat</h1>
            </div>
        );
    }

    const role = access.role;
    const canManage = role === "OWNER" || role === "ADMIN";

    const modulok = [
        { cim: "Halfajok", leiras: "Tenant-specifikus halfaj lista",   href: `/halaszatok/${hid}/halfajok`, primary: true  },
        { cim: "Dolgozok", leiras: "Munkatarsak kezelese",             href: `/halaszatok/${hid}/dolgozok`, primary: false },
        { cim: "Naptar",   leiras: "Esemenyek es jegyzetek",           href: `/halaszatok/${hid}/naptar`,   primary: false },
        { cim: "Tavak",    leiras: canManage ? "Lista es letrehozas" : "Lista (csak megtekintes)", href: "#toak", primary: false },
    ];

    return (
        <div style={{ display: "grid", gap: 18 }}>

            {/* Header */}
            <div className="glass card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 className="h1">{halaszat.nev}</h1>
                    <div className="muted" style={{ marginTop: 6 }}>
                        slug: <span style={{ color: "rgba(255,255,255,0.9)" }}>{halaszat.slug}</span>
                        {" "}&bull;{" "}szerepkor: <span className="badge">{role}</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link className="btn" href={`/halaszatok/${hid}/dolgozok`}>Dolgozok</Link>
                    <Link className="btn btn-primary" href={`/halaszatok/${hid}/halfajok`}>Halfajok</Link>
                </div>
            </div>

            {/* Modulok */}
            <div className="glass card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    <h2 className="h2">Modulok</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="badge">{halaszat.aktiv ? "Aktiv" : "Inaktiv"}</span>
                        <span className="badge">ID: {halaszat.azonosito}</span>
                        <span className="badge">{role}</span>
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {modulok.map((m) => (
                        <div
                            key={m.cim}
                            className="glass"
                            style={{ padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                        >
                            <div>
                                <div style={{ fontWeight: 700 }}>{m.cim}</div>
                                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{m.leiras}</div>
                            </div>
                            <Link
                                className={m.primary ? "btn btn-primary" : "btn"}
                                href={m.href}
                                style={{ whiteSpace: "nowrap", fontSize: 13 }}
                            >
                                &rarr;
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Osszesito statisztikak + grafikonok */}
            <HalaszatStatClient hid={hid} />

            {/* Tavak lista */}
            <div id="toak">
                <ToListaClient hid={String(halaszat.azonosito)} viewerRole={role} />
            </div>

        </div>
    );
}
