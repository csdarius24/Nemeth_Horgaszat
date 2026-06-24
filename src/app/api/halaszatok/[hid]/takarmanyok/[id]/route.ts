import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

async function resolveTakarmany(halaszatId: number, azonosito: number) {
    return prisma.takarmany.findFirst({
        where: { azonosito, halaszatId },
        select: { azonosito: true, nev: true, aktiv: true, keszlet: true },
    });
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas takarmany azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await resolveTakarmany(halaszatId, azonosito);
    if (!meglevo) return jsonError("A takarmany nem talalhato.", 404);

    const body = await req.json().catch(() => null);
    const frissites: { nev?: string; egyseg?: string; szin?: string | null; aktiv?: boolean } = {};

    if (typeof body?.nev === "string") {
        const nev = body.nev.trim();
        if (!nev) return jsonError("A nev nem lehet ures.", 400);
        frissites.nev = nev;
    }
    if (typeof body?.egyseg === "string") {
        const egyseg = body.egyseg.trim();
        if (!egyseg) return jsonError("Az egyseg nem lehet ures.", 400);
        frissites.egyseg = egyseg;
    }
    if ("szin" in (body ?? {})) {
        frissites.szin = typeof body.szin === "string" ? body.szin.trim() || null : null;
    }
    if (typeof body?.aktiv === "boolean") {
        frissites.aktiv = body.aktiv;
    }

    if (Object.keys(frissites).length === 0) {
        return jsonError("Nincs frissitendo mezo.", 400);
    }

    try {
        const frissitett = await prisma.takarmany.update({
            where: { azonosito },
            data: frissites,
            select: { azonosito: true, nev: true, egyseg: true, keszlet: true, szin: true, aktiv: true },
        });
        return NextResponse.json({ ok: true, item: frissitett });
    } catch (err: any) {
        if (String(err?.code) === "P2002") {
            return jsonError("Ilyen nevu takarmany mar letezik.", 409);
        }
        return jsonError(err?.message ?? "Frissitesi hiba.", 500);
    }
}

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas takarmany azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await resolveTakarmany(halaszatId, azonosito);
    if (!meglevo) return jsonError("A takarmany nem talalhato.", 404);

    try {
        await prisma.takarmany.delete({ where: { azonosito } });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        if (String(err?.code) === "P2003" || String(err?.code) === "P2014") {
            return NextResponse.json(
                { error: "A takarmanyhoz mozgas van rogzitve, ezert nem torolheto. Helyette inaktivalhatod.", inaktivalhatjuk: true },
                { status: 409 }
            );
        }
        return jsonError(err?.message ?? "Torlesi hiba.", 500);
    }
}
