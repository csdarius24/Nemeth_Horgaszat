import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const toak = await prisma.to.findMany({
        orderBy: { letrehozva: "desc" },
    });
    return NextResponse.json(toak);
}

export async function POST(req: Request) {
    const user = await requireUser();
    if (!user) {
        return NextResponse.json({ hiba: "Bejelentkezés szükséges." }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const nev = body?.nev;

    if (!nev || typeof nev !== "string" || nev.trim().length < 2) {
        return NextResponse.json({ hiba: "A tó neve kötelező (min. 2 karakter)." }, { status: 400 });
    }

    const ujTo = await prisma.$transaction(async (tx) => {
        const createdTo = await tx.to.create({
            data: { nev: nev.trim() },
        });

        await tx.toTagsag.create({
            data: {
                felhasznaloId: user.azonosito,
                toId: createdTo.azonosito,
                szerepkor: "OWNER",
            },
        });

        return createdTo;
    });

    return NextResponse.json(ujTo, { status: 201 });
}