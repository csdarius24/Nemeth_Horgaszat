import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { canModositNaploEsemeny } from "@/lib/roles";
import { rogzitoMegjelenites } from "@/lib/audit/rogzito";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

/**
 * PATCH /api/halaszatok/[hid]/naplo/[id]
 *
 * Naplóbejegyzés javítása / érvénytelenítése / visszaállítása.
 *
 * AUDIT-ELV (fontos): fizikai törlés NINCS. A hibás bejegyzést érvényteleníteni
 * lehet (`ervenyes: false` + kötelező indok) — a sor megmarad, láthatóan
 * áthúzva, és kiesik az összegzésekből. Szerkeszteni CSAK a szöveges mezőket
 * (`cim`, `leiras`) lehet: a mennyiségi mezők a tényleges műveleti rekordot
 * (Etetes/Kivetel/Telepites/TakarmanyMozgas) tükrözik, ezért a naplóban nem
 * írhatók felül — különben a napló hazudna a műveletről.
 *
 * FIGYELEM: az érvénytelenítés a naplóbejegyzést érvényteleníti, de NEM állítja
 * vissza a hal- vagy takarmánykészletet. A készlet korrekciója külön,
 * kompenzáló művelettel történik (lásd docs).
 *
 * Body: { cim?: string, leiras?: string, ervenyes?: boolean, ervenytelenitesOka?: string }
 * Jogosultság: ADMIN vagy OWNER.
 */
export async function PATCH(
    req: Request,
    context: { params: Promise<{ hid: string; id: string }> }
) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const azonosito = szam(id, 0);
    if (!halaszatId) return jsonError("Hibas halaszat azonosito.", 400);
    if (!azonosito) return jsonError("Hibas naplobejegyzes azonosito.", 400);

    // Belépés + tagság ellenőrzés (STAFF szint), a finomabb szabály alább.
    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    if (!canModositNaploEsemeny(auth.role)) {
        return jsonError("A naplo javitasa/ervenytelenitese ADMIN vagy OWNER jogosultsagot igenyel.", 403);
    }

    // Tenant-izoláció: a bejegyzés vagy közvetlenül, vagy a tón keresztül kötődik.
    const meglevo = await prisma.naploEsemeny.findFirst({
        where: {
            azonosito,
            OR: [{ halaszatId }, { to: { halaszatId } }],
        },
        select: { azonosito: true, ervenyes: true },
    });
    if (!meglevo) return jsonError("A naplobejegyzes nem talalhato.", 404);

    const body = await req.json().catch(() => null);
    const most = new Date();

    const adat: Record<string, unknown> = {};
    let szovegValtozott = false;

    if (typeof body?.cim === "string") {
        const cim = body.cim.trim();
        if (!cim) return jsonError("A cim nem lehet ures.", 400);
        if (cim.length > 200) return jsonError("A cim legfeljebb 200 karakter lehet.", 400);
        adat.cim = cim;
        szovegValtozott = true;
    }

    if (typeof body?.leiras === "string") {
        adat.leiras = body.leiras.trim() || null;
        szovegValtozott = true;
    }

    if (szovegValtozott) {
        adat.szerkesztveAt = most;
        adat.szerkesztoFelhasznaloId = auth.user.azonosito;
    }

    if (typeof body?.ervenyes === "boolean") {
        if (body.ervenyes === false) {
            const oka = typeof body?.ervenytelenitesOka === "string" ? body.ervenytelenitesOka.trim() : "";
            if (oka.length < 3) {
                return jsonError("Az ervenytelenites indoka kotelezo (min. 3 karakter).", 400);
            }
            if (oka.length > 300) {
                return jsonError("Az indok legfeljebb 300 karakter lehet.", 400);
            }
            adat.ervenyes = false;
            adat.ervenytelenitveAt = most;
            adat.ervenytelenitesOka = oka;
            adat.ervenytelenitoFelhasznaloId = auth.user.azonosito;
        } else {
            // Visszaállítás: az érvénytelenítés nyoma törlődik, de a szerkesztés
            // ténye (szerkesztveAt) megmarad.
            adat.ervenyes = true;
            adat.ervenytelenitveAt = null;
            adat.ervenytelenitesOka = null;
            adat.ervenytelenitoFelhasznaloId = null;
        }
    }

    if (Object.keys(adat).length === 0) {
        return jsonError("Nincs modositando mezo (cim, leiras vagy ervenyes).", 400);
    }

    const frissitett = await prisma.naploEsemeny.update({
        where: { azonosito },
        data: adat,
        select: {
            azonosito: true,
            cim: true,
            leiras: true,
            ervenyes: true,
            ervenytelenitveAt: true,
            ervenytelenitesOka: true,
            szerkesztveAt: true,
            ervenytelenito: { select: { nev: true, email: true } },
            szerkeszto: { select: { nev: true, email: true } },
        },
    });

    return NextResponse.json({
        ok: true,
        bejegyzes: {
            id: frissitett.azonosito,
            cim: frissitett.cim,
            leiras: frissitett.leiras,
            ervenyes: frissitett.ervenyes,
            ervenytelenitveAt: frissitett.ervenytelenitveAt?.toISOString() ?? null,
            ervenytelenitesOka: frissitett.ervenytelenitesOka,
            ervenytelenitoNev: rogzitoMegjelenites(frissitett.ervenytelenito),
            szerkesztveAt: frissitett.szerkesztveAt?.toISOString() ?? null,
            szerkesztoNev: rogzitoMegjelenites(frissitett.szerkeszto),
        },
    });
}
