import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";

const nullSzam = (x: unknown) => (x == null ? null : Number(x));

/**
 * GET /api/halaszatok/[hid]/terkep
 * A halászat térkép-nézetéhez: a halászat helye + minden tóegység körvonala,
 * neve, azonosítója és típusa. A körvonal nélküli tavakat külön listázza
 * (régi tavak, amelyeknél még be kell rajzolni). Csak olvasás.
 */
export async function GET(
    _req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return NextResponse.json({ error: "Hibás halászat azonosító." }, { status: 400 });

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [halaszat, toak] = await Promise.all([
        prisma.halaszat.findUnique({
            where: { azonosito: halaszatId },
            select: { azonosito: true, nev: true, helyLat: true, helyLng: true },
        }),
        prisma.to.findMany({
            where: { halaszatId },
            orderBy: { nev: "asc" },
            select: {
                azonosito: true, nev: true, tipus: true, aktiv: true,
                korvonal: true, kozeppontLat: true, kozeppontLng: true, rajzoltTeruletM2: true,
            },
        }),
    ]);

    if (!halaszat) return NextResponse.json({ error: "Nincs ilyen halászat." }, { status: 404 });

    const sorok = toak.map((t) => ({
        azonosito: t.azonosito,
        nev: t.nev,
        tipus: t.tipus,
        aktiv: t.aktiv,
        korvonal: t.korvonal ?? null,
        kozeppontLat: nullSzam(t.kozeppontLat),
        kozeppontLng: nullSzam(t.kozeppontLng),
        rajzoltTeruletM2: nullSzam(t.rajzoltTeruletM2),
    }));

    return NextResponse.json({
        halaszat: {
            azonosito: halaszat.azonosito,
            nev: halaszat.nev,
            helyLat: nullSzam(halaszat.helyLat),
            helyLng: nullSzam(halaszat.helyLng),
        },
        toak: sorok.filter((t) => t.korvonal != null),
        korvonalNelkul: sorok.filter((t) => t.korvonal == null).map(({ azonosito, nev, tipus }) => ({ azonosito, nev, tipus })),
        viewerRole: auth.role,
    });
}
