import { NextResponse } from "next/server";
import { requireHalaszatRole } from "@/lib/guards";
import { szam } from "@/lib/utils/szam";
import { modosithatjaMadarkar } from "@/lib/madarkar/madarkar";
import { fotoEsemenye, olvasFoto, torolFoto } from "@/lib/madarkar/fotoTarolo";

type Kontextus = { params: Promise<{ hid: string; fotoId: string }> };

/**
 * GET /api/halaszatok/[hid]/madarkar/fotok/[fotoId] — a kép tartalma.
 * Csak a halászat tagjai érik el (tenant-szűrt); privát cache, `nosniff`.
 */
export async function GET(_req: Request, context: Kontextus) {
    const { hid, fotoId } = await context.params;
    const halaszatId = szam(hid, 0);
    const id = szam(fotoId, 0);
    if (!halaszatId || !id) return NextResponse.json({ error: "Hibás azonosító." }, { status: 400 });

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const foto = await olvasFoto(id, halaszatId);
    if (!foto) return NextResponse.json({ error: "A kép nem található." }, { status: 404 });

    return new NextResponse(new Uint8Array(foto.adat), {
        headers: {
            "Content-Type": foto.mime,
            "Content-Length": String(foto.adat.length),
            // A kép tartalma nem változik (új kép = új azonosító) → hosszan cache-elhető, de csak privátban.
            "Cache-Control": "private, max-age=604800, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": `inline; filename="madarkar-${id}.${foto.mime.split("/")[1]}"`,
        },
    });
}

/** DELETE — kép törlése (ADMIN/OWNER, vagy a bejegyzés rögzítője). */
export async function DELETE(_req: Request, context: Kontextus) {
    const { hid, fotoId } = await context.params;
    const halaszatId = szam(hid, 0);
    const id = szam(fotoId, 0);
    if (!halaszatId || !id) return NextResponse.json({ error: "Hibás azonosító." }, { status: 400 });

    const auth = await requireHalaszatRole(halaszatId, "STAFF");
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const esemeny = await fotoEsemenye(id, halaszatId);
    if (!esemeny) return NextResponse.json({ error: "A kép nem található." }, { status: 404 });
    if (!modosithatjaMadarkar(auth.role, esemeny.rogzitoFelhasznaloId, auth.user.azonosito)) {
        return NextResponse.json({ error: "Ezt a képet nem törölheted." }, { status: 403 });
    }

    await torolFoto(id);
    return NextResponse.json({ ok: true });
}
