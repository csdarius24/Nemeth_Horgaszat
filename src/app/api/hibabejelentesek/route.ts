import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireHalaszatRole } from "@/lib/guards";

export async function POST(req: NextRequest) {
    try {
        // Auth: bejelentkezés kötelező.
        const user = await requireUser();
        if (!user) {
            return NextResponse.json(
                { hiba: "Bejelentkezés szükséges." },
                { status: 401 }
            );
        }

        const body = await req.json();

        const targy = String(body?.targy ?? "").trim();
        const leiras = String(body?.leiras ?? "").trim();
        const oldalUrl =
            body?.oldalUrl && String(body.oldalUrl).trim().length > 0
                ? String(body.oldalUrl).trim()
                : null;

        // A bejelentő MINDIG a session felhasználó — a kérés törzsében küldött
        // felhasznaloId-t szándékosan figyelmen kívül hagyjuk (nem megbízható).
        const felhasznaloId = user.azonosito;

        // halaszatId opcionális: ha megadták, a felhasználónak legalább STAFF
        // tagnak kell lennie abban a halászatban; ha nincs megadva, globális
        // (felhasználó-szintű) bejelentés készül halaszatId = null értékkel.
        const halaszatIdRaw = body?.halaszatId;
        const halaszatId =
            typeof halaszatIdRaw === "number" ? halaszatIdRaw : null;

        if (halaszatId != null) {
            const auth = await requireHalaszatRole(halaszatId, "STAFF");
            if (!auth.ok) {
                return NextResponse.json({ hiba: auth.error }, { status: auth.status });
            }
        }

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
