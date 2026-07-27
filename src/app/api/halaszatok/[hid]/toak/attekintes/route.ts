import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import {
    becsultAllomanyKg,
    foFajok,
    szamitTakarmanyFedezet,
    szamitTelitettseg,
    szamitAllapot,
} from "@/lib/toak/attekintes";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/** Eltelt egész napok száma egy időpont óta. */
function elteltNap(mikor: Date | null | undefined, most: Date): number | null {
    if (!mikor) return null;
    const d = mikor instanceof Date ? mikor : new Date(mikor);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((most.getTime() - d.getTime()) / 86_400_000));
}

/**
 * GET /api/halaszatok/[hid]/toak/attekintes
 * Vízegység-áttekintés: egy sor minden tóhoz/telelőhöz, a kártyákhoz szükséges
 * összes adattal. Csak olvasás (nem ír adatot).
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);

    // Halászat-szintű hozzáférés (tenant-izoláció: minden lekérdezés halaszatId-re szűr)
    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const url = new URL(req.url);
    const days = Math.min(Math.max(szam(url.searchParams.get("days") ?? "30", 30), 1), 90);

    const most = new Date();
    const fromDate = new Date(most);
    fromDate.setDate(fromDate.getDate() - days);

    // ── Vízegységek + állomány ────────────────────────────────────────────────
    const toak = await prisma.to.findMany({
        where: { halaszatId },
        orderBy: { nev: "asc" },
        select: {
            azonosito: true,
            nev: true,
            tipus: true,
            aktiv: true,
            teruletHa: true,
            atlagMelysegMeter: true,
            kapacitasKg: true,
            halAllomanyok: {
                where: { darab: { gt: 0 } },
                select: {
                    darab: true,
                    minTomegKg: true,
                    maxTomegKg: true,
                    halfaj: { select: { nev: true } },
                },
            },
        },
    });

    const toIds = toak.map((t) => t.azonosito);

    // ── Utolsó etetés / utolsó művelet / időszaki etetés tavankent ────────────
    const [utolsoEtetesek, etetesOsszegek, utolsoEsemenyek] = toIds.length > 0
        ? await Promise.all([
            prisma.etetes.groupBy({
                by: ["toId"],
                where: { toId: { in: toIds } },
                _max: { datum: true },
            }),
            prisma.etetes.groupBy({
                by: ["toId"],
                where: { toId: { in: toIds }, datum: { gte: fromDate } },
                _sum: { mennyisegKg: true },
            }),
            prisma.naploEsemeny.groupBy({
                by: ["toId"],
                where: { toId: { in: toIds } },
                _max: { datum: true },
            }),
        ])
        : [[], [], []];

    const utolsoEtetesMap = new Map(utolsoEtetesek.map((e) => [e.toId, e._max.datum ?? null]));
    const etetesOsszegMap = new Map(etetesOsszegek.map((e) => [e.toId, Number(e._sum.mennyisegKg ?? 0)]));
    const utolsoEsemenyMap = new Map(utolsoEsemenyek.map((e) => [e.toId, e._max.datum ?? null]));

    // ── Halászat-szintű (MEGOSZTOTT) takarmánykészlet ─────────────────────────
    const takarmanyAgg = await prisma.takarmany.aggregate({
        where: { halaszatId, aktiv: true },
        _sum: { keszlet: true },
    });
    const takarmanyKeszletKg = Number(takarmanyAgg._sum.keszlet ?? 0);

    // Halászat-szintű átlagos napi etetés (az egész időszakra vetítve)
    const osszEtetesKg = [...etetesOsszegMap.values()].reduce((s, v) => s + v, 0);
    const halaszatAtlagNapiKg = osszEtetesKg / days;
    const halaszatFedezetNap = szamitTakarmanyFedezet(takarmanyKeszletKg, halaszatAtlagNapiKg);

    // ── Kártyasorok ───────────────────────────────────────────────────────────
    const egysegek = toak.map((t) => {
        const tetelek = t.halAllomanyok.map((a) => ({
            halfajNev: a.halfaj.nev,
            darab: a.darab,
            minTomegKg: Number(a.minTomegKg),
            maxTomegKg: Number(a.maxTomegKg),
        }));

        const becsult = becsultAllomanyKg(tetelek);
        const kapacitasKg = t.kapacitasKg == null ? null : Number(t.kapacitasKg);

        const idoszakiEtetesKg = etetesOsszegMap.get(t.azonosito) ?? 0;
        const atlagNapiEtetesKg = Math.round((idoszakiEtetesKg / days) * 100) / 100;

        // Per-vízegység fedezet: a MEGOSZTOTT készlet hány napra elegendő, ha csak
        // ez az egység fogyasztana a jelenlegi ütemével. (A készlet halászat-szintű!)
        const fedezetNap = szamitTakarmanyFedezet(takarmanyKeszletKg, atlagNapiEtetesKg);

        const utolsoEtetes = utolsoEtetesMap.get(t.azonosito) ?? null;
        const utolsoEsemeny = utolsoEsemenyMap.get(t.azonosito) ?? null;

        const allapot = szamitAllapot({
            vanAllomany: becsult.darab > 0,
            utolsoEsemenyNapja: elteltNap(utolsoEsemeny, most),
            fedezetNap,
        });

        return {
            azonosito: t.azonosito,
            nev: t.nev,
            tipus: t.tipus,
            aktiv: t.aktiv,

            // Műszaki adatok (opcionálisak — hiányzáskor null → "nincs adat")
            teruletHa: t.teruletHa == null ? null : Number(t.teruletHa),
            atlagMelysegMeter: t.atlagMelysegMeter == null ? null : Number(t.atlagMelysegMeter),
            kapacitasKg,

            // Állomány
            allomanyDarab: becsult.darab,
            allomanyKg: becsult.kg,
            allomanyBecsultReszleges: becsult.reszleges,
            foFajok: foFajok(tetelek),

            // Etetés
            utolsoEtetes: utolsoEtetes ? utolsoEtetes.toISOString() : null,
            utolsoEtetesNapja: elteltNap(utolsoEtetes, most),
            atlagNapiEtetesKg,
            fedezetNap,

            // Utolsó bármilyen művelet
            utolsoEsemeny: utolsoEsemeny ? utolsoEsemeny.toISOString() : null,
            utolsoEsemenyNapja: elteltNap(utolsoEsemeny, most),

            // Mutatók
            telitettsegSzazalek: szamitTelitettseg(becsult.kg, kapacitasKg),
            // NINCS vízminőség-modul és NINCS halegészség-modell → szándékosan null.
            vizminosegPont: null as number | null,
            egeszsegPont: null as number | null,

            allapot,
        };
    });

    return NextResponse.json({
        egysegek,
        osszesen: egysegek.length,
        days,
        viewerRole: auth.role,
        takarmany: {
            // A készlet halászat-szintű (megosztott), nem tavankénti.
            keszletKg: Math.round(takarmanyKeszletKg * 100) / 100,
            halaszatAtlagNapiKg: Math.round(halaszatAtlagNapiKg * 100) / 100,
            halaszatFedezetNap,
        },
        // Átláthatóság: mely mutatókhoz nincs még adatforrás.
        nincsAdatForras: {
            vizminoseg: "Nincs vízminőség-modul (SZD2).",
            egeszseg: "Nincs halegészség-modell (SZD2).",
        },
    });
}
