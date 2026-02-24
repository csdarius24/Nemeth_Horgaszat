import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireToAccess } from "@/lib/guards";

function asInt(x: unknown) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(_req: Request, ctx: { params: Promise<{ toId: string }> }) {
    const { toId } = await ctx.params;
    const id = asInt(toId);

    if (!id) return NextResponse.json({ hiba: "Hibás tó azonosító." }, { status: 400 });

    const access = await requireToAccess(id, "STAFF");
    if (!access.ok) return NextResponse.json({ hiba: access.error }, { status: access.status });

    const allomany = await prisma.halAllomany.findMany({
        where: { toId: id },
        orderBy: { halfaj: { nev: "asc" } },
        select: {
            azonosito: true,
            darab: true,
            minTomegKg: true,
            maxTomegKg: true,
            halfaj: { select: { azonosito: true, nev: true } },
        },
    });

    return NextResponse.json({ to: access.to, allomany });
}