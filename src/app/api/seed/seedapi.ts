import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
    // idempotens: ha létezik, nem dupláz
    await prisma.halfaj.upsert({
        where: { nev: "Ponty" },
        update: { aktiv: true },
        create: { nev: "Ponty", aktiv: true },
    });

    return NextResponse.json({ ok: true, uzenet: "Seed kész: Ponty." });
}
