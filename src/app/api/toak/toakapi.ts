import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const toak = await prisma.to.findMany({
        orderBy: { letrehozva: "desc" },
    });
    return NextResponse.json(toak);
}

export async function POST(req: Request) {
    const body = await req.json();

    if (!body.nev || typeof body.nev !== "string") {
        return NextResponse.json(
            { hiba: "A tó neve kötelező." },
            { status: 400 }
        );
    }

    const ujTo = await prisma.to.create({
        data: { nev: body.nev },
    });

    return NextResponse.json(ujTo, { status: 201 });
}
