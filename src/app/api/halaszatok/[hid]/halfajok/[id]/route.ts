import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

async function resolveHalfaj(halaszatId: number, azonosito: number) {
    const halfaj = await prisma.halfaj.findFirst({
        where: { azonosito, halaszatId },
        select: { azonosito: true, nev: true, aktiv: true },
    });
    return halfaj;
}

// PATCH /api/halaszatok/[hid]/halfajok/[id]
// Atnevezés vagy aktiv flag váltás. Legalább ADMIN szerepkör szükséges.
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas halfaj azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await resolveHalfaj(halaszatId, azonosito);
    if (!meglevo) return jsonError("A halfaj nem talalhato.", 404);

    const body = await req.json().catch(() => null);
    const frissites: { nev?: string; aktiv?: boolean } = {};

    if (typeof body?.nev === "string") {
        const nev = body.nev.trim();
        if (!nev) return jsonError("A nev nem lehet ures.", 400);
        frissites.nev = nev;
    }
    if (typeof body?.aktiv === "boolean") {
        frissites.aktiv = body.aktiv;
    }

    if (Object.keys(frissites).length === 0) {
        return jsonError("Nincs frissitendo mezo (nev vagy aktiv).", 400);
    }

    try {
        const frissitett = await prisma.halfaj.update({
            where: { azonosito },
            data: frissites,
            select: { azonosito: true, nev: true, aktiv: true },
        });
        return NextResponse.json({ ok: true, item: frissitett });
    } catch (err: any) {
        if (String(err?.code) === "P2002") {
            return jsonError("Ilyen nevu halfaj mar letezik enne a halaszatnal.", 409);
        }
        return jsonError(err?.message ?? "Frissitesi hiba.", 500);
    }
}

// DELETE /api/halaszatok/[hid]/halfajok/[id]
// Hard delete — ha van allomany vagy esemeny, a DB visszautasitja (P2003).
// Ilyenkor a valasz 409 + javasolt "inaktivalas" uzenet.
export async function DELETE(
    _req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas halfaj azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await resolveHalfaj(halaszatId, azonosito);
    if (!meglevo) return jsonError("A halfaj nem talalhato.", 404);

    try {
        await prisma.halfaj.delete({ where: { azonosito } });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // Idegen kulcs sertés — a halfaj allomanyban / esemenyekben szerepel
        if (String(err?.code) === "P2003" || String(err?.code) === "P2014") {
            return NextResponse.json(
                {
                    error: "Ez a halfaj halallomanyhoz vagy naploeseményhez kotodik, ezert nem torolheto. Helyette inaktivalhatod.",
                    inaktivalhatjuk: true,
                },
                { status: 409 }
            );
        }
        return jsonError(err?.message ?? "Torlesi hiba.", 500);
    }
}
