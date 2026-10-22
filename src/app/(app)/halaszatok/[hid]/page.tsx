import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHalaszatRole } from "@/lib/guards";
import Link from "next/link";
import { BookOpen, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import DashboardClient from "./ui/DashboardClient";

const SZEREPKOR_CIMKE = { OWNER: "Tulajdonos", ADMIN: "Adminisztrátor", STAFF: "Dolgozó" } as const;

export default async function HalaszatDashboardPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    const halaszatId = Number(hid);

    if (!Number.isFinite(halaszatId) || halaszatId < 1) redirect("/halaszatok");

    const access = await requireHalaszatRole(halaszatId, "STAFF");
    if (!access.ok) {
        if (access.status === 401) redirect("/login");
        return <ErrorState title="Nincs hozzáférés" message={access.error} />;
    }

    const halaszat = await prisma.halaszat.findUnique({
        where: { azonosito: halaszatId },
        select: { azonosito: true, nev: true, slug: true, aktiv: true },
    });

    if (!halaszat) {
        return <ErrorState title="Nincs ilyen halászat" message="Lehet, hogy törölték, vagy hibás a hivatkozás." />;
    }

    const role = access.role;

    return (
        <div>
            <PageHeader
                title={halaszat.nev}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        Áttekintés
                        <Badge variant="primary">{SZEREPKOR_CIMKE[role] ?? role}</Badge>
                        {!halaszat.aktiv && <Badge variant="warning">Inaktív</Badge>}
                    </span>
                }
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href={`/halaszatok/${hid}/naplo`}>
                                <BookOpen />
                                Napló
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/halaszatok/${hid}/toak`}>
                                <Waves />
                                Tavak
                            </Link>
                        </Button>
                    </>
                }
            />

            <DashboardClient hid={String(halaszat.azonosito)} viewerRole={role} />
        </div>
    );
}
