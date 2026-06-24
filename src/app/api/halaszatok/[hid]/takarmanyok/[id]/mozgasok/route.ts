import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const takarmanyId = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!takarmanyId) return jsonError("Hibas takarmany azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const limit = Math.min(szam(url.searchParams.get("limit") ?? "50", 50), 200);

    const mozgasok = await prisma.takarmanyMozgas.findMany({
        where: { takarmanyId, halaszatId },
        orderBy: { datum: "desc" },
        take: limit,
        select: { azonosito: true, tipus: true, mennyiseg: true, datum: true, megjegyzes: true },
    });

    return NextResponse.json({ mozgasok });
}

export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const takarmanyId = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!takarmanyId) return jsonError("Hibas takarmany azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const takarmany = await prisma.takarmany.findFirst({
        where: { azonosito: takarmanyId, halaszatId },
        select: { azonosito: true, keszlet: true },
    });
    if (!takarmany) return jsonError("A takarmany nem talalhato.", 404);

    const body = await req.json().catch(() => null);
    const tipus = body?.tipus === "BEVETEL" ? "BEVETEL" : body?.tipus === "FELHASZNALVA" ? "FELHASZNALVA" : null;
    if (!tipus) return jsonError("A tipus kotelezo (BEVETEL vagy FELHASZNALVA).", 400);

    const mennyiseg = typeof body?.mennyiseg === "number" ? body.mennyiseg : parseFloat(body?.mennyiseg ?? "");
    if (isNaN(mennyiseg) || mennyiseg <= 0) return jsonError("A mennyiseg pozitiv szam kell legyen.", 400);

    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() || null : null;
    const datum = body?.datum ? new Date(body.datum) : new Date();
    if (isNaN(datum.getTime())) return jsonError("Ervenytelen datum.", 400);

    const keszletValtozas = tipus === "BEVETEL" ? mennyiseg : -mennyiseg;
    const ujKeszlet = Number(takarmany.keszlet) + keszletValtozas;
    if (ujKeszlet < 0) return jsonError("A keszlet nem mehet negatvba. Jelenlegi keszlet: " + Number(takarmany.keszlet), 422);

    const [mozgas] = await prisma.$transaction([
        prisma.takarmanyMozgas.create({
            data: { takarmanyId, halaszatId, tipus, mennyiseg, datum, megjegyzes },
            select: { azonosito: true, tipus: true, mennyiseg: true, datum: true, megjegyzes: true },
        }),
        prisma.takarmany.update({
            where: { azonosito: takarmanyId },
            data: { keszlet: ujKeszlet },
        }),
    ]);

    return NextResponse.json({ ok: true, mozgas, ujKeszlet }, { status: 201 });
}
