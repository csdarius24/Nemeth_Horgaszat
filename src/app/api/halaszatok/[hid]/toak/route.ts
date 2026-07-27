import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";

function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : alap;
}

export async function GET(
    _req: Request,
    props: { params: Promise<{ hid: string }> }
) {
    const { hid } = await props.params;
    const halaszatId = szam(hid, 0);

    if (!halaszatId) {
        return NextResponse.json({ hiba: "Hibás halászat azonosító." }, { status: 400 });
    }

    const access = await requireHalaszatRole(halaszatId, "STAFF");
    if (!access.ok) return NextResponse.json({ hiba: access.error }, { status: access.status });

    const toak = await prisma.to.findMany({
        where: { halaszatId },
        orderBy: { letrehozva: "desc" },
        select: {
            azonosito: true,
            nev: true,
            tipus: true,
            aktiv: true,
            letrehozva: true,
        },
    });

    return NextResponse.json({ toak });
}

export async function POST(
    req: Request,
    props: { params: Promise<{ hid: string }> }
) {
    const { hid } = await props.params;
    const halaszatId = szam(hid, 0);

    if (!halaszatId) {
        return NextResponse.json({ hiba: "Hibás halászat azonosító." }, { status: 400 });
    }

    const access = await requireHalaszatRole(halaszatId, "ADMIN");
    if (!access.ok) return NextResponse.json({ hiba: access.error }, { status: access.status });

    const body = await req.json().catch(() => ({}));
    const nev = typeof body?.nev === "string" ? body.nev.trim() : "";

    const ENGEDETT_TIPUSOK = ["TO", "TELELO", "IVADEKNEVELO", "KELTETO_MEDENCE"] as const;
    const tipus = ENGEDETT_TIPUSOK.includes(body?.tipus) ? body.tipus : "TO";

    if (nev.length < 2) {
        return NextResponse.json({ hiba: "A tó neve kötelező (min. 2 karakter)." }, { status: 400 });
    }

    // Opcionális műszaki adatok: csak akkor mentjük, ha pozitív számként érkeztek.
    function opcionalisPozitiv(x: unknown): number | null {
        if (x == null || x === "") return null;
        const n = Number(x);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    const ujTo = await prisma.to.create({
        data: {
            nev,
            tipus,
            halaszatId,
            teruletHa: opcionalisPozitiv(body?.teruletHa),
            atlagMelysegMeter: opcionalisPozitiv(body?.atlagMelysegMeter),
            kapacitasKg: opcionalisPozitiv(body?.kapacitasKg),
        },
        select: {
            azonosito: true, nev: true, tipus: true, aktiv: true, letrehozva: true,
            teruletHa: true, atlagMelysegMeter: true, kapacitasKg: true,
        },
    });

    return NextResponse.json({ to: ujTo }, { status: 201 });
}