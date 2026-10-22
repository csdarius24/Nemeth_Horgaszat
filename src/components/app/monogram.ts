/** Monogram avatarhoz: „Nagy Sándor” → „NS”, „anna@x.hu” → „AN”. */
export function monogram(nev: string | null) {
    const reszek = (nev ?? "").trim().split(/\s+/).filter(Boolean);
    if (reszek.length === 0) return "?";
    return (reszek.length > 1 ? reszek[0][0] + reszek[reszek.length - 1][0] : reszek[0].slice(0, 2)).toUpperCase();
}
