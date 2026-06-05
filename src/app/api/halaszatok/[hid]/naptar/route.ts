import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

// GET /api/halaszatok/[hid]/naptar?ev=2026&honap=6
// Visszaadja az adott hónap összes bejegyzését.
export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const ev = szam(url.searchParams.get("ev") ?? "", new Date().getFullYear());
    const honap = szam(url.searchParams.get("honap") ?? "", new Date().getMonth() + 1);

    // Az adott hónap első és utolsó napja (UTC midnight)
    const tol = new Date(Date.UTC(ev, honap - 1, 1));
    const ig = new Date(Date.UTC(ev, honap, 1));   // következő hónap eleje = exclusive

    const bejegyzesek = await prisma.naptarBejegyzes.findMany({
        where: {
            halaszatId,
            datum: { gte: tol, lt: ig },
        },
        orderBy: { datum: "asc" },
        select: {
            azonosito: true,
            datum: true,
            cim: true,
            tartalom: true,
            szin: true,
            letrehozva: true,
        },
    });

    return NextResponse.json({ bejegyzesek });
}

// POST /api/halaszatok/[hid]/naptar
// Új bejegyzés létrehozása.
export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);

    const cim = typeof body?.cim === "string" ? body.cim.trim() : "";
    const tartalom = typeof body?.tartalom === "string" ? body.tartalom.trim() || null : null;
    const szin = typeof body?.szin === "string" ? body.szin.trim() || null : null;
    const datumStr = typeof body?.datum === "string" ? body.datum : null;

    if (!cim) return jsonError("A cím kötelező.", 400);
    if (!datumStr) return jsonError("A dátum kötelező (YYYY-MM-DD).", 400);

    const datum = new Date(datumStr);
    if (Number.isNaN(datum.getTime())) return jsonError("Érvénytelen dátum formátum.", 400);

    const bejegyzes = await prisma.naptarBejegyzes.create({
        data: { halaszatId, datum, cim, tartalom, szin },
        select: { azonosito: true, datum: true, cim: true, tartalom: true, szin: true },
    });

    return NextResponse.json({ bejegyzes }, { status: 201 });
}
