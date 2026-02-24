import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";

function asInt(x: unknown) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    const { id } = await ctx.params;
    const halaszatId = asInt(id);

    if (!halaszatId) {
        return NextResponse.json({ hiba: "Hibás halászat azonosító." }, { status: 400 });
    }

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ hiba: auth.error }, { status: auth.status });

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { azonosito: true, nev: true, slug: true, aktiv: true, letrehozva: true },
    });

    if (!halaszat) return NextResponse.json({ hiba: "Nincs ilyen halászat." }, { status: 404 });

    return NextResponse.json({ halaszat });
}