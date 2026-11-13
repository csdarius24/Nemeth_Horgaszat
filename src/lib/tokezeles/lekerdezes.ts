// Szerveroldali segéd: a még tartó élelmezés-egészségügyi várakozási idők
// lekérdezése (tókezelések oldal, tó adatlap, kivétel figyelmeztetés közösen használja).

import { prisma } from "@/lib/prisma";
import { aktivVarakozasok, MAX_VARAKOZAS_NAP, type TokezelesTipus } from "./tokezeles";

export async function lekerAktivVarakozasok(halaszatId: number, toId?: number, most: Date = new Date()) {
    // Csak az utolsó MAX_VARAKOZAS_NAP napon belüli kezelések tarthatnak még.
    const tol = new Date(most.getTime() - MAX_VARAKOZAS_NAP * 86_400_000);
    const sorok = await prisma.tokezeles.findMany({
        where: { halaszatId, ...(toId ? { toId } : {}), varakozasiIdoNap: { gt: 0 }, datum: { gte: tol } },
        select: {
            toId: true, datum: true, tipus: true, keszitmeny: true, hatoanyag: true,
            mennyiseg: true, egyseg: true, koltsegFt: true, varakozasiIdoNap: true,
            to: { select: { nev: true } },
        },
    });
    return aktivVarakozasok(
        sorok.map((s) => ({ ...s, toNev: s.to.nev, tipus: s.tipus as TokezelesTipus, mennyiseg: Number(s.mennyiseg) })),
        most
    );
}
