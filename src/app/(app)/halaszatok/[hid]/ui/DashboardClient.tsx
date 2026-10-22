"use client";

import { useState } from "react";

import HalaszatStatClient, { type LegutobbiEsemeny } from "./HalaszatStatClient";
import { LegutobbiTevekenysegek } from "./LegutobbiTevekenysegek";
import ToListaClient from "./ToListaClient";

/**
 * Halászat áttekintő (dashboard) kliens része: összesítő + vízegységek +
 * legutóbbi tevékenységek. A tevékenységeket az összesítő végpont adja,
 * ezért azt innen osztjuk tovább.
 */
export default function DashboardClient({ hid, viewerRole }: { hid: string; viewerRole: "OWNER" | "ADMIN" | "STAFF" }) {
    // undefined = még tölt, null = nincs adat / hiba
    const [legutobbi, setLegutobbi] = useState<LegutobbiEsemeny[] | null | undefined>(undefined);
    const [frissites, setFrissites] = useState(0);

    return (
        <div className="grid gap-6">
            <HalaszatStatClient hid={hid} frissites={frissites} onLegutobbiEsemenyek={setLegutobbi} />

            <div className="grid gap-4 lg:grid-cols-2">
                <ToListaClient hid={hid} viewerRole={viewerRole} onValtozas={() => setFrissites((n) => n + 1)} />
                <LegutobbiTevekenysegek hid={hid} esemenyek={legutobbi} />
            </div>
        </div>
    );
}
