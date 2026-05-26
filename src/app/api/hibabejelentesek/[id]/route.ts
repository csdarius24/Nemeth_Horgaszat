import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ENGEDLYEZETT_STATUSZOK = ["UJ", "FOLYAMATBAN", "MEGOLDVA", "ELUTASITVA"] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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