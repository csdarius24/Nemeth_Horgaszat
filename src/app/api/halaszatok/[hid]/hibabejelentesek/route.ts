import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ hid: string }> }
) {
    try {
        const { hid } = await params;
        const halaszatId = Number(hid);

        if (!Number.isInteger(halaszatId)) {
            return NextResponse.json(
                { hiba: "Érvénytelen halászat azonosító." },
                { status: 400 }
            );
        }

        // Auth + RBAC: csak a halászat aktív tagja (STAFF vagy magasabb) listázhat.
        const auth = await requireHalaszatRole(halaszatId, "STAFF");
        if (!auth.ok) {
            return NextResponse.json({ hiba: auth.error }, { status: auth.status });
        }

        const lista = await prisma.hibabejelentes.findMany({
            where: {
                halaszatId,
            },
            orderBy: {
                letrehozva: "desc",
            },
            include: {
                felhasznalo: {
                    select: {
                        azonosito: true,
                        nev: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({ adatok: lista });
    } catch (error) {
        console.error("Hibabejelentések lekérési hiba:", error);
        return NextResponse.json(
            { hiba: "Nem sikerült lekérni a hibabejelentéseket." },
            { status: 500 }
        );
    }
}
