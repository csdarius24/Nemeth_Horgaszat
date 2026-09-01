import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    ciklusOsszegzes,
    ikrasSorSzamitas,
    tejesSorSzamitas,
    ervenyesHalkeltesStatusz,
    type Protokoll,
} from "@/lib/halkeltes/szamitas";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

const dec = (x: unknown) => (x == null ? null : Number(x));

async function ciklusTenantben(halaszatId: number, azonosito: number) {
    return prisma.halkeltetesCiklus.findFirst({
        where: { azonosito, halaszatId },
        select: {
            azonosito: true, nev: true, datum: true, oltasIdopont: true, homersekletC: true,
            statusz: true, megjegyzes: true,
            ikrasEloadagMgPerKg: true, ikrasDontoMgPerKg: true, ikrasMlPerKg: true,
            tejesMgPerKg: true, tejesMlPerKg: true, rahagyasSzorzo: true,
            halfaj: { select: { azonosito: true, nev: true } },
            rogzito: { select: { nev: true, email: true } },
            letrehozva: true,
            halak: {
                orderBy: [{ ivar: "asc" }, { sorszam: "asc" }],
                select: {
                    azonosito: true, ivar: true, sorszam: true, chipAzonosito: true,
                    fajtaJeloles: true, tomegKg: true, ikraKg: true, tejMl: true, megjegyzes: true,
                },
            },
        },
    });
}

/** GET egy ciklus — teljes soradatokkal és per-soros számított adagokkal. */
export async function GET(
    _req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas ciklus azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const c = await ciklusTenantben(halaszatId, azonosito);
    if (!c) return jsonError("A ciklus nem talalhato.", 404);

    const p: Protokoll = {
        ikrasEloadagMgPerKg: dec(c.ikrasEloadagMgPerKg),
        ikrasDontoMgPerKg: dec(c.ikrasDontoMgPerKg),
        ikrasMlPerKg: dec(c.ikrasMlPerKg),
        tejesMgPerKg: dec(c.tejesMgPerKg),
        tejesMlPerKg: dec(c.tejesMlPerKg),
        rahagyasSzorzo: dec(c.rahagyasSzorzo),
    };

    const ikrasSorok = c.halak.filter((h) => h.ivar === "IKRAS").map((h) => {
        const sz = ikrasSorSzamitas({ tomegKg: dec(h.tomegKg) }, p);
        return {
            id: h.azonosito, sorszam: h.sorszam, chipAzonosito: h.chipAzonosito,
            fajtaJeloles: h.fajtaJeloles, tomegKg: dec(h.tomegKg), ikraKg: dec(h.ikraKg),
            megjegyzes: h.megjegyzes, szamitott: sz,
        };
    });
    const tejesSorok = c.halak.filter((h) => h.ivar === "TEJES").map((h) => {
        const sz = tejesSorSzamitas({ tomegKg: dec(h.tomegKg) }, p);
        return {
            id: h.azonosito, sorszam: h.sorszam, chipAzonosito: h.chipAzonosito,
            fajtaJeloles: h.fajtaJeloles, tomegKg: dec(h.tomegKg), tejMl: dec(h.tejMl),
            megjegyzes: h.megjegyzes, szamitott: sz,
        };
    });

    const osszegzes = ciklusOsszegzes(
        ikrasSorok.map((s) => ({ tomegKg: s.tomegKg, ikraKg: s.ikraKg })),
        tejesSorok.map((s) => ({ tomegKg: s.tomegKg, tejMl: s.tejMl })),
        p
    );

    return NextResponse.json({
        ciklus: {
            id: c.azonosito, nev: c.nev, datum: c.datum.toISOString(),
            oltasIdopont: c.oltasIdopont?.toISOString() ?? null,
            homersekletC: dec(c.homersekletC), statusz: c.statusz, megjegyzes: c.megjegyzes,
            halfajId: c.halfaj?.azonosito ?? null, halfajNev: c.halfaj?.nev ?? null,
            rogzitoNev: rogzitoMegjelenites(c.rogzito),
            letrehozva: c.letrehozva.toISOString(),
            protokoll: p,
        },
        ikrasSorok, tejesSorok, osszegzes,
        viewerRole: auth.role,
    });
}

/** PATCH — fejadatok / státusz módosítása (a sorok újraszerkesztése későbbi sprint). */
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas ciklus azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const meglevo = await prisma.halkeltetesCiklus.findFirst({
        where: { azonosito, halaszatId },
        select: { azonosito: true },
    });
    if (!meglevo) return jsonError("A ciklus nem talalhato.", 404);

    const body = await req.json().catch(() => null);
    const adat: Record<string, unknown> = {};

    if (typeof body?.nev === "string") adat.nev = body.nev.trim() || null;
    if (typeof body?.megjegyzes === "string") adat.megjegyzes = body.megjegyzes.trim() || null;
    if ("homersekletC" in (body ?? {})) {
        const h = body.homersekletC;
        adat.homersekletC = h == null || h === "" ? null : (Number.isFinite(Number(h)) ? Number(h) : null);
    }
    if (body?.oltasIdopont) {
        const d = new Date(body.oltasIdopont);
        if (Number.isNaN(d.getTime())) return jsonError("Ervenytelen oltas idopont.", 400);
        adat.oltasIdopont = d;
    }
    if (body?.statusz != null) {
        if (!ervenyesHalkeltesStatusz(body.statusz)) return jsonError("Ervenytelen statusz.", 400);
        adat.statusz = body.statusz;
    }

    if (Object.keys(adat).length === 0) return jsonError("Nincs modositando mezo.", 400);

    const frissitett = await prisma.halkeltetesCiklus.update({
        where: { azonosito },
        data: adat,
        select: { azonosito: true, nev: true, statusz: true, megjegyzes: true, homersekletC: true, oltasIdopont: true },
    });

    return NextResponse.json({
        ok: true,
        ciklus: {
            id: frissitett.azonosito, nev: frissitett.nev, statusz: frissitett.statusz,
            megjegyzes: frissitett.megjegyzes, homersekletC: dec(frissitett.homersekletC),
            oltasIdopont: frissitett.oltasIdopont?.toISOString() ?? null,
        },
    });
}
