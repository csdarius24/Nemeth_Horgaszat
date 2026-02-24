import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "nh_session";
const SESSION_TTL_DAYS = 30;

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

export function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}

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