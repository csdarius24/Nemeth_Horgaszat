import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { pontBemenetbol } from "@/lib/terkep/geo";

function asInt(x: unknown) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ hid: string }> }
) {
    const { hid } = await ctx.params;
    const halaszatId = Number(hid);

    if (!halaszatId) {
        return NextResponse.json({ hiba: "Hibás halászat azonosító." }, { status: 400 });
    }

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ hiba: auth.error }, { status: auth.status });

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { azonosito: true, nev: true, slug: true, aktiv: true, letrehozva: true, helyLat: true, helyLng: true },
    });

    if (!halaszat) return NextResponse.json({ hiba: "Nincs ilyen halászat." }, { status: 404 });

    return NextResponse.json({
        halaszat: {
            ...halaszat,
            helyLat: halaszat.helyLat == null ? null : Number(halaszat.helyLat),
            helyLng: halaszat.helyLng == null ? null : Number(halaszat.helyLng),
        },
        viewerRole: auth.role,
    });
}

/**
 * PATCH /api/halaszatok/[hid]
 * Halászat nevének és földrajzi helyének módosítása (ADMIN+).
 * A hely nem törölhető (az időjárás és a térkép erre épül), csak áthelyezhető.
 */
export async function PATCH(
    req: Request,
    ctx: { params: Promise<{ hid: string }> }
) {
    const { hid } = await ctx.params;
    const halaszatId = asInt(hid);
    if (!halaszatId) return NextResponse.json({ hiba: "Hibás halászat azonosító." }, { status: 400 });

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return NextResponse.json({ hiba: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const data: { nev?: string; helyLat?: number; helyLng?: number } = {};

    if ("nev" in body) {
        const nev = String(body.nev ?? "").trim();
        if (nev.length < 3) return NextResponse.json({ hiba: "A halászat neve legalább 3 karakter legyen." }, { status: 400 });
        data.nev = nev;
    }

    if ("helyLat" in body || "helyLng" in body) {
        const hely = pontBemenetbol(body.helyLat, body.helyLng);
        if (!hely) return NextResponse.json({ hiba: "Érvénytelen földrajzi hely." }, { status: 400 });
        data.helyLat = hely.lat;
        data.helyLng = hely.lng;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ hiba: "Nincs módosítandó adat." }, { status: 400 });
    }

    const halaszat = await prisma.halaszat.update({
        where: { azonosito: halaszatId },
        data,
        select: { azonosito: true, nev: true, helyLat: true, helyLng: true },
    });

    return NextResponse.json({
        halaszat: { ...halaszat, helyLat: Number(halaszat.helyLat), helyLng: Number(halaszat.helyLng) },
    });
}