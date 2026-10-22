import { redirect } from "next/navigation";

import { requireHalaszatRole } from "@/lib/guards";
import { ErrorState } from "@/components/ui/states";
import ToDashboardClient from "./ui/ToDashboardClient";

export default async function ToDashboardPage(props: { params: Promise<{ hid: string; toId: string }> }) {
    const { hid, toId } = await props.params;
    const halaszatId = Number(hid);
    if (!Number.isFinite(halaszatId) || halaszatId < 1) redirect("/halaszatok");

    // A szerepkör csak a felület igazításához kell (pl. a telepítés/kivétel/áttelepítés
    // gombok ADMIN/OWNER-nek látszanak) — a jogosultságot a végpontok ellenőrzik.
    const access = await requireHalaszatRole(halaszatId, "STAFF");
    if (!access.ok) {
        if (access.status === 401) redirect("/login");
        return <ErrorState title="Nincs hozzáférés" message={access.error} />;
    }

    return <ToDashboardClient hid={hid} toId={toId} viewerRole={access.role} />;
}
