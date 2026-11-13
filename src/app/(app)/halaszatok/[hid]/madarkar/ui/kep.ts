"use client";

/** Ennyi pixelre kicsinyítjük a kép hosszabbik oldalát. */
export const MAX_OLDAL_PX = 1600;
const JPEG_MINOSEG = 0.82;

export type KicsinyitettKep = { blob: Blob; szelesseg: number; magassag: number; elonezet: string };

/**
 * Feltöltés előtti kicsinyítés a böngészőben (canvas → JPEG). A telefonos
 * fotók EXIF-forgatását a `createImageBitmap(..., { imageOrientation: "from-image" })`
 * kezeli. Ha a böngésző nem tudja dekódolni (pl. HEIC asztali böngészőben), hibát dob.
 */
export async function kicsinyit(fajl: File): Promise<KicsinyitettKep> {
    const bitmap = await createImageBitmap(fajl, { imageOrientation: "from-image" });
    try {
        const arany = Math.min(1, MAX_OLDAL_PX / Math.max(bitmap.width, bitmap.height));
        const szelesseg = Math.max(1, Math.round(bitmap.width * arany));
        const magassag = Math.max(1, Math.round(bitmap.height * arany));

        const canvas = document.createElement("canvas");
        canvas.width = szelesseg;
        canvas.height = magassag;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("A böngésző nem támogatja a képfeldolgozást.");
        // Átlátszó PNG → fehér háttér (a JPEG-nek nincs átlátszósága).
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, szelesseg, magassag);
        ctx.drawImage(bitmap, 0, 0, szelesseg, magassag);

        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("A kép tömörítése nem sikerült."))), "image/jpeg", JPEG_MINOSEG)
        );
        return { blob, szelesseg, magassag, elonezet: URL.createObjectURL(blob) };
    } finally {
        bitmap.close();
    }
}

/** Egy kicsinyített kép feltöltése egy madárkár-bejegyzéshez. */
export async function feltolt(hid: string, esemenyId: number, kep: KicsinyitettKep) {
    const form = new FormData();
    form.append("foto", kep.blob, "madarkar.jpg");
    form.append("szelesseg", String(kep.szelesseg));
    form.append("magassag", String(kep.magassag));
    const res = await fetch(`/api/halaszatok/${hid}/madarkar/${esemenyId}/fotok`, { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "A kép feltöltése nem sikerült.");
    return json.foto as { id: number; szelesseg: number | null; magassag: number | null };
}

export const fotoUrl = (hid: string, fotoId: number) => `/api/halaszatok/${hid}/madarkar/fotok/${fotoId}`;
