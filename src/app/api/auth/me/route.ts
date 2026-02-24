import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
        user: { azonosito: user.azonosito, email: user.email, nev: user.nev },
    });
}
