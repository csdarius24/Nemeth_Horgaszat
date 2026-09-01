import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";
import {
    ciklusOsszegzes,
    ervenyesHalkeltesStatusz,
    type Protokoll,
} from "@/lib/halkeltes/szamitas";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/** Opcionális pozitív/nemnegatív szám a kérés törzséből, vagy null. */
function opcSzam(x: unknown): number | null {
    if (x == null || x === "") return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/halaszatok/[hid]/halkeltes/ciklusok
 * Keltetési ciklusok listája összegzésekkel. STAFF+; tenant-izolált.
 */
export async function GET(
    _req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const ciklusok = await prisma.halkeltetesCiklus.findMany({
        where: { halaszatId },
        orderBy: { datum: "desc" },
        select: {
            azonosito: true,
            nev: true,
            datum: true,
            oltasIdopont: true,
            homersekletC: true,
            statusz: true,
            rahagyasSzorzo: true,
            ikrasEloadagMgPerKg: true,
            ikrasDontoMgPerKg: true,
            ikrasMlPerKg: true,
            tejesMgPerKg: true,
            tejesMlPerKg: true,
            halfaj: { select: { azonosito: true, nev: true } },
            rogzito: { select: { nev: true, email: true } },
            halak: {
                select: { ivar: true, tomegKg: true, ikraKg: true, tejMl: true },
            },
        },
    });

    const dec = (x: unknown) => (x == null ? null : Number(x));

    const lista = ciklusok.map((c) => {
        const p: Protokoll = {
            ikrasEloadagMgPerKg: dec(c.ikrasEloadagMgPerKg),
            ikrasDontoMgPerKg: dec(c.ikrasDontoMgPerKg),
            ikrasMlPerKg: dec(c.ikrasMlPerKg),
            tejesMgPerKg: dec(c.tejesMgPerKg),
            tejesMlPerKg: dec(c.tejesMlPerKg),
            rahagyasSzorzo: dec(c.rahagyasSzorzo),
        };
        const ikras = c.halak.filter((h) => h.ivar === "IKRAS").map((h) => ({ tomegKg: dec(h.tomegKg), ikraKg: dec(h.ikraKg) }));
        const tejes = c.halak.filter((h) => h.ivar === "TEJES").map((h) => ({ tomegKg: dec(h.tomegKg), tejMl: dec(h.tejMl) }));
        const ossz = ciklusOsszegzes(ikras, tejes, p);

        return {
            id: c.azonosito,
            nev: c.nev,
            datum: c.datum.toISOString(),
            oltasIdopont: c.oltasIdopont?.toISOString() ?? null,
            homersekletC: dec(c.homersekletC),
            statusz: c.statusz,
            halfajId: c.halfaj?.azonosito ?? null,
            halfajNev: c.halfaj?.nev ?? null,
            rogzitoNev: rogzitoMegjelenites(c.rogzito),
            osszegzes: ossz,
        };
    });

    return NextResponse.json({ ciklusok: lista, osszesen: lista.length, viewerRole: auth.role });
}

/**
 * POST /api/halaszatok/[hid]/halkeltes/ciklusok
 * Új keltetési ciklus + sorok létrehozása egy tranzakcióban + naplóesemény.
 * STAFF+ (a ciklus rögzítése napi hatchery-munka, halkészletet nem változtat).
 */
export async function POST(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);
    if (!body) return jsonError(" Hibas kereskes torzs.", 400);

    // Dátum
    const datum = body?.datum ? new Date(body.datum) : null;
    if (!datum || Number.isNaN(datum.getTime())) return jsonError("A datum kotelezo es ervenyes legyen.", 400);

    const oltasIdopont = body?.oltasIdopont ? new Date(body.oltasIdopont) : null;
    if (oltasIdopont && Number.isNaN(oltasIdopont.getTime())) return jsonError("Ervenytelen oltas idopont.", 400);

    const nev = typeof body?.nev === "string" ? body.nev.trim() || null : null;
    const megjegyzes = typeof body?.megjegyzes === "string" ? body.megjegyzes.trim() || null : null;
    const homersekletC = opcSzam(body?.homersekletC);

    const statusz = ervenyesHalkeltesStatusz(body?.statusz) ? body.statusz : "TERVEZET";

    // Halfaj (opcionális) — tenant-ellenőrzéssel
    const halfajId = body?.halfajId != null ? szam(body.halfajId, 0) : 0;
    if (halfajId) {
        const halfaj = await prisma.halfaj.findFirst({
            where: { azonosito: halfajId, halaszatId },
            select: { azonosito: true },
        });
        if (!halfaj) return jsonError("A halfaj nem ehhez a halaszathoz tartozik.", 404);
    }

    // Protokoll: ha protokollId jött, azt vesszük (tenant-ellenőrzéssel) és
    // snapshoteljük; egyébként a body-ban küldött inline értékeket.
    const protokollId = body?.protokollId != null ? szam(body.protokollId, 0) : 0;
    let snapshot: Protokoll = {
        ikrasEloadagMgPerKg: opcSzam(body?.protokoll?.ikrasEloadagMgPerKg),
        ikrasDontoMgPerKg: opcSzam(body?.protokoll?.ikrasDontoMgPerKg),
        ikrasMlPerKg: opcSzam(body?.protokoll?.ikrasMlPerKg),
        tejesMgPerKg: opcSzam(body?.protokoll?.tejesMgPerKg),
        tejesMlPerKg: opcSzam(body?.protokoll?.tejesMlPerKg),
        rahagyasSzorzo: opcSzam(body?.protokoll?.rahagyasSzorzo) ?? 1.10,
    };
    if (protokollId) {
        const prot = await prisma.halkeltetesProtokoll.findFirst({
            where: { azonosito: protokollId, halaszatId },
            select: {
                ikrasEloadagMgPerKg: true, ikrasDontoMgPerKg: true, ikrasMlPerKg: true,
                tejesMgPerKg: true, tejesMlPerKg: true, rahagyasSzorzo: true,
            },
        });
        if (!prot) return jsonError("A protokoll nem ehhez a halaszathoz tartozik.", 404);
        snapshot = {
            ikrasEloadagMgPerKg: Number(prot.ikrasEloadagMgPerKg),
            ikrasDontoMgPerKg: Number(prot.ikrasDontoMgPerKg),
            ikrasMlPerKg: Number(prot.ikrasMlPerKg),
            tejesMgPerKg: Number(prot.tejesMgPerKg),
            tejesMlPerKg: Number(prot.tejesMlPerKg),
            rahagyasSzorzo: Number(prot.rahagyasSzorzo),
        };
    }

    // Sorok
    const ikrasBe = Array.isArray(body?.ikrasSorok) ? body.ikrasSorok : [];
    const tejesBe = Array.isArray(body?.tejesSorok) ? body.tejesSorok : [];

    const ikrasSorok = ikrasBe.map((s: any, i: number) => ({
        ivar: "IKRAS" as const,
        sorszam: s?.sorszam != null ? szam(s.sorszam, i + 1) : i + 1,
        chipAzonosito: typeof s?.chipAzonosito === "string" ? s.chipAzonosito.trim() || null : null,
        fajtaJeloles: typeof s?.fajtaJeloles === "string" ? s.fajtaJeloles.trim() || null : null,
        tomegKg: opcSzam(s?.tomegKg),
        ikraKg: opcSzam(s?.ikraKg),
        megjegyzes: typeof s?.megjegyzes === "string" ? s.megjegyzes.trim() || null : null,
    }));
    const tejesSorok = tejesBe.map((s: any, i: number) => ({
        ivar: "TEJES" as const,
        sorszam: s?.sorszam != null ? szam(s.sorszam, i + 1) : i + 1,
        chipAzonosito: typeof s?.chipAzonosito === "string" ? s.chipAzonosito.trim() || null : null,
        fajtaJeloles: typeof s?.fajtaJeloles === "string" ? s.fajtaJeloles.trim() || null : null,
        tomegKg: opcSzam(s?.tomegKg),
        tejMl: opcSzam(s?.tejMl),
        megjegyzes: typeof s?.megjegyzes === "string" ? s.megjegyzes.trim() || null : null,
    }));

    const osszegzes = ciklusOsszegzes(
        ikrasSorok.map((s: { tomegKg: number | null; ikraKg: number | null }) => ({ tomegKg: s.tomegKg, ikraKg: s.ikraKg })),
        tejesSorok.map((s: { tomegKg: number | null; tejMl: number | null }) => ({ tomegKg: s.tomegKg, tejMl: s.tejMl })),
        snapshot
    );

    try {
        const ciklus = await prisma.$transaction(async (tx) => {
            const c = await tx.halkeltetesCiklus.create({
                data: {
                    halaszatId,
                    halfajId: halfajId || null,
                    protokollId: protokollId || null,
                    nev,
                    datum,
                    oltasIdopont,
                    homersekletC,
                    statusz,
                    megjegyzes,
                    ikrasEloadagMgPerKg: snapshot.ikrasEloadagMgPerKg,
                    ikrasDontoMgPerKg: snapshot.ikrasDontoMgPerKg,
                    ikrasMlPerKg: snapshot.ikrasMlPerKg,
                    tejesMgPerKg: snapshot.tejesMgPerKg,
                    tejesMlPerKg: snapshot.tejesMlPerKg,
                    rahagyasSzorzo: snapshot.rahagyasSzorzo,
                    rogzitoFelhasznaloId: auth.user.azonosito,
                    halak: {
                        create: [...ikrasSorok, ...tejesSorok],
                    },
                },
                select: { azonosito: true, nev: true, datum: true },
            });

            // Naplóesemény — tóhoz NEM kötött (toId null), tenant a halaszatId-n.
            const halfajNev = halfajId
                ? (await tx.halfaj.findUnique({ where: { azonosito: halfajId }, select: { nev: true } }))?.nev ?? null
                : null;

            await tx.naploEsemeny.create({
                data: {
                    tipus: "HALKELTES",
                    toId: null,
                    halaszatId,
                    halfajId: halfajId || null,
                    datum,
                    cim: `Halkeltetési ciklus${nev ? ` — ${nev}` : ""}`,
                    leiras: [
                        `Halkeltetési ciklus rögzítve`,
                        halfajNev ? `faj: ${halfajNev}` : null,
                        `ikrás: ${osszegzes.ikrasDarab} db (${osszegzes.ikrasOsszKg} kg)`,
                        `tejes: ${osszegzes.tejesDarab} db (${osszegzes.tejesOsszKg} kg)`,
                        osszegzes.ikraOsszKg > 0 ? `ikra: ${osszegzes.ikraOsszKg} kg` : null,
                    ].filter(Boolean).join(" • "),
                    felhasznaloId: auth.user.azonosito,
                    kapcsolodoEntitasTipus: "HalkeltetesCiklus",
                    kapcsolodoEntitasId: c.azonosito,
                    reszletekJson: {
                        ikrasDarab: osszegzes.ikrasDarab,
                        tejesDarab: osszegzes.tejesDarab,
                        ikrasOsszKg: osszegzes.ikrasOsszKg,
                        tejesOsszKg: osszegzes.tejesOsszKg,
                        ikraOsszKg: osszegzes.ikraOsszKg,
                    },
                },
            });

            return c;
        });

        return NextResponse.json(
            { ok: true, ciklus: { id: ciklus.azonosito, nev: ciklus.nev, datum: ciklus.datum.toISOString() }, osszegzes },
            { status: 201 }
        );
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba a ciklus letrehozasakor.", err?.status ?? 500);
    }
}
