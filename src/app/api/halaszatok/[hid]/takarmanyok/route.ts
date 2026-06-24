import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ hid: string }> }
) {
    const { hid } = await params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const onlyActive = (url.searchParams.get("active") ?? "1") !== "0";

    const items = await prisma.takarmany.findMany({
        where: { halaszatId, ...(onlyActive ? { aktiv: true } : {}) },
        orderBy: { nev: "asc" },
        select: {
            azonosito: true,
            nev: true,
            egyseg: true,
            keszlet: true,
            szin: true,
            aktiv: true,
        },
    });

    return NextResponse.json({ items, viewerRole: auth.role });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ hid: string }> }
) {
    const { hid } = await params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);
    const nev = typeof body?.nev === "string" ? body.nev.trim() : "";
    const egyseg = typeof body?.egyseg === "string" ? body.egyseg.trim() : "";
    const szin = typeof body?.szin === "string" ? body.szin.trim() || null : null;

    if (!nev) return jsonError("A nev kotelezo.", 400);
    if (!egyseg) return jsonError("Az egyseg kotelezo.", 400);

    try {
        const item = await prisma.takarmany.create({
            data: { halaszatId, nev, egyseg, szin, keszlet: 0, aktiv: true },
            select: { azonosito: true, nev: true, egyseg: true, keszlet: true, szin: true, aktiv: true },
        });
        return NextResponse.json({ ok: true, item }, { status: 201 });
    } catch (err: any) {
        if (String(err?.code) === "P2002") {
            return jsonError("Ilyen nevu takarmany mar letezik.", 409);
        }
        return jsonError(err?.message ?? "Hiba tortent.", 500);
    }
}
