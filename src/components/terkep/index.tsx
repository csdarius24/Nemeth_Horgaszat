"use client";

// A térkép-komponensek csak kliensen futnak (Leaflet → `window`), ezért
// dinamikusan, SSR nélkül töltjük be őket. MINDIG innen importáld őket.

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const Toltes = ({ magassag }: { magassag: string }) => (
    <Skeleton className={`${magassag} w-full rounded-xl`} aria-label="Térkép betöltése" />
);

export const PontValaszto = dynamic(() => import("./PontValaszto"), {
    ssr: false,
    loading: () => <Toltes magassag="h-72 sm:h-80" />,
});

export const KorvonalRajzolo = dynamic(() => import("./KorvonalRajzolo"), {
    ssr: false,
    loading: () => <Toltes magassag="h-80 sm:h-96" />,
});

export const HalaszatTerkep = dynamic(() => import("./HalaszatTerkep"), {
    ssr: false,
    loading: () => <Toltes magassag="h-[28rem]" />,
});

export type { ReferenciaTo } from "./KorvonalRajzolo";
export type { TerkepTo } from "./HalaszatTerkep";
