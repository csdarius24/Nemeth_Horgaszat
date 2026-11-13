import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { ellenorizMadarkar, modosithatjaMadarkar, naploLeiras } from "@/lib/madarkar/madarkar";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

type Kontextus = { params: Promise<{ hid: string; id: string }> };

/** Közös: jogosultság + az esemény betöltése tenant-szűrten. */
async function elokeszit(context: Kontextus) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const esemenyId = szam(id, 0);
    if (!halaszatId || !esemenyId) return { hiba: jsonError("Hibás azonosító.") } as const;

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return { hiba: jsonError(auth.error, auth.status) } as const;

    const esemeny = await prisma.madarkarEsemeny.findFirst({
        where: { azonosito: esemenyId, halaszatId },
        select: { azonosito: true, rogzitoFelhasznaloId: true },
    });
    if (!esemeny) return { hiba: jsonError("A madárkár-bejegyzés nem található.", 404) } as const;

    if (!modosithatjaMadarkar(auth.role, esemeny.rogzitoFelhasznaloId, auth.user.azonosito)) {
        return { hiba: jsonError("Csak a saját bejegyzésedet módosíthatod (vagy adminisztrátorként bármelyiket).", 403) } as const;
    }
    return { halaszatId, esemenyId, auth } as const;
}

/**
 * PATCH /api/halaszatok/[hid]/madarkar/[id] — teljes adatcsere (ugyanaz az
 * ellenőrzés, mint létrehozáskor). A kapcsolódó naplóbejegyzés is frissül, a
 * szerkesztő és az időpont rögzítésével (a napló a rekordot tükrözi).
 */
export async function PATCH(req: Request, context: Kontextus) {
    const e = await elokeszit(context);
    if ("hiba" in e) return e.hiba;
    const { halaszatId, esemenyId, auth } = e;

    const r = ellenorizMadarkar(await req.json().catch(() => null));
    if (!r.ok) return jsonError(r.hiba);
    const a = r.adat;

    const to = await prisma.to.findFirst({ where: { azonosito: a.toId, halaszatId }, select: { azonosito: true } });
    if (!to) return jsonError("A tóegység nem ehhez a halászathoz tartozik.", 404);

    await prisma.$transaction([
        prisma.madarkarEsemeny.update({
            where: { azonosito: esemenyId },
            data: {
                toId: a.toId, datum: a.datum, madarfaj: a.madarfaj, egyedszam: a.egyedszam,
                halvesztesegKg: a.halvesztesegKg, karFt: a.karFt, megjegyzes: a.megjegyzes,
            },
        }),
        prisma.naploEsemeny.updateMany({
            where: { halaszatId, kapcsolodoEntitasTipus: "MadarkarEsemeny", kapcsolodoEntitasId: esemenyId, ervenyes: true },
            data: {
                toId: a.toId,
                datum: a.datum,
                mennyisegKg: a.halvesztesegKg,
                cim: `Madárkár — ${a.madarfaj}`,
                leiras: naploLeiras(a),
                reszletekJson: { madarfaj: a.madarfaj, egyedszam: a.egyedszam, halvesztesegKg: a.halvesztesegKg, karFt: a.karFt },
                szerkesztveAt: new Date(),
                szerkesztoFelhasznaloId: auth.user.azonosito,
            },
        }),
    ]);

    return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/halaszatok/[hid]/madarkar/[id] — a bejegyzés és fotói törlődnek;
 * a naplóbejegyzés NEM törlődik (audit-elv), hanem érvénytelenítve lesz.
 */
export async function DELETE(_req: Request, context: Kontextus) {
    const e = await elokeszit(context);
    if ("hiba" in e) return e.hiba;
    const { halaszatId, esemenyId, auth } = e;

    await prisma.$transaction([
        prisma.naploEsemeny.updateMany({
            where: { halaszatId, kapcsolodoEntitasTipus: "MadarkarEsemeny", kapcsolodoEntitasId: esemenyId, ervenyes: true },
            data: {
                ervenyes: false,
                ervenytelenitveAt: new Date(),
                ervenytelenitesOka: "A madárkár-bejegyzést törölték.",
                ervenytelenitoFelhasznaloId: auth.user.azonosito,
            },
        }),
        prisma.madarkarEsemeny.delete({ where: { azonosito: esemenyId } }),
    ]);

    return NextResponse.json({ ok: true });
}
