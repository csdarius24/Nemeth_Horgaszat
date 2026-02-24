import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ToListaClient from "./ui/ToListaClient";
import { requireHalaszatRole } from "@/lib/guards";

export default async function HalaszatDashboardPage(
    props: { params: Promise<{ hid: string }> }
) {
    const { hid } = await props.params;     // ✅ EZ A LÉNYEG
    const halaszatId = Number(hid);

    if (!Number.isFinite(halaszatId) || halaszatId < 1) redirect("/halaszatok");

    const access = await requireHalaszatRole(halaszatId, "STAFF");
    if (!access.ok) {
        if (access.status === 401) redirect("/login");
        return (
            <main style={{ padding: 24 }}>
                <h1>Nincs hozzáférés</h1>
                <p>{access.error}</p>
            </main>
        );
    }

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { azonosito: true, nev: true, slug: true },
    });

    if (!halaszat) {
        return (
            <main style={{ padding: 24 }}>
                <h1>Nincs ilyen halászat</h1>
            </main>
        );
    }

    return (
        <main style={{ padding: 24 }}>
            <h1>{halaszat.nev}</h1>
            <p>slug: {halaszat.slug}</p>
            <p>Szerepkör: {access.role}</p>

            <ToListaClient hid={String(halaszat.azonosito)} />
        </main>
    );
}