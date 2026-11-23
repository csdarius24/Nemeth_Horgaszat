"use client";

// Közös Leaflet-alap a térkép-komponensekhez. CSAK kliensen tölthető be
// (a Leaflet a `window`-t használja) — a komponenseket `next/dynamic`
// + `ssr: false` importálja (lásd ./index.tsx).

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// A Leaflet-Geoman plugin a globális `L`-re épül (window.L). Ezt a modult a
// plugin ELŐTT kell importálni (lásd KorvonalRajzolo.tsx import-sorrend).
if (typeof window !== "undefined") (window as unknown as { L: typeof L }).L = L;

/** Alapnézet, ha nincs ismert hely: Magyarország. */
export const MAGYARORSZAG: L.LatLngExpression = [47.16, 19.5];
export const ORSZAG_ZOOM = 7;
export const GAZDASAG_ZOOM = 15;

export { TIPUS_SZIN, tipusSzin } from "./szinek";

export type Alapreteg = "terkep" | "muhold";

/** Alaptérképek: OpenStreetMap (utcatérkép) és Esri World Imagery (műhold). */
function alapretegek() {
    return {
        terkep: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }),
        muhold: L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                attribution: "Műhold: &copy; Esri, Maxar, Earthstar Geographics",
            }
        ),
    };
}

/**
 * Térkép létrehozása a megadott konténerben, réteg-váltóval (Térkép / Műhold)
 * és automatikus átméretezés-kezeléssel (modálban, összecsukható panelen is jó).
 * Visszaad egy `megszuntet` függvényt a takarításhoz.
 */
export function letrehozTerkep(
    kontener: HTMLElement,
    opciok: { kozep?: L.LatLngExpression; zoom?: number; alapreteg?: Alapreteg } = {}
): { terkep: L.Map; megszuntet: () => void } {
    const terkep = L.map(kontener, {
        center: opciok.kozep ?? MAGYARORSZAG,
        zoom: opciok.zoom ?? ORSZAG_ZOOM,
        zoomControl: true,
        attributionControl: true,
    });
    terkep.attributionControl.setPrefix(false);

    const retegek = alapretegek();
    retegek[opciok.alapreteg ?? "terkep"].addTo(terkep);
    L.control.layers({ "Térkép": retegek.terkep, "Műhold": retegek.muhold }, undefined, { position: "topright" }).addTo(terkep);

    // A Leaflet nem veszi észre, ha a konténer mérete változik (pl. modál-animáció).
    const megfigyelo = new ResizeObserver(() => terkep.invalidateSize());
    megfigyelo.observe(kontener);

    return {
        terkep,
        megszuntet: () => {
            megfigyelo.disconnect();
            terkep.remove();
        },
    };
}

/** Gombostű-jelölő (divIcon: nem függ a Leaflet képfájljaitól, amik bundlerrel elvesznek). */
export function gombostuIkon(szin = "#e11d48") {
    return L.divIcon({
        className: "",
        iconSize: [28, 36],
        iconAnchor: [14, 34],
        html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 1C7 1 1.5 6.4 1.5 13.2 1.5 22.5 14 35 14 35s12.5-12.5 12.5-21.8C26.5 6.4 21 1 14 1z" fill="${szin}" stroke="#fff" stroke-width="2"/>
  <circle cx="14" cy="13" r="4.5" fill="#fff"/>
</svg>`,
    });
}

export { L };
