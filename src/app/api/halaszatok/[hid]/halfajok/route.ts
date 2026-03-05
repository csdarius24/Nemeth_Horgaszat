import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ hid: string }> }
) {
    const { hid } = await params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const onlyActive = (url.searchParams.get("active") ?? "1") !== "0";

    const items = await prisma.halfaj.findMany({
        where: { halaszatId, ...(onlyActive ? { aktiv: true } : {}) },
        orderBy: { nev: "asc" },
        select: { azonosito: true, nev: true, aktiv: true },
    });

    return NextResponse.json({ items, viewerRole: auth.role });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ hid: string }> }
) {
    const { hid } = await params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);
    const nev = typeof body?.nev === "string" ? body.nev.trim() : "";
    if (!nev) return jsonError("A név kötelező.", 400);

    try {
        const item = await prisma.halfaj.create({
            data: { halaszatId, nev, aktiv: true },
            select: { azonosito: true, nev: true, aktiv: true },
        });
        return NextResponse.json({ ok: true, item }, { status: 201 });
    } catch (err: any) {
        if (String(err?.code) === "P2002") {
            return jsonError("Ilyen nevű halfaj már létezik ennél a halászatnál.", 409);
        }
        return jsonError(err?.message ?? "Hiba történt a halfaj létrehozásakor.", 500);
    }
}