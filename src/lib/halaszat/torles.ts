// Tiszta (pure) logika a halászat törléséhez — unit-tesztelhető.
//
// A törlés VÉGLEGES (a halászat minden adata törlődik), ezért kétlépcsős:
//  1) a felület felsorolja, mi fog törlődni, és rákérdez;
//  2) a halászat pontos nevét be kell gépelni — ezt a SZERVER is ellenőrzi.

/** Szóközök egységesítése (dupla szóköz, elején/végén) — a kis/nagybetű számít. */
const normal = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * A beírt megerősítő név egyezik-e a halászat nevével. Szándékosan szigorú:
 * pontos egyezés kell (csak a szóközöket egységesítjük), hogy ne lehessen
 * véletlenül, félig begépelt névvel törölni.
 */
export function torlesNevEgyezik(beirt: unknown, halaszatNev: string): boolean {
    if (typeof beirt !== "string") return false;
    const b = normal(beirt);
    return b.length > 0 && b === normal(halaszatNev);
}

export type TorlesElonezet = {
    tavak: number;
    halfajok: number;
    halDarab: number;
    naploBejegyzesek: number;
    tagok: number;
    takarmanyok: number;
    feladatok: number;
    madarkar: number;
    tokezelesek: number;
    halkeltetes: number;
    naptar: number;
};

/** Ember-olvasható lista arról, mi törlődik (csak a nem nulla tételek). */
export function torlesTetelek(e: TorlesElonezet): string[] {
    const hu = (n: number) => n.toLocaleString("hu-HU");
    const t: Array<[number, string]> = [
        [e.tavak, `${hu(e.tavak)} tóegység`],
        [e.halDarab, `${hu(e.halDarab)} db hal nyilvántartott állománya`],
        [e.halfajok, `${hu(e.halfajok)} halfaj`],
        [e.naploBejegyzesek, `${hu(e.naploBejegyzesek)} naplóbejegyzés`],
        [e.takarmanyok, `${hu(e.takarmanyok)} takarmány (készlettel, mozgásokkal)`],
        [e.feladatok, `${hu(e.feladatok)} feladat`],
        [e.tokezelesek, `${hu(e.tokezelesek)} tókezelés`],
        [e.madarkar, `${hu(e.madarkar)} madárkár-bejegyzés (fotókkal)`],
        [e.halkeltetes, `${hu(e.halkeltetes)} halkeltetési ciklus`],
        [e.naptar, `${hu(e.naptar)} naptárbejegyzés`],
        [e.tagok, `${hu(e.tagok)} csapattag hozzáférése`],
    ];
    return t.filter(([n]) => n > 0).map(([, s]) => s);
}
