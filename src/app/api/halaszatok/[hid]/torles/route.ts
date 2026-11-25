import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { torlesNevEgyezik, type TorlesElonezet } from "@/lib/halaszat/torles";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

type Kontextus = { params: Promise<{ hid: string }> };

/**
 * GET /api/halaszatok/[hid]/torles — előnézet: mi törlődne a halászattal. Csak OWNER.
 */
export async function GET(_req: Request, context: Kontextus) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "OWNER");
    if (!auth.ok) return jsonError(auth.status === 403 ? "Halászatot csak a tulajdonosa törölhet." : auth.error, auth.status);

    const halaszat = await prisma.halaszat.findUnique({ where: { azonosito: halaszatId }, select: { nev: true } });
    if (!halaszat) return jsonError("Nincs ilyen halászat.", 404);

    const [tavak, halfajok, hal, naplo, tagok, takarmanyok, feladatok, madarkar, tokezelesek, halkeltetes, naptar] = await Promise.all([
        prisma.to.count({ where: { halaszatId } }),
        prisma.halfaj.count({ where: { halaszatId } }),
        prisma.halAllomany.aggregate({ where: { to: { halaszatId } }, _sum: { darab: true } }),
        prisma.naploEsemeny.count({ where: { halaszatId } }),
        prisma.halaszatTagsag.count({ where: { halaszatId, aktiv: true } }),
        prisma.takarmany.count({ where: { halaszatId } }),
        prisma.feladat.count({ where: { halaszatId } }),
        prisma.madarkarEsemeny.count({ where: { halaszatId } }),
        prisma.tokezeles.count({ where: { halaszatId } }),
        prisma.halkeltetesCiklus.count({ where: { halaszatId } }),
        prisma.naptarBejegyzes.count({ where: { halaszatId } }),
    ]);

    const elonezet: TorlesElonezet = {
        tavak, halfajok, halDarab: hal._sum.darab ?? 0, naploBejegyzesek: naplo, tagok,
        takarmanyok, feladatok, madarkar, tokezelesek, halkeltetes, naptar,
    };
    return NextResponse.json({ nev: halaszat.nev, elonezet });
}

/**
 * DELETE /api/halaszatok/[hid]/torles — a halászat VÉGLEGES törlése minden adatával.
 * Csak OWNER. Törzs: { megerositoNev } — a halászat pontos neve (második megerősítés,
 * a szerver is ellenőrzi). A hibabejelentések megmaradnak (halászat nélkül).
 */
export async function DELETE(req: Request, context: Kontextus) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "OWNER");
    if (!auth.ok) return jsonError(auth.status === 403 ? "Halászatot csak a tulajdonosa törölhet." : auth.error, auth.status);

    const halaszat = await prisma.halaszat.findUnique({ where: { azonosito: halaszatId }, select: { nev: true } });
    if (!halaszat) return jsonError("Nincs ilyen halászat.", 404);

    const body = await req.json().catch(() => null);
    if (!torlesNevEgyezik(body?.megerositoNev, halaszat.nev)) {
        return jsonError("A megerősítéshez a halászat pontos nevét kell begépelni.", 400);
    }

    // Sorrend: előbb a tavak (velük az állomány, telepítések, kivételek, etetések…),
    // csak utána a halászat. A halfajokat „Restrict” védi az állomány-soroktól, így egy
    // lépésben a MySQL kaszkád sorrendje miatt elakadhatna a törlés.
    await prisma.$transaction([
        prisma.to.deleteMany({ where: { halaszatId } }),
        prisma.halaszat.delete({ where: { azonosito: halaszatId } }),
    ]);

    return NextResponse.json({ ok: true, nev: halaszat.nev });
}
