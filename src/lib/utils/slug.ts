// Tiszta (pure) slug-generátor: ékezet-eltávolítás + URL-barát normalizálás.
// Kiemelve az API route-ból, hogy unit-tesztelhető legyen (azonos viselkedés).
export function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[áàâä]/g, "a")
        .replace(/[éèêë]/g, "e")
        .replace(/[íìîï]/g, "i")
        .replace(/[óòôöő]/g, "o")
        .replace(/[úùûüű]/g, "u")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
