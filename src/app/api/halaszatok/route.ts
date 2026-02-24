import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[áàâä]/g, "a")
        .replace(/[éèêë]/g, "e")
        .replace(/[íìîï]/g, "i")
        .replace(/[óòôöő]/g, "o")
        .replace(/[úùûüű]/g, "u")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function GET() {
    const user = await requireUser();
    if (!user) return NextResponse.json({ hiba: "Bejelentkezés szükséges." }, { status: 401 });

    const list = await prisma.halaszatTagsag.findMany({
        where: { felhasznaloId: user.azonosito, aktiv: true },
        select: {
            szerepkor: true,
            halaszat: { select: { azonosito: true, nev: true, slug: true, aktiv: true, letrehozva: true } },
        },
        orderBy: { letrehozva: "asc" },
    });

    return NextResponse.json({ halaszatok: list });
}

export async function POST(req: Request) {
    const user = await requireUser();
    if (!user) return NextResponse.json({ hiba: "Bejelentkezés szükséges." }, { status: 401 });

    const body = await req.json().catch(() => null);
    const nev = (body?.nev ?? "").toString().trim();

    if (nev.length < 3) {
        return NextResponse.json({ hiba: "A halászat neve kötelező (min. 3 karakter)." }, { status: 400 });
    }

    // TODO: előfizetés check (később ide)
    // pl: if (!user.elofizetesAktiv) return 402/403

    let baseSlug = slugify(nev);
    if (!baseSlug) baseSlug = `halaszat-${Date.now()}`;

    let uniqueSlug = baseSlug;
    let i = 1;
    while (await prisma.halaszat.findUnique({ where: { slug: uniqueSlug } })) {
        i++;
        uniqueSlug = `${baseSlug}-${i}`;
    }

    const created = await prisma.$transaction(async (tx) => {
        const halaszat = await tx.halaszat.create({
            data: { nev, slug: uniqueSlug },
        });

        await tx.halaszatTagsag.create({
            data: {
                halaszatId: halaszat.azonosito,
                felhasznaloId: user.azonosito,
                szerepkor: "OWNER",
                aktiv: true,
            },
        });

        return halaszat;
    });

    return NextResponse.json({ halaszat: created }, { status: 201 });
}