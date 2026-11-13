import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    ellenorizTokezeles,
    ervenyesTipus,
    modosithatjaTokezeles,
    naploCim,
    naploLeiras,
    osszesitTokezeles,
    varakozasVege,
    type TokezelesTipus,
} from "@/lib/tokezeles/tokezeles";
import { lekerAktivVarakozasok } from "@/lib/tokezeles/lekerdezes";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/**
 * GET /api/halaszatok/[hid]/tokezelesek — kezelések + összesítés + aktív várakozási idők. STAFF+.
 * Query: toId, tipus, from, to (ISO), limit (alap 300, max 1000).
 * Az `aktivVarakozasok` a szűrőktől függetlenül (a tó-szűrőt kivéve) mindig a még tartókat adja.
 */
export async function GET(req: Request, context: { params: Promise<{ hid: string }> }) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const toId = szam(url.searchParams.get("toId") ?? "0", 0);
    const tipusParam = url.searchParams.get("tipus");
    if (tipusParam && !ervenyesTipus(tipusParam)) return jsonError("Érvénytelen kezeléstípus.");
    const limit = Math.min(Math.max(szam(url.searchParams.get("limit") ?? "300", 300), 1), 1000);

    const datumSzuro: { gte?: Date; lt?: Date } = {};
    for (const [nev, kulcs] of [["from", "gte"], ["to", "lt"]] as const) {
        const v = url.searchParams.get(nev);
        if (!v) continue;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return jsonError(`Érvénytelen ${nev} paraméter.`);
        datumSzuro[kulcs] = d;
    }

    const [nyersek, toak, aktivVarakozasok] = await Promise.all([
        prisma.tokezeles.findMany({
            where: {
                halaszatId,
                ...(toId ? { toId } : {}),
                ...(tipusParam ? { tipus: tipusParam as TokezelesTipus } : {}),
                ...(datumSzuro.gte || datumSzuro.lt ? { datum: datumSzuro } : {}),
            },
            orderBy: [{ datum: "desc" }, { azonosito: "desc" }],
            take: limit,
            select: {
                azonosito: true, datum: true, tipus: true, keszitmeny: true, hatoanyag: true, mennyiseg: true,
                egyseg: true, koltsegFt: true, varakozasiIdoNap: true, kezelesOka: true, megjegyzes: true,
                rogzitoFelhasznaloId: true,
                to: { select: { azonosito: true, nev: true } },
                rogzito: { select: { nev: true, email: true } },
            },
        }),
        prisma.to.findMany({ where: { halaszatId }, select: { azonosito: true, teruletHa: true } }),
        lekerAktivVarakozasok(halaszatId, toId || undefined),
    ]);

    const most = Date.now();
    const kezelesek = nyersek.map((k) => {
        const veg = varakozasVege(k.datum, k.varakozasiIdoNap);
        return {
            id: k.azonosito,
            datum: k.datum.toISOString(),
            toId: k.to.azonosito,
            toNev: k.to.nev,
            tipus: k.tipus as TokezelesTipus,
            keszitmeny: k.keszitmeny,
            hatoanyag: k.hatoanyag,
            mennyiseg: Number(k.mennyiseg),
            egyseg: k.egyseg,
            koltsegFt: k.koltsegFt,
            varakozasiIdoNap: k.varakozasiIdoNap,
            varakozasVege: veg?.toISOString() ?? null,
            varakozasTart: veg != null && veg.getTime() > most,
            kezelesOka: k.kezelesOka,
            megjegyzes: k.megjegyzes,
            rogzitoNev: rogzitoMegjelenites(k.rogzito),
            modosithato: modosithatjaTokezeles(auth.role, k.rogzitoFelhasznaloId, auth.user.azonosito),
        };
    });

    const terulet = new Map(toak.map((t) => [t.azonosito, t.teruletHa == null ? null : Number(t.teruletHa)]));

    return NextResponse.json({
        kezelesek,
        osszesites: osszesitTokezeles(kezelesek, terulet),
        aktivVarakozasok,
        viewerRole: auth.role,
    });
}

/**
 * POST /api/halaszatok/[hid]/tokezelesek — új kezelés. STAFF+ (bármely tag).
 * A rögzítő a sessionből; a tó tenant-ellenőrzött; naplóbejegyzés (TOKEZELES) ugyanabban a tranzakcióban.
 */
export async function POST(req: Request, context: { params: Promise<{ hid: string }> }) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const r = ellenorizTokezeles(await req.json().catch(() => null));
    if (!r.ok) return jsonError(r.hiba);
    const a = r.adat;

    const to = await prisma.to.findFirst({ where: { azonosito: a.toId, halaszatId }, select: { azonosito: true } });
    if (!to) return jsonError("A tóegység nem ehhez a halászathoz tartozik.", 404);

    const kezeles = await prisma.$transaction(async (tx) => {
        const k = await tx.tokezeles.create({
            data: { halaszatId, ...a, rogzitoFelhasznaloId: auth.user.azonosito },
            select: { azonosito: true },
        });
        await tx.naploEsemeny.create({
            data: {
                tipus: "TOKEZELES",
                toId: a.toId,
                halaszatId,
                datum: a.datum,
                cim: naploCim(a),
                leiras: naploLeiras(a),
                felhasznaloId: auth.user.azonosito,
                kapcsolodoEntitasTipus: "Tokezeles",
                kapcsolodoEntitasId: k.azonosito,
                reszletekJson: { tipus: a.tipus, mennyiseg: a.mennyiseg, egyseg: a.egyseg, koltsegFt: a.koltsegFt, varakozasiIdoNap: a.varakozasiIdoNap },
            },
        });
        return k;
    });

    return NextResponse.json({ id: kezeles.azonosito }, { status: 201 });
}
