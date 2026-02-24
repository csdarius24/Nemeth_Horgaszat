import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const halfajok = await prisma.halfaj.findMany({
        orderBy: { nev: "asc" },
    });
    return NextResponse.json(halfajok);
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const nev = typeof body?.nev === "string" ? body.nev.trim() : "";
    if (!nev) {
        return NextResponse.json({ hiba: "A halfaj neve kötelező." }, { status: 400 });
    }

    try {
        const uj = await prisma.halfaj.create({
            data: { nev },
        });
        return NextResponse.json(uj, { status: 201 });
    } catch (e) {
        // Unique ütközés esetén (nev @unique)
        return NextResponse.json(
            { hiba: "Ez a halfaj már létezik." },
            { status: 409 }
        );
    }
}
