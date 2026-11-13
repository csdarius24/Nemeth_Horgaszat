import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { feldolgozMetno } from "@/lib/idojaras/metno";
import { KUSZOBOK, szelsosegek } from "@/lib/idojaras/szelsoseg";

// Időjárás a halgazdaság térképen megadott helyére — MET Norway Locationforecast 2.0.
//
// A szolgáltatás feltételei (https://api.met.no/doc/TermsOfService):
//  - azonosító User-Agent (alkalmazásnév + elérhetőség; személyes adat NEM)
//  - a koordináták legfeljebb 4 tizedesre kerekítve (jobb cache-találat náluk is)
//  - az `Expires` fejlécig nem kérdezünk újra; utána `If-Modified-Since`-szel
//  - forrásmegjelölés (CC BY 4.0) — a válaszban `forras`, a UI kiírja

const METNO_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete";
const USER_AGENT = "NemethHorgaszat/1.0 (+https://github.com/csdarius24/Nemeth_Horgaszat)";
const ALAP_ELETTARTAM_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;

type Tarolt = { nyers: unknown; lejar: number; utolsoModositas: string | null; lekerve: number };
const cache = new Map<string, Tarolt>();

async function lekerMetno(lat: number, lng: number): Promise<{ tarolt: Tarolt; elavult: boolean }> {
    const kulcs = `${lat},${lng}`;
    const regi = cache.get(kulcs);
    if (regi && Date.now() < regi.lejar) return { tarolt: regi, elavult: false };

    const url = new URL(METNO_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));

    const fejlecek: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "application/json" };
    if (regi?.utolsoModositas) fejlecek["If-Modified-Since"] = regi.utolsoModositas;

    try {
        const res = await fetch(url, { headers: fejlecek, signal: AbortSignal.timeout(10_000), cache: "no-store" });
        const expires = Date.parse(res.headers.get("expires") ?? "");
        const lejar = Number.isFinite(expires) && expires > Date.now() ? expires : Date.now() + ALAP_ELETTARTAM_MS;

        if (res.status === 304 && regi) {
            const frissitett = { ...regi, lejar };
            cache.set(kulcs, frissitett);
            return { tarolt: frissitett, elavult: false };
        }
        if (!res.ok) throw new Error(`MET Norway: ${res.status}`);

        const tarolt: Tarolt = {
            nyers: await res.json(),
            lejar,
            utolsoModositas: res.headers.get("last-modified"),
            lekerve: Date.now(),
        };
        if (!cache.has(kulcs) && cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
        cache.set(kulcs, tarolt);
        return { tarolt, elavult: false };
    } catch (err) {
        // Hálózati hiba: ha van korábbi adat, azt adjuk vissza (jelölve), különben továbbdobjuk.
        if (regi) return { tarolt: regi, elavult: true };
        throw err;
    }
}

/**
 * GET /api/halaszatok/[hid]/idojaras
 * Aktuális időjárás + 24 órás + napi (kb. 9 napos) előrejelzés + számított
 * szélsőséges-időjárás jelzések a halgazdaság helyére.
 */
export async function GET(
    _req: Request,
    context: { params: Promise<{ hid: string }> }
) {
    const { hid } = await context.params;
    const halaszatId = szam(hid, 0);
    if (!halaszatId) return NextResponse.json({ error: "Hibás halászat azonosító." }, { status: 400 });

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { nev: true, helyLat: true, helyLng: true },
    });
    if (!halaszat) return NextResponse.json({ error: "Nincs ilyen halászat." }, { status: 404 });

    if (halaszat.helyLat == null || halaszat.helyLng == null) {
        // Nem hiba: a UI felhívást mutat a hely megadására.
        return NextResponse.json({ nincsHely: true, viewerRole: auth.role });
    }

    const lat = Math.round(Number(halaszat.helyLat) * 1e4) / 1e4;
    const lng = Math.round(Number(halaszat.helyLng) * 1e4) / 1e4;

    try {
        const { tarolt, elavult } = await lekerMetno(lat, lng);
        const elorejelzes = feldolgozMetno(tarolt.nyers);
        return NextResponse.json({
            nincsHely: false,
            hely: { lat, lng },
            ...elorejelzes,
            szelsosegek: szelsosegek(elorejelzes.napok),
            kuszobok: KUSZOBOK,
            lekerve: new Date(tarolt.lekerve).toISOString(),
            elavult,
            forras: { nev: "MET Norway", url: "https://api.met.no/", licenc: "CC BY 4.0" },
        });
    } catch {
        return NextResponse.json({ error: "Az időjárás-szolgáltatás most nem érhető el." }, { status: 502 });
    }
}
