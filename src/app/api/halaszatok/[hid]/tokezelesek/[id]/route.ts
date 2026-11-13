import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { ellenorizTokezeles, modosithatjaTokezeles, naploCim, naploLeiras } from "@/lib/tokezeles/tokezeles";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

type Kontextus = { params: Promise<{ hid: string; id: string }> };

async function elokeszit(context: Kontextus) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const kezelesId = szam(id, 0);
    if (!halaszatId || !kezelesId) return { hiba: jsonError("Hibás azonosító.") } as const;

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return { hiba: jsonError(auth.error, auth.status) } as const;

    const k = await prisma.tokezeles.findFirst({
        where: { azonosito: kezelesId, halaszatId },
        select: { rogzitoFelhasznaloId: true },
    });
    if (!k) return { hiba: jsonError("A kezelés nem található.", 404) } as const;
    if (!modosithatjaTokezeles(auth.role, k.rogzitoFelhasznaloId, auth.user.azonosito)) {
        return { hiba: jsonError("Csak a saját rögzítésedet módosíthatod (vagy adminisztrátorként bármelyiket).", 403) } as const;
    }
    return { halaszatId, kezelesId, auth } as const;
}

const naploSzuro = (halaszatId: number, kezelesId: number) => ({
    halaszatId, kapcsolodoEntitasTipus: "Tokezeles", kapcsolodoEntitasId: kezelesId, ervenyes: true,
});

/** PATCH — teljes adatcsere; a kapcsolódó naplóbejegyzés a szerkesztő rögzítésével frissül. */
export async function PATCH(req: Request, context: Kontextus) {
    const e = await elokeszit(context);
    if ("hiba" in e) return e.hiba;
    const { halaszatId, kezelesId, auth } = e;

    const r = ellenorizTokezeles(await req.json().catch(() => null));
    if (!r.ok) return jsonError(r.hiba);
    const a = r.adat;

    const to = await prisma.to.findFirst({ where: { azonosito: a.toId, halaszatId }, select: { azonosito: true } });
    if (!to) return jsonError("A tóegység nem ehhez a halászathoz tartozik.", 404);

    await prisma.$transaction([
        prisma.tokezeles.update({ where: { azonosito: kezelesId }, data: a }),
        prisma.naploEsemeny.updateMany({
            where: naploSzuro(halaszatId, kezelesId),
            data: {
                toId: a.toId, datum: a.datum, cim: naploCim(a), leiras: naploLeiras(a),
                reszletekJson: { tipus: a.tipus, mennyiseg: a.mennyiseg, egyseg: a.egyseg, koltsegFt: a.koltsegFt, varakozasiIdoNap: a.varakozasiIdoNap },
                szerkesztveAt: new Date(),
                szerkesztoFelhasznaloId: auth.user.azonosito,
            },
        }),
    ]);
    return NextResponse.json({ ok: true });
}

/** DELETE — a kezelés törlődik; a naplóbejegyzés érvénytelenítve megmarad (audit-elv). */
export async function DELETE(_req: Request, context: Kontextus) {
    const e = await elokeszit(context);
    if ("hiba" in e) return e.hiba;
    const { halaszatId, kezelesId, auth } = e;

    await prisma.$transaction([
        prisma.naploEsemeny.updateMany({
            where: naploSzuro(halaszatId, kezelesId),
            data: {
                ervenyes: false,
                ervenytelenitveAt: new Date(),
                ervenytelenitesOka: "A tókezelés-bejegyzést törölték.",
                ervenytelenitoFelhasznaloId: auth.user.azonosito,
            },
        }),
        prisma.tokezeles.delete({ where: { azonosito: kezelesId } }),
    ]);
    return NextResponse.json({ ok: true });
}
