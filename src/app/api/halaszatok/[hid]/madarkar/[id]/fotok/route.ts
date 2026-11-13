import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { kepTipus, MAX_FOTO_BAJT, MAX_FOTO_DB, modosithatjaMadarkar } from "@/lib/madarkar/madarkar";
import { fotoDarab, mentFoto } from "@/lib/madarkar/fotoTarolo";

function jsonError(msg: string, status = 400) {
    return NextResponse.json({ error: msg }, { status });
}

const meretMezo = (x: FormDataEntryValue | null) => {
    const n = Number(x);
    return Number.isInteger(n) && n > 0 && n < 20_000 ? n : null;
};

/**
 * POST /api/halaszatok/[hid]/madarkar/[id]/fotok — egy fénykép feltöltése
 * (multipart/form-data, mező: `foto`; opcionális `szelesseg`, `magassag`).
 * A böngésző előbb lekicsinyíti (max. 1600 px JPEG). A típust a tartalom
 * alapján ellenőrizzük (JPEG/PNG/WebP), nem a kliens által küldött MIME alapján.
 */
export async function POST(req: Request, context: { params: Promise<{ hid: string; id: string }> }) {
    const { hid, id } = await context.params;
    const halaszatId = szam(hid, 0);
    const esemenyId = szam(id, 0);
    if (!halaszatId || !esemenyId) return jsonError("Hibás azonosító.");

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const esemeny = await prisma.madarkarEsemeny.findFirst({
        where: { azonosito: esemenyId, halaszatId },
        select: { rogzitoFelhasznaloId: true },
    });
    if (!esemeny) return jsonError("A madárkár-bejegyzés nem található.", 404);
    if (!modosithatjaMadarkar(auth.role, esemeny.rogzitoFelhasznaloId, auth.user.azonosito)) {
        return jsonError("Csak a saját bejegyzésedhez tölthetsz fel fényképet.", 403);
    }

    if ((await fotoDarab(esemenyId)) >= MAX_FOTO_DB) {
        return jsonError(`Egy bejegyzéshez legfeljebb ${MAX_FOTO_DB} fénykép tartozhat.`);
    }

    const form = await req.formData().catch(() => null);
    const fajl = form?.get("foto");
    if (!(fajl instanceof File)) return jsonError("Nincs feltöltött kép.");
    if (fajl.size === 0) return jsonError("Üres fájl.");
    if (fajl.size > MAX_FOTO_BAJT) return jsonError("A kép túl nagy (legfeljebb 3 MB).", 413);

    const adat = new Uint8Array(await fajl.arrayBuffer());
    const mime = kepTipus(adat);
    if (!mime) return jsonError("Csak JPEG, PNG vagy WebP kép tölthető fel.", 415);

    const foto = await mentFoto(esemenyId, adat, mime, {
        szelesseg: meretMezo(form!.get("szelesseg")),
        magassag: meretMezo(form!.get("magassag")),
    });

    return NextResponse.json({ foto: { id: foto.azonosito, szelesseg: foto.szelesseg, magassag: foto.magassag } }, { status: 201 });
}
