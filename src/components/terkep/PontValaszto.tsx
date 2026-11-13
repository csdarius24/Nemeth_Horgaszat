"use client";

import { useEffect, useRef } from "react";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { LatLng } from "@/lib/terkep/geo";
import { cn } from "@/lib/utils";

import { GAZDASAG_ZOOM, gombostuIkon, L, letrehozTerkep } from "./alap";
import CimKereso from "./CimKereso";

/**
 * Egy pont kiválasztása a térképen (pl. a halgazdaság helye).
 * Kattintás = gombostű lerakása, a gombostű húzható. „Saját helyem” gomb a
 * böngésző helymeghatározásával.
 */
export default function PontValaszto({ ertek, onChange, className, disabled }: {
    ertek: LatLng | null;
    onChange: (p: LatLng) => void;
    className?: string;
    disabled?: boolean;
}) {
    const kontenerRef = useRef<HTMLDivElement>(null);
    const terkepRef = useRef<L.Map | null>(null);
    const jeloloRef = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    const disabledRef = useRef(disabled);

    useEffect(() => {
        onChangeRef.current = onChange;
        disabledRef.current = disabled;
    });

    const kerekit = (p: L.LatLng): LatLng => ({
        lat: Math.round(p.lat * 1e6) / 1e6,
        lng: Math.round(p.lng * 1e6) / 1e6,
    });

    // Térkép létrehozása (egyszer).
    useEffect(() => {
        if (!kontenerRef.current) return;
        const { terkep, megszuntet } = letrehozTerkep(kontenerRef.current, { alapreteg: "muhold" });
        terkepRef.current = terkep;
        terkep.getContainer().style.cursor = "crosshair";
        terkep.on("click", (e: L.LeafletMouseEvent) => {
            if (disabledRef.current) return;
            onChangeRef.current(kerekit(e.latlng));
        });
        return () => {
            megszuntet();
            terkepRef.current = null;
            jeloloRef.current = null;
        };
    }, []);

    // Gombostű szinkronizálása az értékkel.
    useEffect(() => {
        const terkep = terkepRef.current;
        if (!terkep) return;
        if (!ertek) {
            jeloloRef.current?.remove();
            jeloloRef.current = null;
            return;
        }
        if (!jeloloRef.current) {
            const jelolo = L.marker([ertek.lat, ertek.lng], { icon: gombostuIkon(), draggable: true, keyboard: true, title: "Halgazdaság helye" });
            jelolo.on("dragend", () => onChangeRef.current(kerekit(jelolo.getLatLng())));
            jelolo.addTo(terkep);
            jeloloRef.current = jelolo;
            terkep.setView([ertek.lat, ertek.lng], Math.max(terkep.getZoom(), GAZDASAG_ZOOM));
        } else {
            jeloloRef.current.setLatLng([ertek.lat, ertek.lng]);
        }
    }, [ertek]);

    function sajatHely() {
        if (!navigator.geolocation) {
            toast.error("A böngésző nem támogatja a helymeghatározást.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                onChangeRef.current({ lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 });
                terkepRef.current?.setView([p.lat, p.lng], GAZDASAG_ZOOM);
            },
            () => toast.error("Nem sikerült lekérni a helyzetedet.", { description: "Jelöld meg kattintással a térképen." }),
            { enableHighAccuracy: true, timeout: 10_000 }
        );
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <CimKereso
                disabled={disabled}
                onValaszt={(t) => {
                    onChangeRef.current({ lat: t.lat, lng: t.lng });
                    terkepRef.current?.setView([t.lat, t.lng], 16);
                }}
            />
            <div
                ref={kontenerRef}
                className="isolate h-72 w-full overflow-hidden rounded-xl border bg-muted sm:h-80"
                role="application"
                aria-label="Térkép: kattints a halgazdaság helyére"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span className="tabular-nums">
                    {ertek
                        ? `${ertek.lat.toLocaleString("hu-HU", { maximumFractionDigits: 6 })}, ${ertek.lng.toLocaleString("hu-HU", { maximumFractionDigits: 6 })}`
                        : "Keress címre, vagy kattints a térképre a hely megjelöléséhez."}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={sajatHely} disabled={disabled}>
                    <LocateFixed />
                    Saját helyem
                </Button>
            </div>
        </div>
    );
}
