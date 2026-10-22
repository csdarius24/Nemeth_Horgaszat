export type NaploBejegyzes = {
    id: number;
    tipus: string;
    tipusCimke: string;
    cim: string;
    leiras: string | null;
    datum: string;
    rogzitoNev: string | null;
    toId: number | null;
    toNev: string | null;
    halfajNev: string | null;
    mennyisegKg: number | null;
    darab: number | null;
    ervenyes: boolean;
    ervenytelenitveAt: string | null;
    ervenytelenitesOka: string | null;
    ervenytelenitoNev: string | null;
    szerkesztveAt: string | null;
    szerkesztoNev: string | null;
    reszletek: unknown;
};

export function idoSzoveg(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleString("hu-HU", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
}

/** PATCH egy naplóbejegyzésre; hibánál az API üzenetét dobja. */
export async function naploModositas(hid: string, id: number, adat: Record<string, unknown>) {
    const res = await fetch(`/api/halaszatok/${hid}/naplo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adat),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "A módosítás nem sikerült.");
}
