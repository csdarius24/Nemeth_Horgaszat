"use client";

import { useCallback, useEffect, useState } from "react";

import type { LatLng, PoligonGeometria } from "@/lib/terkep/geo";

export type TerkepAdatTo = {
    azonosito: number;
    nev: string;
    tipus: string;
    aktiv: boolean;
    korvonal: PoligonGeometria;
    kozeppontLat: number | null;
    kozeppontLng: number | null;
    rajzoltTeruletM2: number | null;
};

export type TerkepAdat = {
    halaszat: { azonosito: number; nev: string; helyLat: number | null; helyLng: number | null };
    toak: TerkepAdatTo[];
    korvonalNelkul: Array<{ azonosito: number; nev: string; tipus: string }>;
    viewerRole: "OWNER" | "ADMIN" | "STAFF";
};

/** A halászat térkép-adatai (`GET /api/halaszatok/[hid]/terkep`). `aktiv=false` → nem tölt. */
export function useTerkepAdat(hid: string, aktiv = true) {
    const [adat, setAdat] = useState<TerkepAdat | null>(null);
    const [toltes, setToltes] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    const betolt = useCallback(async () => {
        setToltes(true);
        setHiba(null);
        try {
            const res = await fetch(`/api/halaszatok/${hid}/terkep`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Nem sikerült betölteni a térkép adatait.");
            setAdat(json as TerkepAdat);
        } catch (e) {
            setHiba(e instanceof Error ? e.message : "Ismeretlen hiba");
        } finally {
            setToltes(false);
        }
    }, [hid]);

    useEffect(() => {
        if (aktiv) void betolt();
    }, [aktiv, betolt]);

    const hely: LatLng | null =
        adat?.halaszat.helyLat != null && adat.halaszat.helyLng != null
            ? { lat: adat.halaszat.helyLat, lng: adat.halaszat.helyLng }
            : null;

    return { adat, hely, toltes, hiba, betolt };
}
