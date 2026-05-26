import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("HIBABEJELENTES BODY:", body);

        const targy = String(body?.targy ?? "").trim();
        const leiras = String(body?.leiras ?? "").trim();
        const oldalUrl =
            body?.oldalUrl && String(body.oldalUrl).trim().length > 0
                ? String(body.oldalUrl).trim()
                : null;

        const felhasznaloIdRaw = body?.felhasznaloId;
        const halaszatIdRaw = body?.halaszatId;

        const felhasznaloId =
            typeof felhasznaloIdRaw === "number" ? felhasznaloIdRaw : null;
        const halaszatId =
            typeof halaszatIdRaw === "number" ? halaszatIdRaw : null;

        if (targy.length < 3) {
            return NextResponse.json(
                { hiba: "A tárgy legalább 3 karakter legyen." },
                { status: 400 }
            );
        }

        if (leiras.length < 10) {
            return NextResponse.json(
                { hiba: "A leírás legalább 10 karakter legyen." },
                { status: 400 }
            );
        }

        const ujHibabejelentes = await prisma.hibabejelentes.create({
            data: {
                targy,
                leiras,
                oldalUrl,
                felhasznaloId,
                halaszatId,
            },
            include: {
                felhasznalo: {
                    select: {
                        azonosito: true,
                        nev: true,
                        email: true,
                    },
                },
                halaszat: {
                    select: {
                        azonosito: true,
                        nev: true,
                        slug: true,
                    },
                },
            },
        });

        console.log("HIBABEJELENTES MENTVE:", ujHibabejelentes);

        return NextResponse.json(
            {
                siker: true,
                adat: ujHibabejelentes,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Hibabejelentés mentési hiba:", error);
        return NextResponse.json(
            { hiba: "A hibabejelentést nem sikerült elmenteni." },
            { status: 500 }
        );
    }
}