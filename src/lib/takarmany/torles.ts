// Tiszta (pure) döntéslogika a takarmány törölhetőségéhez — adatbázis nélkül,
// unit-tesztelhető.
//
// MIÉRT KELL EZ (audit-biztonság):
// A `takarmany_mozgasok.takarmanyId` idegen kulcs **ON DELETE CASCADE**
// (lásd `prisma/migrations/20260624000000_add_takarmany/migration.sql`), ezért a
// `takarmany.delete()` NEM dob `P2003`-at: csendben **kitörli a takarmány teljes
// mozgástörténetét** is. Az `etetesek.takarmanyId` pedig **ON DELETE SET NULL**
// (`20260626100000_link_etetes_takarmany`), így az etetés-rekordok megmaradnak,
// de elvesztik, hogy MELYIK takarmányból történtek.
//
// Mindkettő adatvesztés egy olyan rendszerben, amelynek alapelve, hogy a
// műveleti előzmény nem törölhető fizikailag. Mivel az adatbázis szintjén ezt a
// jelenlegi FK-k nem akadályozzák meg, a védelmet **alkalmazás-szinten** kell
// kikényszeríteni: törlés ELŐTT megszámoljuk a hivatkozásokat, és ha van
// bármelyikből, a törlést elutasítjuk (inaktiválást ajánlva helyette).

/** Hány előzmény-hivatkozás mutat a takarmányra. */
export type TakarmanyHivatkozasok = {
    /** `TakarmanyMozgas` sorok száma (bevétel/felhasználás előzmény). */
    mozgasokDb: number;
    /** `Etetes` sorok száma, amelyek ehhez a takarmányhoz kötődnek. */
    etetesekDb: number;
};

export type TorolhetosegEredmeny =
    | { torolheto: true }
    | {
          torolheto: false;
          /** Melyik előzmény blokkolja a törlést (a hibaüzenet megfogalmazásához). */
          ok: "mozgas" | "etetes" | "mindketto";
          /** Ember-olvasható, a felhasználónak megjeleníthető indoklás. */
          uzenet: string;
      };

/**
 * Megmondja, hogy egy takarmány fizikailag törölhető-e.
 *
 * Szabály: **csak akkor törölhető, ha SEMMILYEN előzmény nem hivatkozik rá** —
 * sem takarmánymozgás, sem etetés. Bármelyikből egy is elég a tiltáshoz, mert a
 * törlés az adatbázis FK-szabályai miatt adatot semmisítene meg (cascade), ill.
 * elvágna egy előzmény-hivatkozást (set null).
 *
 * A negatív / nem véges számokat óvatosan kezeljük: ismeretlen darabszám esetén
 * NEM engedjük a törlést (fail-safe).
 */
export function torolhetoTakarmany(h: TakarmanyHivatkozasok): TorolhetosegEredmeny {
    const mozgasok = szamOrBlokkol(h.mozgasokDb);
    const etetesek = szamOrBlokkol(h.etetesekDb);

    const vanMozgas = mozgasok > 0;
    const vanEtetes = etetesek > 0;

    if (!vanMozgas && !vanEtetes) return { torolheto: true };

    if (vanMozgas && vanEtetes) {
        return {
            torolheto: false,
            ok: "mindketto",
            uzenet:
                `Ez a takarmány nem törölhető: ${mozgasok} készletmozgás és ${etetesek} etetés ` +
                "kötődik hozzá. A törlés megsemmisítené a készlet-előzményt, ezért helyette " +
                "inaktiváld — így kikerül a listákból, de a napló és a mozgástörténet megmarad.",
        };
    }

    if (vanMozgas) {
        return {
            torolheto: false,
            ok: "mozgas",
            uzenet:
                `Ez a takarmány nem törölhető: ${mozgasok} készletmozgás (bevétel/felhasználás) ` +
                "előzménye van. A törlés megsemmisítené ezt a mozgástörténetet, ezért helyette " +
                "inaktiváld — így kikerül a listákból, de az előzmény megmarad.",
        };
    }

    return {
        torolheto: false,
        ok: "etetes",
        uzenet:
            `Ez a takarmány nem törölhető: ${etetesek} etetés hivatkozik rá. A törléssel ezek az ` +
            "etetések elveszítenék, hogy melyik takarmányból történtek, ezért helyette inaktiváld.",
    };
}

/** Nem véges vagy negatív darabszám → 1-nek vesszük (fail-safe: inkább tiltunk). */
function szamOrBlokkol(n: number): number {
    if (!Number.isFinite(n) || n < 0) return 1;
    return Math.floor(n);
}
