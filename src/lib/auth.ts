import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256, createSessionToken, hashPassword, verifyPassword } from "@/lib/password";

// Visszafelé kompatibilis re-export: a hívók továbbra is a @/lib/auth-ból importálnak.
export { hashPassword, verifyPassword, createSessionToken };

const COOKIE_NAME = "nh_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(felhasznaloId: number) {
    const token = createSessionToken()
    const tokenHash = sha256(token)

    const lejar = new Date()
    lejar.setDate(lejar.getDate() + SESSION_TTL_DAYS)

    await prisma.session.create({
        data: {
            felhasznaloId,
            tokenHash,
            lejar,
        },
    })

    const cookieStore = await cookies()

    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: lejar,
    })

    return token
}

export async function deleteSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return

    const tokenHash = sha256(token)

    await prisma.session.deleteMany({
        where: { tokenHash },
    })

    cookieStore.set(COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
    })
}

export async function getAuthUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const tokenHash = sha256(token)

    const session = await prisma.session.findFirst({
        where: {
            tokenHash,
            lejar: { gt: new Date() },
        },
        include: {
            felhasznalo: true,
        },
    })

    return session?.felhasznalo ?? null
}