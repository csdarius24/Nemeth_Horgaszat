import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import type { HalaszatSzerepkor } from "@prisma/client";

type PatchBody = {
    role?: "ADMIN" | "STAFF"; // szerepkör módosítás (csak OWNER)
    nev?: string;             // felhasználó név módosítás (OWNER+ADMIN, de ADMIN csak STAFF-nál)
};

function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : alap;
}

function canManageTarget(actorRole: HalaszatSzerepkor, targetRole: HalaszatSzerepkor) {
    // OWNER-t senki nem piszkálja
    if (targetRole === "OWNER") return false;

    if (actorRole === "OWNER") return true;               // OWNER: STAFF+ADMIN
    if (actorRole === "ADMIN") return targetRole === "STAFF"; // ADMIN: csak STAFF
    return false;
}

export async function PATCH(req: Request, props: { params: Promise<{ hid: string; tid: string }> }) {
    const { hid, tid } = await props.params;
    const halaszatId = szam(hid, 0);
    const tagId = szam(tid, 0);

    if (!halaszatId || !tagId) {
        return NextResponse.json({ hiba: "Hibás azonosító." }, { status: 400 });
    }

    // aki módosíthat: ADMIN vagy OWNER (de ADMIN csak STAFF targeten)
    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return NextResponse.json({ hiba: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const nev = typeof body.nev === "string" ? body.nev.trim() : undefined;
    const role = body.role;

    if (nev !== undefined && nev.length > 0 && nev.length < 2) {
        return NextResponse.json({ hiba: "A név min. 2 karakter legyen." }, { status: 400 });
    }

    // target tagság: tenant izoláció
    const target = await prisma.halaszatTagsag.findFirst({
        where: { azonosito: tagId, halaszatId },
        select: { azonosito: true, felhasznaloId: true, szerepkor: true, aktiv: true },
    });
    if (!target) return NextResponse.json({ hiba: "Nincs ilyen dolgozó ebben a halászatban." }, { status: 404 });

    // saját magát ne módosítsa (ajánlott)
    if (target.felhasznaloId === auth.user.azonosito) {
        return NextResponse.json({ hiba: "Saját magadat nem módosíthatod itt." }, { status: 400 });
    }

    // jogosultság: actorRole -> targetRole
    if (!canManageTarget(auth.role, target.szerepkor)) {
        return NextResponse.json({ hiba: "Nincs jogosultságod ezt a dolgozót módosítani." }, { status: 403 });
    }

    // ROLE módosítás: csak OWNER
    if (role !== undefined) {
        if (auth.role !== "OWNER") {
            return NextResponse.json({ hiba: "Szerepkört csak OWNER módosíthat." }, { status: 403 });
        }
        if (role !== "ADMIN" && role !== "STAFF") {
            return NextResponse.json({ hiba: "Érvénytelen szerepkör." }, { status: 400 });
        }

        await prisma.halaszatTagsag.update({
            where: { azonosito: tagId },
            data: { szerepkor: role },
        });
    }

    // NÉV módosítás: OWNER + ADMIN (de admin csak staffot, ezt már fent ellenőriztük)
    if (nev !== undefined) {
        await prisma.felhasznalo.update({
            where: { azonosito: target.felhasznaloId },
            data: { nev: nev.length ? nev : null },
        });
    }

    const updated = await prisma.halaszatTagsag.findUnique({
        where: { azonosito: tagId },
        select: {
            azonosito: true,
            szerepkor: true,
            aktiv: true,
            letrehozva: true,
            felhasznalo: { select: { azonosito: true, email: true, nev: true, aktiv: true } },
        },
    });

    return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, props: { params: Promise<{ hid: string; tid: string }> }) {
    const { hid, tid } = await props.params;
    const halaszatId = szam(hid, 0);
    const tagId = szam(tid, 0);

    if (!halaszatId || !tagId) {
        return NextResponse.json({ hiba: "Hibás azonosító." }, { status: 400 });
    }

    // ki törölhet (soft): ADMIN vagy OWNER
    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return NextResponse.json({ hiba: auth.error }, { status: auth.status });

    const target = await prisma.halaszatTagsag.findFirst({
        where: { azonosito: tagId, halaszatId },
        select: { azonosito: true, felhasznaloId: true, szerepkor: true, aktiv: true },
    });
    if (!target) return NextResponse.json({ hiba: "Nincs ilyen dolgozó ebben a halászatban." }, { status: 404 });

    // saját magát ne deaktiválja
    if (target.felhasznaloId === auth.user.azonosito) {
        return NextResponse.json({ hiba: "Saját magadat nem deaktiválhatod." }, { status: 400 });
    }

    // jogosultság: admin csak staffot, owner staff+admint
    if (!canManageTarget(auth.role, target.szerepkor)) {
        return NextResponse.json({ hiba: "Nincs jogosultságod ezt a dolgozót törölni." }, { status: 403 });
    }

    // soft delete
    const updated = await prisma.halaszatTagsag.update({
        where: { azonosito: tagId },
        data: { aktiv: false },
        select: { azonosito: true, aktiv: true },
    });

    return NextResponse.json({ item: updated });
}