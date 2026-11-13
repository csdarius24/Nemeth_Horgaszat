"use client";

import { useEffect, useRef } from "react";

// FONTOS: az ./alap importja a Geoman ELŐTT legyen — az teszi ki a globális
// `window.L`-t, amire a Geoman plugin a betöltésekor épít.
import { GAZDASAG_ZOOM, gombostuIkon, L, letrehozTerkep, tipusSzin } from "./alap";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import { useModalModositas } from "@/components/ui/modal";
import CimKereso from "./CimKereso";
import { kulsoGyuruLatLng, type LatLng, type PoligonGeometria } from "@/lib/terkep/geo";
import { cn } from "@/lib/utils";

export type ReferenciaTo = { azonosito: number; nev: string; tipus: string; korvonal: PoligonGeometria };

/**
 * Tóegység körvonalának kirajzolása / szerkesztése (Leaflet-Geoman).
 * Egyszerre EGY sokszög van: új rajzolás lecseréli a régit. A többi tó
 * körvonala halványan látszik (referencia), a halgazdaság helye gombostűvel.
 */
export default function KorvonalRajzolo({ ertek, onChange, kozep, referenciak = [], tipus = "TO", className }: {
    ertek: PoligonGeometria | null;
    onChange: (g: PoligonGeometria | null) => void;
    /** A halgazdaság helye — ide áll a térkép, ha még nincs körvonal. */
    kozep?: LatLng | null;
    /** Már meglévő tavak körvonalai (csak megjelenítés). */
    referenciak?: ReferenciaTo[];
    tipus?: string;
    className?: string;
}) {
    const kontenerRef = useRef<HTMLDivElement>(null);
    const terkepRef = useRef<L.Map | null>(null);
    const sokszogRef = useRef<L.Polygon | null>(null);
    const referenciaRetegRef = useRef<L.LayerGroup | null>(null);
    const onChangeRef = useRef(onChange);
    const szinRef = useRef(tipusSzin(tipus));
    // Az utolsó, általunk kibocsátott geometria — hogy a saját változásunkat ne rajzoljuk újra.
    const kibocsatottRef = useRef<string | null>(null);

    // Modálban: a rajzolás is "módosítás" (zárásnál rákérdez az elvetésre).
    const jelolModositas = useModalModositas();
    const jelolRef = useRef(jelolModositas);

    useEffect(() => {
        jelolRef.current = jelolModositas;
        onChangeRef.current = onChange;
        szinRef.current = tipusSzin(tipus);
        sokszogRef.current?.setStyle({ color: szinRef.current, fillColor: szinRef.current });
    });

    function kibocsat(reteg: L.Polygon | null) {
        jelolRef.current?.();
        if (!reteg) {
            kibocsatottRef.current = null;
            onChangeRef.current(null);
            return;
        }
        const geom = (reteg.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry as PoligonGeometria;
        kibocsatottRef.current = JSON.stringify(geom);
        onChangeRef.current(geom);
    }

    function figyel(reteg: L.Polygon) {
        reteg.on("pm:edit", () => kibocsat(reteg));
        reteg.on("pm:remove", () => {
            sokszogRef.current = null;
            kibocsat(null);
        });
    }

    // Térkép + rajzoló eszköztár (egyszer).
    useEffect(() => {
        if (!kontenerRef.current) return;
        const kezdo = ertek ? kulsoGyuruLatLng(ertek)[0] : kozep ? [kozep.lat, kozep.lng] : undefined;
        const { terkep, megszuntet } = letrehozTerkep(kontenerRef.current, {
            kozep: kezdo as L.LatLngExpression | undefined,
            zoom: kezdo ? GAZDASAG_ZOOM : undefined,
            alapreteg: "muhold",
        });
        terkepRef.current = terkep;

        if (kozep) L.marker([kozep.lat, kozep.lng], { icon: gombostuIkon(), interactive: false }).addTo(terkep);
        referenciaRetegRef.current = L.layerGroup().addTo(terkep);

        terkep.pm.setLang("hu");
        terkep.pm.setGlobalOptions({
            allowSelfIntersection: false,
            snappable: true,
            pathOptions: { color: szinRef.current, fillColor: szinRef.current, fillOpacity: 0.25, weight: 3 },
        });
        terkep.pm.addControls({
            position: "topleft",
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawCircle: false,
            drawText: false,
            drawPolygon: true,
            editMode: true,
            dragMode: true,
            cutPolygon: false,
            removalMode: true,
            rotateMode: false,
        });

        terkep.on("pm:create", (e) => {
            const uj = e.layer as L.Polygon;
            // Csak egy körvonal lehet: a régit eltávolítjuk.
            if (sokszogRef.current && sokszogRef.current !== uj) sokszogRef.current.remove();
            sokszogRef.current = uj;
            figyel(uj);
            kibocsat(uj);
        });

        return () => {
            megszuntet();
            terkepRef.current = null;
            sokszogRef.current = null;
            referenciaRetegRef.current = null;
        };
        // A kezdőnézetet csak létrehozáskor állítjuk be.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Külső érték → sokszög (pl. szerkesztés megnyitásakor). A saját kibocsátást kihagyjuk.
    useEffect(() => {
        const terkep = terkepRef.current;
        if (!terkep) return;
        const kulcs = ertek ? JSON.stringify(ertek) : null;
        if (kulcs === kibocsatottRef.current) return;
        kibocsatottRef.current = kulcs;

        sokszogRef.current?.remove();
        sokszogRef.current = null;
        if (!ertek) return;

        const reteg = L.polygon(kulsoGyuruLatLng(ertek), {
            color: szinRef.current, fillColor: szinRef.current, fillOpacity: 0.25, weight: 3,
        }).addTo(terkep);
        sokszogRef.current = reteg;
        figyel(reteg);
        terkep.fitBounds(reteg.getBounds(), { padding: [30, 30], maxZoom: 18 });
        // A `figyel` csak ref-eket használ, ezért stabil — szándékosan nincs a függőségek között.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ertek]);

    // Referencia-tavak (más tavak halvány körvonala, felirattal).
    useEffect(() => {
        const csoport = referenciaRetegRef.current;
        if (!csoport) return;
        csoport.clearLayers();
        for (const r of referenciak) {
            L.polygon(kulsoGyuruLatLng(r.korvonal), {
                color: tipusSzin(r.tipus), weight: 1.5, dashArray: "4 4", fillOpacity: 0.08, interactive: false, pmIgnore: true,
            })
                .bindTooltip(r.nev, { permanent: true, direction: "center", className: "terkep-cimke terkep-cimke-halvany" })
                .addTo(csoport);
        }
    }, [referenciak]);

    return (
        <div className="grid gap-2">
            {/* Címkeresés: csak odaviszi a térképet, a körvonalat a felhasználó rajzolja. */}
            <CimKereso onValaszt={(t) => terkepRef.current?.setView([t.lat, t.lng], 17)} />
            <div
                ref={kontenerRef}
                className={cn("isolate h-80 w-full overflow-hidden rounded-xl border bg-muted sm:h-96", className)}
                role="application"
                aria-label="Térkép: rajzold körbe a tóegységet"
            />
        </div>
    );
}
