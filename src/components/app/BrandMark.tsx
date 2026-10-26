import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * ARCULAT — a márka képei EGY helyen.
 *
 * Csere: elég a `public/brand/` mappában a fájlokat lecserélni (ugyanazzal a
 * névvel), vagy itt átírni az elérési utat. Bármilyen képformátum jó (SVG, PNG,
 * WebP). A `szelesseg` / `magassag` csak a képarányt adja meg — a megjelenített
 * méretet a felhasználási hely magassága határozza meg, a szélesség igazodik.
 * A `sotet` változat opcionális: sötét témában ez látszik (pl. fehér feliratú
 * logó); ha nincs megadva, mindkét témában ugyanaz a kép jelenik meg.
 */
export const ARCULAT = {
    /** Csak a jel (négyzetes). Oldalsávban a név mellett, összecsukott oldalsávban egyedül. */
    logo: { src: "/brand/logo.svg", sotet: "/brand/logo-sotet.svg", szelesseg: 64, magassag: 64 },
    /** Csak a név (felirat), a „Fish App” szöveg helyett. */
    nev: { src: "/brand/nev.svg", sotet: "/brand/nev-sotet.svg", szelesseg: 112, magassag: 28 },
    /** Jel + név egyben — ahol a kettő egy sorban állna (fejlécek, belépés). */
    teljes: { src: "/brand/teljes.svg", sotet: "/brand/teljes-sotet.svg", szelesseg: 152, magassag: 36 },
} as const;

type ArculatKep = { src: string; sotet?: string; szelesseg: number; magassag: number };

/** Egy arculati kép, sötét témában (ha van) a sötét változattal. A méretet a `className` adja (pl. `h-8`). */
export function ArculatKep({ kep, alt, className }: { kep: ArculatKep; alt: string; className?: string }) {
    const kozos = { width: kep.szelesseg, height: kep.magassag, unoptimized: true, priority: true } as const;
    if (!kep.sotet) return <Image src={kep.src} alt={alt} {...kozos} className={cn("w-auto", className)} />;
    return (
        <>
            <Image src={kep.src} alt={alt} {...kozos} className={cn("w-auto dark:hidden", className)} />
            <Image src={kep.sotet} alt={alt} {...kozos} className={cn("hidden w-auto dark:block", className)} />
        </>
    );
}

/** A teljes márkajel (logó + név egy képen). Magasság: `sm` = 32px, `md` = 44px. */
export function BrandMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
    return (
        <span className={cn("inline-flex items-center", className)}>
            <ArculatKep kep={ARCULAT.teljes} alt="Fish App" className={size === "md" ? "h-11" : "h-8"} />
        </span>
    );
}
