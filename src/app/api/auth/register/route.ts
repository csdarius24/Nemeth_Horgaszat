import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const nev = body?.nev ? body.nev.toString().trim() : null;

    if (!email || !password || password.length < 8) {
        return NextResponse.json({ error: "Hibás adatok (min. 8 karakteres jelszó)." }, { status: 400 });
    }

    const existing = await prisma.felhasznalo.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: "Ezzel az emaillel már létezik fiók." }, { status: 409 });
    }

    const jelszoHash = await hashPassword(password);

    const user = await prisma.felhasznalo.create({
        data: { email, nev, jelszoHash },
        select: { azonosito: true, email: true, nev: true },
    });

    await createSession(user.azonosito);

    return NextResponse.json({ user });
}