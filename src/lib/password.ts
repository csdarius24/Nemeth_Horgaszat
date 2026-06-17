// Tiszta (pure) jelszó- és token-segédfüggvények — Next cookies / Prisma nélkül.
// Kiemelve az auth.ts-ből, hogy unit-tesztelhető legyen (azonos viselkedés).
import bcrypt from "bcryptjs";
import crypto from "crypto";

/** SHA-256 hex digest — a session token tárolt (nem visszafejthető) lenyomata. */
export function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

/** Jelszó hash bcrypttel (cost 12). */
export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

/** Jelszó ellenőrzése a tárolt hash ellen. */
export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

/** Új, kriptográfiailag erős session token (256 bit, hex). */
export function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}
