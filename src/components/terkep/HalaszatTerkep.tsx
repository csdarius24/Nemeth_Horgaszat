"use client";

import { useEffect, useRef } from "react";

import { kulsoGyuruLatLng, type LatLng, type PoligonGeometria } from "@/lib/terkep/geo";
import { cn } from "@/lib/utils";

import { GAZDASAG_ZOOM, gombostuIkon, L, letrehozTerkep, tipusSzin } from "./alap";

export type TerkepTo = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
    korvonal: PoligonGeometria;
};

function escape(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * A halgazdaság összes tóegysége a térképen: típus szerinti színnel, névvel és
 * azonosítóval. Tóra kattintva `onToKattintas` (pl. adatlap megnyitása).
 * `kiemelt`: egy tó kiemelése (pl. a tó adatlapján) — ilyenkor arra közelít.
 */
export default function HalaszatTerkep({ hely, toak, onToKattintas, kiemelt, className, cimkek = true }: {
    hely: LatLng | null;
    toak: TerkepTo[];
    onToKattintas?: (azonosito: number) => void;
    kiemelt?: number;
    className?: string;
    cimkek?: boolean;
}) {
    const kontenerRef = useRef<HTMLDivElement>(null);
    const terkepRef = useRef<L.Map | null>(null);
    const retegRef = useRef<L.LayerGroup | null>(null);
    const kattintasRef = useRef(onToKattintas);

    useEffect(() => {
        kattintasRef.current = onToKattintas;
    });

    useEffect(() => {
        if (!kontenerRef.current) return;
        const { terkep, megszuntet } = letrehozTerkep(kontenerRef.current, {
            kozep: hely ? [hely.lat, hely.lng] : undefined,
            zoom: hely ? GAZDASAG_ZOOM : undefined,
            alapreteg: "muhold",
        });
        terkepRef.current = terkep;
        retegRef.current = L.layerGroup().addTo(terkep);
        return () => {
            megszuntet();
            terkepRef.current = null;
            retegRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const terkep = terkepRef.current;
        const csoport = retegRef.current;
        if (!terkep || !csoport) return;
        csoport.clearLayers();

        if (hely) {
            L.marker([hely.lat, hely.lng], { icon: gombostuIkon(), title: "Halgazdaság helye", keyboard: false }).addTo(csoport);
        }

        const hatarok = L.latLngBounds([]);
        let kiemeltHatar: L.LatLngBounds | null = null;

        for (const t of toak) {
            const szin = tipusSzin(t.tipus);
            const ki = kiemelt === t.azonosito;
            const halvany = kiemelt != null && !ki;
            const reteg = L.polygon(kulsoGyuruLatLng(t.korvonal), {
                color: szin,
                fillColor: szin,
                weight: ki ? 4 : 2.5,
                fillOpacity: halvany ? 0.1 : 0.3,
                opacity: halvany ? 0.6 : 1,
                dashArray: t.aktiv ? undefined : "6 4",
            });

            if (cimkek) {
                reteg.bindTooltip(
                    `<span class="font-semibold">${escape(t.nev)}</span> <span class="opacity-75">#${t.azonosito}</span>`,
                    { permanent: true, direction: "center", className: "terkep-cimke" }
                );
            }
            if (kattintasRef.current) {
                reteg.on("click", () => kattintasRef.current?.(t.azonosito));
                reteg.on("mouseover", () => reteg.setStyle({ fillOpacity: 0.5 }));
                reteg.on("mouseout", () => reteg.setStyle({ fillOpacity: halvany ? 0.1 : 0.3 }));
            }
            reteg.addTo(csoport);
            hatarok.extend(reteg.getBounds());
            if (ki) kiemeltHatar = reteg.getBounds();
        }

        const cel = kiemeltHatar ?? (hatarok.isValid() ? hatarok : null);
        if (cel) terkep.fitBounds(cel, { padding: [30, 30], maxZoom: 18 });
        else if (hely) terkep.setView([hely.lat, hely.lng], GAZDASAG_ZOOM);
    }, [hely, toak, kiemelt, cimkek]);

    return (
        <div
            ref={kontenerRef}
            className={cn("isolate h-[28rem] w-full overflow-hidden rounded-xl border bg-muted", className)}
            role="application"
            aria-label="A halgazdaság tóegységei a térképen"
        />
    );
}
