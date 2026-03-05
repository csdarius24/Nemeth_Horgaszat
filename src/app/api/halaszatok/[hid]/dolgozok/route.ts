import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth";

function generateTempPassword(length = 14) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
    const bytes = crypto.randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
    return out;
}

type CreateWorkerBody = {
    email: string;
    nev?: string;
    role: "ADMIN" | "STAFF";
};

export async function GET(_req: Request, context: { params: Promise<{ hid: string }> }) {
    const { hid } = await context.params;
    const halaszatId = Number(hid);

    if (!Number.isFinite(halaszatId)) {
        return NextResponse.json({ error: "Érvénytelen halászatazonosító." }, { status: 400 });
    }

    // RBAC: dolgozólistát csak OWNER (később: ADMIN is lehet)
    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tagsagok = await prisma.halaszatTagsag.findMany({
        where: { halaszatId },
        orderBy: [{ szerepkor: "desc" }, { letrehozva: "asc" }],
        select: {
            azonosito: true,
            szerepkor: true,
            aktiv: true,
            letrehozva: true,
            felhasznalo: {
                select: {
                    azonosito: true,
                    email: true,
                    nev: true,
                    aktiv: true,
                },
            },
        },
    });

    return NextResponse.json({ items: tagsagok, viewerRole: auth.role });
}

export async function POST(req: Request, context: { params: Promise<{ hid: string }> }) {
    const { hid } = await context.params;
    const halaszatId = Number(hid);

    if (!Number.isFinite(halaszatId)) {
        return NextResponse.json({ error: "Érvénytelen halászatazonosító." }, { status: 400 });
    }

    // RBAC: csak OWNER hozhat létre / vehet fel dolgozót
    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let body: CreateWorkerBody;
    try {
        body = (await req.json()) as CreateWorkerBody;
    } catch {
        return NextResponse.json({ error: "Hibás JSON." }, { status: 400 });
    }

    const email = (body.email || "").trim().toLowerCase();
    const nev = (body.nev || "").trim();
    const role = body.role;

    if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Érvénytelen e-mail." }, { status: 400 });
    }
    if (role !== "ADMIN" && role !== "STAFF") {
        return NextResponse.json({ error: "Érvénytelen szerepkör." }, { status: 400 });
    }
// ADMIN csak STAFF-ot vehet fel
    if (auth.role === "ADMIN" && role !== "STAFF") {
        return NextResponse.json(
            { error: "ADMIN csak STAFF szerepkörrel vehet fel dolgozót." },
            { status: 403 }
        );
    }
    // Biztonság: OWNER-t ne lehessen kiosztani ezen az endpointon
    // (role union eleve csak ADMIN/STAFF, de maradjon itt is)
    const tempPassword = generateTempPassword(14);
    const passwordHash = await hashPassword(tempPassword);

    const result = await prisma.$transaction(async (tx) => {
        // 1) user find or create
        let user = await tx.felhasznalo.findUnique({ where: { email } });

        let createdUser = false;
        if (!user) {
            user = await tx.felhasznalo.create({
                data: {
                    email,
                    nev: nev || null,
                    jelszoHash: passwordHash,
                    aktiv: true,
                },
            });
            createdUser = true;
        } else {
            // ha megvan, de név hiányzik és most jön név, feltölthetjük
            if (!user.nev && nev) {
                user = await tx.felhasznalo.update({
                    where: { azonosito: user.azonosito },
                    data: { nev },
                });
            }
            // Ha a user inaktív, nem bolygatjuk automatikusan – de ha akarod, itt visszaaktiválhatod:
            // if (!user.aktiv) { ... }
        }

        // 2) tagság upsert (ha létezik, aktivál + role update)
        const existing = await tx.halaszatTagsag.findUnique({
            where: {
                halaszatId_felhasznaloId: {
                    halaszatId,
                    felhasznaloId: user!.azonosito,
                },
            },
            select: { azonosito: true, aktiv: true, szerepkor: true },
        });

        let tagsag;
        if (!existing) {
            tagsag = await tx.halaszatTagsag.create({
                data: {
                    halaszatId,
                    felhasznaloId: user!.azonosito,
                    szerepkor: role,
                    aktiv: true,
                },
            });
        } else {
            // ha már tag, csak frissítünk
            tagsag = await tx.halaszatTagsag.update({
                where: { azonosito: existing.azonosito },
                data: {
                    aktiv: true,
                    szerepkor: role,
                },
            });
        }

        // 3) Ha a user már létezett, temp jelszót csak akkor adunk vissza,
        // ha most HOZTUK LÉTRE. (különben visszaállítanánk a jelszavát “véletlenül”)
        return {
            createdUser,
            user: { azonosito: user!.azonosito, email: user!.email, nev: user!.nev, aktiv: user!.aktiv },
            tagsag: { azonosito: tagsag.azonosito, szerepkor: tagsag.szerepkor, aktiv: tagsag.aktiv },
        };
    });

    return NextResponse.json({
        createdUser: result.createdUser,
        user: result.user,
        tagsag: result.tagsag,
        // MVP: csak akkor adunk temp jelszót, ha user-t most hoztuk létre
        tempPassword: result.createdUser ? tempPassword : null,
    });
}