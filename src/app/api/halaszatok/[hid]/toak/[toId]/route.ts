import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { assertToBelongsToTenant } from "@/lib/tenant/assertToBelongsToTenant";
import { korvonalMezok } from "@/lib/terkep/geo";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export async function GET(
    req: Request,
    context: { params: Promise<{ hid: string; toId: string }> }
) {
    const params = await context.params;
    const halaszatId = szam(params.hid, 0);
    const toId = szam(params.toId, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!toId) return jsonError("Hibás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    try {
        const to = await assertToBelongsToTenant(toId, halaszatId);

        const allomanyok = await prisma.halAllomany.findMany({
            where: { toId: to.azonosito },
            orderBy: { halfajId: "asc" },
            select: {
                azonosito: true,
                darab: true,
                minTomegKg: true,
                maxTomegKg: true,
                halfaj: { select: { azonosito: true, nev: true } },
            },
        });

        return NextResponse.json({
            to,
            allomanyok,
        });
    } catch (err: any) {
        return jsonError(err?.message ?? "Hiba történt a tó adatainak lekérésekor.", err?.status ?? 500);
    }
}

/** Opcionális pozitív szám: üres → null (törlés), érvénytelen → undefined (hiba). */
function muszakiErtek(x: unknown): number | null | undefined {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * PATCH /api/halaszatok/[hid]/toak/[toId]
 * Tóegység alap- és műszaki adatainak szerkesztése (ADMIN+).
 * Csak a törzsben szereplő mezők változnak. A vízkapacitás nem törölhető.
 */
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; toId: string }> }
) {
    const params = await context.params;
    const halaszatId = szam(params.hid, 0);
    const toId = szam(params.toId, 0);
    if (!halaszatId) return jsonError("Hibás halászat azonosító.", 400);
    if (!toId) return jsonError("Hibás tó azonosító.", 400);

    const auth = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    try {
        await assertToBelongsToTenant(toId, halaszatId);
    } catch (err) {
        const e = err as { message?: string; status?: number };
        return jsonError(e?.message ?? "A tó nem található.", e?.status ?? 404);
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if ("nev" in body) {
        const nev = typeof body.nev === "string" ? body.nev.trim() : "";
        if (nev.length < 2) return jsonError("A tó neve legalább 2 karakter legyen.");
        data.nev = nev;
    }

    const MEZOK = [
        ["teruletHa", "terület"],
        ["atlagMelysegMeter", "átlagmélység"],
        ["kapacitasKg", "eltartóképesség"],
        ["vizkapacitasM3", "vízkapacitás"],
    ] as const;

    for (const [mezo, cimke] of MEZOK) {
        if (!(mezo in body)) continue;
        const ertek = muszakiErtek(body[mezo]);
        if (ertek === undefined) return jsonError(`Érvénytelen ${cimke}: pozitív szám kell.`);
        if (mezo === "vizkapacitasM3" && ertek === null) return jsonError("A vízkapacitás nem törölhető, csak módosítható.");
        data[mezo] = ertek;
    }

    // Körvonal: módosítható, de nem törölhető (térkép + műholdas elemzés alapja).
    if ("korvonal" in body) {
        if (body.korvonal == null) return jsonError("A körvonal nem törölhető, csak újrarajzolható.");
        const k = korvonalMezok(body.korvonal);
        if (!k.ok) return jsonError(k.hiba);
        Object.assign(data, k.mezok);
    }

    if (Object.keys(data).length === 0) return jsonError("Nincs módosítandó adat.");

    const to = await prisma.to.update({
        where: { azonosito: toId },
        data,
        select: {
            azonosito: true, nev: true, tipus: true,
            teruletHa: true, atlagMelysegMeter: true, kapacitasKg: true, vizkapacitasM3: true,
        },
    });

    return NextResponse.json({ to });
}