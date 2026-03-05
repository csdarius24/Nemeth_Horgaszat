export function szam(x: unknown, alap = 0) {
    const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : alap;
}