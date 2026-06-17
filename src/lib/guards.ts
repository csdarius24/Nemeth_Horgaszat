import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { meetsToRole, meetsHalaszatRole } from "@/lib/roles";
import type { Szerepkor, HalaszatSzerepkor } from "@prisma/client";

export async function requireUser() {
    return await getAuthUser(); // null vagy user
}

/* ------------------------------
   TÓ-SZINTŰ ROLE (régi / meglévő)
--------------------------------- */

export async function requireToRole(toId: number, minRole: Szerepkor = "ANGLER") {
    const user = await requireUser();
    if (!user) {
        return { ok: false as const, status: 401 as const, error: "Bejelentkezés szükséges." };
    }

    const tagsag = await prisma.toTagsag.findFirst({
        where: {
            toId,
            felhasznaloId: user.azonosito,
            aktiv: true,
        },
        select: { szerepkor: true },
    });

    if (!tagsag) {
        return { ok: false as const, status: 403 as const, error: "Nincs jogosultságod ehhez a tóhoz." };
    }

    if (!meetsToRole(tagsag.szerepkor, minRole)) {
        return { ok: false as const, status: 403 as const, error: "Nincs megfelelő jogosultságod ehhez a művelethez." };
    }

    return { ok: true as const, user };
}

/* ------------------------------
   HALÁSZAT-SZINTŰ ROLE (TENANT)
--------------------------------- */

export async function requireHalaszatRole(
    halaszatId: number,
    minRole: HalaszatSzerepkor = "STAFF"
) {
    const user = await requireUser();
    if (!user) {
        return { ok: false as const, status: 401 as const, error: "Bejelentkezés szükséges." };
    }

    const tagsag = await prisma.halaszatTagsag.findUnique({
        where: {
            halaszatId_felhasznaloId: {
                halaszatId,
                felhasznaloId: user.azonosito,
            },
        },
        select: { szerepkor: true, aktiv: true },
    });

    if (!tagsag || !tagsag.aktiv) {
        return { ok: false as const, status: 403 as const, error: "Nincs hozzáférésed ehhez a halászathoz." };
    }

    if (!meetsHalaszatRole(tagsag.szerepkor, minRole)) {
        return { ok: false as const, status: 403 as const, error: "Nincs megfelelő jogosultságod ehhez a művelethez." };
    }

    return { ok: true as const, user, role: tagsag.szerepkor };
}

/**
 * Kényelmi helper: csak annyit szeretnél tudni, hogy a user tagja-e a halászatnak (STAFF szinten).
 */
export async function requireHalaszatMember(halaszatId: number) {
    return await requireHalaszatRole(halaszatId, "STAFF");
}
export async function requireToAccess(toId: number, minRole: HalaszatSzerepkor = "STAFF") {
    const user = await requireUser();
    if (!user) {
        return { ok: false as const, status: 401 as const, error: "Bejelentkezés szükséges." };
    }

    const to = await prisma.to.findUnique({
        where: { azonosito: toId },
        select: {
            azonosito: true,
            nev: true,
            tipus: true,
            aktiv: true,
            halaszatId: true,
        },
    });

    if (!to) {
        return { ok: false as const, status: 404 as const, error: "Nincs ilyen tó." };
    }

    if (!to.halaszatId) {
        return {
            ok: false as const,
            status: 409 as const,
            error: "Ez a tó még nincs halászathoz rendelve (régi adat).",
        };
    }

    const auth = await requireHalaszatRole(to.halaszatId, minRole);
    if (!auth.ok) return auth;

    return { ok: true as const, user: auth.user, role: auth.role, to, halaszatId: to.halaszatId };
}