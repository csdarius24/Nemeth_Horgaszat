import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireHalaszatRole } from "@/lib/guards";
import { canUpdateHibabejelentesStatus } from "@/lib/roles";

const ENGEDLYEZETT_STATUSZOK = ["UJ", "FOLYAMATBAN", "MEGOLDVA", "ELUTASITVA"] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Auth: bejelentkezés kötelező.
        const user = await requireUser();
        if (!user) {
            return NextResponse.json(
                { hiba: "Bejelentkezés szükséges." },
                { status: 401 }
            );
        }

        const { id } = await params;
        const azonosito = Number(id);

        if (!Number.isInteger(azonosito)) {
            return NextResponse.json(
                { hiba: "Érvénytelen hibabejelentés azonosító." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const statusz = String(body?.statusz ?? "").trim().toUpperCase();

        if (!ENGEDLYEZETT_STATUSZOK.includes(statusz as (typeof ENGEDLYEZETT_STATUSZOK)[number])) {
            return NextResponse.json(
                { hiba: "Érvénytelen státusz." },
                { status: 400 }
            );
        }

        // A bejelentést előbb betöltjük: 404, ha nincs ilyen azonosító.
        const letezo = await prisma.hibabejelentes.findUnique({
            where: { azonosito },
            select: { azonosito: true, halaszatId: true, felhasznaloId: true },
        });

        if (!letezo) {
            return NextResponse.json(
                { hiba: "Nincs ilyen hibabejelentés." },
                { status: 404 }
            );
        }

        // Jogosultság: a bejelentés SAJÁT halászatában érvényes szerepkört nézzük
        // (így tenant-átlépés kizárt). Ha nincs halászat, csak a bejelentő módosíthat.
        let viewerRole: "OWNER" | "ADMIN" | "STAFF" | null = null;
        if (letezo.halaszatId != null) {
            const auth = await requireHalaszatRole(letezo.halaszatId, "STAFF");
            if (auth.ok) {
                viewerRole = auth.role;
            }
        }

        const engedelyezett = canUpdateHibabejelentesStatus({
            bugHalaszatId: letezo.halaszatId,
            viewerRole,
            isReporter: letezo.felhasznaloId === user.azonosito,
        });

        if (!engedelyezett) {
            return NextResponse.json(
                { hiba: "Nincs jogosultságod a hibabejelentés módosításához." },
                { status: 403 }
            );
        }

        const frissitett = await prisma.hibabejelentes.update({
            where: { azonosito },
            data: {
                statusz: statusz as "UJ" | "FOLYAMATBAN" | "MEGOLDVA" | "ELUTASITVA",
            },
        });

        return NextResponse.json({ siker: true, adat: frissitett });
    } catch (error) {
        console.error("Hibabejelentés státusz frissítési hiba:", error);
        return NextResponse.json(
            { hiba: "Nem sikerült frissíteni a státuszt." },
            { status: 500 }
        );
    }
}
