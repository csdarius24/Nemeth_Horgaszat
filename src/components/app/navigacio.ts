import {
    AlertCircle,
    Book,
    Calendar,
    CheckSquare,
    Droplets,
    Fish,
    LayoutDashboard,
    Users,
    Waves,
    Wheat,
    type LucideIcon,
} from "lucide-react";

/**
 * Az alkalmazás navigációs szerkezete — EGY helyen, hogy az oldalsáv, a mobil
 * alsó sáv és a fejléc (oldalcím) mindig ugyanazt mutassa.
 */
export type NavElem = {
    /** A halászat alap-útvonalához (`/halaszatok/[hid]`) képest; "" = áttekintés. */
    utvonal: string;
    cimke: string;
    /** Rövid felirat a mobil alsó sávhoz. */
    rovidCimke?: string;
    ikon: LucideIcon;
};

export type NavCsoport = { cim: string; elemek: NavElem[] };

export const HALASZAT_NAV: NavCsoport[] = [
    {
        cim: "Gazdálkodás",
        elemek: [
            { utvonal: "", cimke: "Áttekintés", rovidCimke: "Áttekintés", ikon: LayoutDashboard },
            { utvonal: "/toak", cimke: "Tavak és telelők", rovidCimke: "Tavak", ikon: Waves },
            { utvonal: "/takarmanyok", cimke: "Takarmányok", ikon: Wheat },
            { utvonal: "/halfajok", cimke: "Halfajok", ikon: Fish },
            { utvonal: "/halkeltes", cimke: "Halkeltetés", ikon: Droplets },
        ],
    },
    {
        cim: "Csapat és nyilvántartás",
        elemek: [
            { utvonal: "/naplo", cimke: "Halászati napló", rovidCimke: "Napló", ikon: Book },
            { utvonal: "/feladatok", cimke: "Feladatok", ikon: CheckSquare },
            { utvonal: "/naptar", cimke: "Naptár", ikon: Calendar },
            { utvonal: "/dolgozok", cimke: "Dolgozók", ikon: Users },
            { utvonal: "/hibabejelentesek", cimke: "Hibabejelentések", ikon: AlertCircle },
        ],
    },
];

/** A mobil alsó sávon megjelenő (leggyakoribb) menüpontok. */
export const MOBIL_NAV_UTVONALAK = ["", "/toak", "/naplo", "/feladatok"];

export const OSSZES_NAV_ELEM = HALASZAT_NAV.flatMap((cs) => cs.elemek);

/** Aktív-e a menüpont: az áttekintés csak pontos egyezésre, a többi al-útvonalakra is. */
export function aktivE(pathname: string, base: string, utvonal: string) {
    const cel = base + utvonal;
    if (utvonal === "") return pathname === cel;
    return pathname === cel || pathname.startsWith(cel + "/");
}

export function aktualisNavElem(pathname: string, base: string) {
    return OSSZES_NAV_ELEM.find((e) => e.utvonal !== "" && aktivE(pathname, base, e.utvonal))
        ?? (pathname === base ? OSSZES_NAV_ELEM[0] : undefined);
}

/** `/halaszatok/12/...` → "12" */
export function halaszatIdUtvonalbol(pathname: string | null) {
    return pathname?.match(/^\/halaszatok\/(\d+)/)?.[1] ?? null;
}

/** localStorage-kulcs: a legutóbb megnyitott halászat azonosítója (csak kényelmi funkció). */
export const UTOLSO_HALASZAT_KULCS = "fishapp:utolso-halaszat";

/**
 * A böngészőfül címe az aktuális oldalhoz, pl. „Tavak · UI Teszt Halászat”.
 * Halászaton kívül: „Halászataim · Fish App”.
 */
export function oldalCim(pathname: string, hid: string | null, halaszatNev: string | null) {
    if (!hid) return `${pathname.startsWith("/halaszatok/uj") ? "Új halászat" : "Halászataim"} · Fish App`;
    const base = `/halaszatok/${hid}`;
    const elem = aktualisNavElem(pathname, base);
    const melyebb = elem && pathname !== base + elem.utvonal; // pl. egy tó részletező oldala
    const resz = [melyebb && "Részletek", elem?.cimke, halaszatNev ?? "Fish App"].filter(Boolean);
    return resz.join(" · ");
}
