import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    canManageFeladat,
    canStaffFrissitStatusz,
    staffAllithatStatusz,
    ervenyesStatusz,
    ervenyesPrioritas,
    normalizaltSzin,
    elkeszultAtValtozas,
    lejart,
} from "@/lib/feladatok/format";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/** GET egy feladat. */
export async function GET(
    _req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId || !azonosito) return jsonError("Hibas azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const f = await prisma.feladat.findFirst({
        where: { azonosito, halaszatId },
        select: {
            azonosito: true, cim: true, leiras: true, statusz: true, prioritas: true,
            szin: true, hatarido: true, elkeszultAt: true, letrehozva: true,
            felelosFelhasznaloId: true, toId: true,
            to: { select: { azonosito: true, nev: true } },
            felelosFelhasznalo: { select: { nev: true, email: true } },
            letrehozoFelhasznalo: { select: { nev: true, email: true } },
        },
    });
    if (!f) return jsonError("A feladat nem talalhato.", 404);

    return NextResponse.json({
        feladat: {
            id: f.azonosito, cim: f.cim, leiras: f.leiras, statusz: f.statusz, prioritas: f.prioritas,
            szin: f.szin, hatarido: f.hatarido?.toISOString() ?? null,
            elkeszultAt: f.elkeszultAt?.toISOString() ?? null, letrehozva: f.letrehozva.toISOString(),
            lejart: lejart(f.hatarido, f.statusz),
            toId: f.toId, toNev: f.to?.nev ?? null,
            felelosFelhasznaloId: f.felelosFelhasznaloId,
            felelosNev: rogzitoMegjelenites(f.felelosFelhasznalo),
            letrehozoNev: rogzitoMegjelenites(f.letrehozoFelhasznalo),
        },
        viewerRole: auth.role,
    });
}

/**
 * PATCH egy feladat.
 * - ADMIN/OWNER: minden mező.
 * - STAFF: CSAK a neki kiosztott feladat STÁTUSZÁT (UJ/FOLYAMATBAN/KESZ), semmi mást.
 * A KESZ státusz beállítja az elkeszultAt-ot; a KESZ-ről váltás törli.
 */
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId || !azonosito) return jsonError("Hibas azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await prisma.feladat.findFirst({
        where: { azonosito, halaszatId },
        select: { azonosito: true, statusz: true, elkeszultAt: true, felelosFelhasznaloId: true },
    });
    if (!meglevo) return jsonError("A feladat nem talalhato.", 404);

    const kezelo = canManageFeladat(auth.role);
    const staffSajat = canStaffFrissitStatusz(auth.role, meglevo.felelosFelhasznaloId, auth.user.azonosito) && !kezelo;

    if (!kezelo && !staffSajat) {
        return jsonError("Nincs jogosultsagod ehhez a feladathoz.", 403);
    }

    const body = await req.json().catch(() => null);
    const adat: Record<string, unknown> = {};

    // ── STAFF: kizárólag a saját feladata státusza ────────────────────────────
    if (staffSajat) {
        if (body?.statusz == null) return jsonError("Dolgozokent csak a statusz modosithato.", 400);
        if (!ervenyesStatusz(body.statusz) || !staffAllithatStatusz(body.statusz)) {
            return jsonError("Dolgozokent a statusz csak: UJ, FOLYAMATBAN, KESZ.", 400);
        }
        // tiltjuk, hogy STAFF más mezőt is küldjön hatással
        const tiltott = ["cim", "leiras", "prioritas", "szin", "hatarido", "felelosFelhasznaloId", "toId"];
        if (tiltott.some((k) => k in (body ?? {}))) {
            return jsonError("Dolgozokent csak a statusz modosithato (mas mezo nem).", 403);
        }
        adat.statusz = body.statusz;
    } else {
        // ── ADMIN/OWNER: minden mező ──────────────────────────────────────────
        if (typeof body?.cim === "string") {
            const c = body.cim.trim();
            if (c.length < 2) return jsonError("A cim tul rovid.", 400);
            if (c.length > 200) return jsonError("A cim tul hosszu.", 400);
            adat.cim = c;
        }
        if ("leiras" in (body ?? {})) adat.leiras = typeof body.leiras === "string" ? body.leiras.trim() || null : null;
        if ("szin" in (body ?? {})) adat.szin = body.szin == null ? null : normalizaltSzin(body.szin);
        if (body?.prioritas != null) {
            if (!ervenyesPrioritas(body.prioritas)) return jsonError("Ervenytelen prioritas.", 400);
            adat.prioritas = body.prioritas;
        }
        if (body?.statusz != null) {
            if (!ervenyesStatusz(body.statusz)) return jsonError("Ervenytelen statusz.", 400);
            adat.statusz = body.statusz;
        }
        if ("hatarido" in (body ?? {})) {
            if (body.hatarido == null || body.hatarido === "") adat.hatarido = null;
            else { const d = new Date(body.hatarido); if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen hatarido.", 400); adat.hatarido = d; }
        }
        if ("felelosFelhasznaloId" in (body ?? {})) {
            const fid = body.felelosFelhasznaloId != null ? szam(body.felelosFelhasznaloId, 0) : 0;
            if (fid) {
                const tag = await prisma.halaszatTagsag.findFirst({ where: { halaszatId, felhasznaloId: fid, aktiv: true }, select: { azonosito: true } });
                if (!tag) return jsonError("A felelos nem aktiv tagja a halaszatnak.", 404);
            }
            adat.felelosFelhasznaloId = fid || null;
        }
        if ("toId" in (body ?? {})) {
            const tid = body.toId != null ? szam(body.toId, 0) : 0;
            if (tid) {
                const to = await prisma.to.findFirst({ where: { azonosito: tid, halaszatId }, select: { azonosito: true } });
                if (!to) return jsonError("A to nem ehhez a halaszathoz tartozik.", 404);
            }
            adat.toId = tid || null;
        }
    }

    if (Object.keys(adat).length === 0) return jsonError("Nincs modositando mezo.", 400);

    // elkeszultAt mellékhatás a státuszváltásból
    if (typeof adat.statusz === "string") {
        const valt = elkeszultAtValtozas(adat.statusz, meglevo.elkeszultAt);
        if (valt !== undefined) adat.elkeszultAt = valt;
    }

    const frissitett = await prisma.feladat.update({
        where: { azonosito },
        data: adat,
        select: {
            azonosito: true, cim: true, statusz: true, prioritas: true, szin: true,
            hatarido: true, elkeszultAt: true, felelosFelhasznaloId: true, toId: true,
        },
    });

    return NextResponse.json({
        ok: true,
        feladat: {
            id: frissitett.azonosito, cim: frissitett.cim, statusz: frissitett.statusz,
            prioritas: frissitett.prioritas, szin: frissitett.szin,
            hatarido: frissitett.hatarido?.toISOString() ?? null,
            elkeszultAt: frissitett.elkeszultAt?.toISOString() ?? null,
            felelosFelhasznaloId: frissitett.felelosFelhasznaloId, toId: frissitett.toId,
        },
    });
}
