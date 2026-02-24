import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();

    if (!email || !password) {
        return NextResponse.json({ error: "Hiányzó email vagy jelszó." }, { status: 400 });
    }

    const user = await prisma.felhasznalo.findUnique({ where: { email } });
    if (!user || !user.aktiv) {
        return NextResponse.json({ error: "Hibás belépési adatok." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.jelszoHash);
    if (!ok) {
        return NextResponse.json({ error: "Hibás belépési adatok." }, { status: 401 });
    }

    await createSession(user.azonosito);

    return NextResponse.json({
        user: { azonosito: user.azonosito, email: user.email, nev: user.nev },
    });
}