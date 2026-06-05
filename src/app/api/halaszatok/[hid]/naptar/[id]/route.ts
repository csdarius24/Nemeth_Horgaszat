import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

// PATCH /api/halaszatok/[hid]/naptar/[id]
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!azonosito) return jsonError("Hibás bejegyzés azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    // Ellenőrzés: a bejegyzés valóban ehhez a halászathoz tartozik-e?
    const meglevo = await prisma.naptarBejegyzes.findFirst({
        where: { azonosito, halaszatId },
    });
    if (!meglevo) return jsonError("Bejegyzés nem található.", 404);

    const body = await req.json().catch(() => null);

    const frissites: Record<string, unknown> = {};
    if (typeof body?.cim === "string") frissites.cim = body.cim.trim();
    if (typeof body?.tartalom === "string") frissites.tartalom = body.tartalom.trim() || null;
    if (typeof body?.szin === "string") frissites.szin = body.szin.trim() || null;
    if (typeof body?.datum === "string") {
        const d = new Date(body.datum);
        if (!Number.isNaN(d.getTime())) frissites.datum = d;
    }

    if (Object.keys(frissites).length === 0) return jsonError("Nincs frissítendő mező.", 400);

    const frissitett = await prisma.naptarBejegyzes.update({
        where: { azonosito },
        data: frissites,
        select: { azonosito: true, datum: true, cim: true, tartalom: true, szin: true },
    });

    return NextResponse.json({ bejegyzes: frissitett });
}

// DELETE /api/halaszatok/[hid]/naptar/[id]
export async function DELETE(
    _req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!azonosito) return jsonError("Hibás bejegyzés azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await prisma.naptarBejegyzes.findFirst({
        where: { azonosito, halaszatId },
    });
    if (!meglevo) return jsonError("Bejegyzés nem található.", 404);

    await prisma.naptarBejegyzes.delete({ where: { azonosito } });

    return NextResponse.json({ ok: true });
}
