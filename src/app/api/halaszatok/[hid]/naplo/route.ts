import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    esemenyCim,
    esemenyTipusCimke,
    ervenyesEsemenyTipus,
    periodusHatarok,
} from "@/lib/naplo/format";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/**
 * GET /api/halaszatok/[hid]/naplo — Halászati napló (központi műveleti napló).
 *
 * Query: q, tipus, toId, from, to (ISO dátum), period=day|week|month + date=YYYY-MM-DD,
 *        limit (alap 100, max 200).
 *
 * Tenant-izoláció: a régi sorok a tón keresztül (to.halaszatId), az újak a
 * közvetlen halaszatId mezőn keresztül kötődnek — mindkettőt szűrjük (OR).
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const tipusParam = (url.searchParams.get("tipus") ?? "").trim();
    const toIdParam = szam(url.searchParams.get("toId") ?? "0", 0);
    const limit = Math.min(Math.max(szam(url.searchParams.get("limit") ?? "100", 100), 1), 200);

    // ── Időszak: period+date az elsődleges, különben from/to ─────────────────
    const period = url.searchParams.get("period");
    const dateParam = url.searchParams.get("date");
    let tol: Date | null = null;
    let ig: Date | null = null;

    if (period) {
        const ma = new Date().toISOString().slice(0, 10);
        const hatarok = periodusHatarok(period, dateParam ?? ma);
        if (!hatarok) return jsonError("Ervenytelen period/date parameter.", 400);
        tol = hatarok.tol;
        ig = hatarok.ig;
    } else {
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        if (fromParam) {
            const d = new Date(fromParam);
            if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen from datum.", 400);
            tol = d;
        }
        if (toParam) {
            const d = new Date(toParam);
            if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen to datum.", 400);
            ig = d;
        }
    }

    if (tipusParam && !ervenyesEsemenyTipus(tipusParam)) {
        return jsonError("Ervenytelen esemenytipus.", 400);
    }

    // ── Szűrés (tenant-izoláció + opcionális szűrők) ─────────────────────────
    const tenantScope = { OR: [{ halaszatId }, { to: { halaszatId } }] };
    const where = {
        AND: [
            tenantScope,
            ...(tipusParam ? [{ tipus: tipusParam as never }] : []),
            ...(toIdParam ? [{ toId: toIdParam }] : []),
            ...(tol ? [{ datum: { gte: tol } }] : []),
            ...(ig ? [{ datum: { lt: ig } }] : []),
            ...(q
                ? [{
                    OR: [
                        { leiras: { contains: q } },
                        { cim: { contains: q } },
                    ],
                }]
                : []),
        ],
    };

    const [nyersek, talalatOsszesen, tenantOsszesen] = await Promise.all([
        prisma.naploEsemeny.findMany({
            where,
            orderBy: { datum: "desc" },
            take: limit,
            select: {
                azonosito: true,
                tipus: true,
                datum: true,
                cim: true,
                leiras: true,
                darab: true,
                mennyisegKg: true,
                ervenyes: true,
                reszletekJson: true,
                kapcsolodoEntitasTipus: true,
                kapcsolodoEntitasId: true,
                toId: true,
                to: { select: { azonosito: true, nev: true } },
                halfaj: { select: { nev: true } },
                felhasznaloId: true,
                felhasznalo: { select: { nev: true, email: true } },
            },
        }),
        prisma.naploEsemeny.count({ where }),
        prisma.naploEsemeny.count({ where: tenantScope }),
    ]);

    const esemenyek = nyersek.map(({ felhasznalo, halfaj, to, ...e }) => ({
        id: e.azonosito,
        tipus: e.tipus,
        tipusCimke: esemenyTipusCimke(e.tipus),
        cim: esemenyCim({ tipus: e.tipus, cim: e.cim, toNev: to?.nev ?? null, halfajNev: halfaj?.nev ?? null }),
        leiras: e.leiras,
        datum: e.datum.toISOString(),
        rogzitoNev: rogzitoMegjelenites(felhasznalo),
        toId: e.toId,
        toNev: to?.nev ?? null,
        halfajNev: halfaj?.nev ?? null,
        mennyisegKg: e.mennyisegKg == null ? null : Number(e.mennyisegKg),
        darab: e.darab,
        ervenyes: e.ervenyes,
        reszletek: e.reszletekJson ?? null,
        kapcsolodoEntitasTipus: e.kapcsolodoEntitasTipus,
        kapcsolodoEntitasId: e.kapcsolodoEntitasId,
    }));

    return NextResponse.json({
        esemenyek,
        talalatOsszesen,
        tenantOsszesen,
        limit,
        idoszak: tol || ig
            ? { tol: tol?.toISOString() ?? null, ig: ig?.toISOString() ?? null }
            : null,
    });
}
