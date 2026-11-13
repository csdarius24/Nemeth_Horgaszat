import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { keresesHiba, koordinataSzovegbol, nominatimTalalatok, type GeokodTalalat } from "@/lib/terkep/geokod";

// Címkeresés (geokódolás) az OpenStreetMap Nominatim szolgáltatásával.
//
// A Nominatim nyilvános szerverének felhasználási szabályai
// (https://operations.osmfoundation.org/policies/nominatim/):
//  - legfeljebb 1 kérés / másodperc  → folyamaton belüli ütemezés (lent)
//  - azonosító User-Agent            → az alkalmazás neve + repó URL (személyes adat NEM)
//  - nincs gépelés közbeni (autocomplete) keresés → a UI csak gombnyomásra keres
//  - az eredmények gyorsítótárazása  → memóriában, 24 óráig
// Nagyobb forgalomnál saját Nominatim vagy fizetős geokódoló javasolt.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "NemethHorgaszat/1.0 (+https://github.com/csdarius24/Nemeth_Horgaszat)";
const MIN_KOZ_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 300;

const cache = new Map<string, { ido: number; talalatok: GeokodTalalat[] }>();
let utolsoKeres = 0;
let sor: Promise<void> = Promise.resolve();

/** Sorba állítja a kéréseket, hogy kettő között legalább MIN_KOZ_MS teljen el. */
function utemezett<T>(fn: () => Promise<T>): Promise<T> {
    const futas = sor.then(async () => {
        const varakozas = utolsoKeres + MIN_KOZ_MS - Date.now();
        if (varakozas > 0) await new Promise((r) => setTimeout(r, varakozas));
        utolsoKeres = Date.now();
    });
    sor = futas.catch(() => undefined);
    return futas.then(fn);
}

/**
 * GET /api/geokod?q=...
 * Válasz: { talalatok: [{ nev, lat, lng, tipus }] } — legfeljebb 5, Magyarországra szűkítve.
 * Koordináta beírásakor (pl. "47.14, 20.20") hálózat nélkül azonnal válaszol.
 */
export async function GET(req: Request) {
    const user = await requireUser();
    if (!user) return NextResponse.json({ hiba: "Bejelentkezés szükséges." }, { status: 401 });

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

    const koord = koordinataSzovegbol(q);
    if (koord) {
        return NextResponse.json({ talalatok: [{ nev: `Koordináta: ${koord.lat}, ${koord.lng}`, ...koord, tipus: "koordinata" }] });
    }

    const hiba = keresesHiba(q);
    if (hiba) return NextResponse.json({ hiba }, { status: 400 });

    const kulcs = q.toLowerCase();
    const tarolt = cache.get(kulcs);
    if (tarolt && Date.now() - tarolt.ido < CACHE_TTL_MS) {
        return NextResponse.json({ talalatok: tarolt.talalatok });
    }

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "hu");
    url.searchParams.set("accept-language", "hu");

    try {
        const valasz = await utemezett(() =>
            fetch(url, {
                headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
                signal: AbortSignal.timeout(8000),
                cache: "no-store",
            })
        );
        if (!valasz.ok) {
            return NextResponse.json({ hiba: "A címkereső szolgáltatás most nem elérhető." }, { status: 502 });
        }
        const talalatok = nominatimTalalatok(await valasz.json());

        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
        cache.set(kulcs, { ido: Date.now(), talalatok });

        return NextResponse.json({ talalatok });
    } catch {
        return NextResponse.json({ hiba: "A címkereső szolgáltatás most nem elérhető." }, { status: 502 });
    }
}
