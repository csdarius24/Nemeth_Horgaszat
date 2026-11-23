"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, MapPinned, RefreshCw, TriangleAlert } from "lucide-react";

import { HalaszatTerkep, PontValaszto } from "@/components/terkep";
import { TIPUS_SZIN } from "@/components/terkep/szinek";
import { useTerkepAdat } from "@/components/terkep/useTerkepAdat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { rajzoltTeruletSzoveg, type LatLng } from "@/lib/terkep/geo";
import { toTipusCimke } from "@/lib/toak/attekintes";
import { cn } from "@/lib/utils";

const TIPUS_JELMAGYARAZAT = Object.entries(TIPUS_SZIN).map(([tipus, szin]) => ({ tipus, szin }));

/** Halgazdaság helyének megadása / módosítása (ADMIN+). */
function HelyModal({ hid, open, onOpenChange, kezdo, onMentve }: {
    hid: string;
    open: boolean;
    onOpenChange: (o: boolean) => void;
    kezdo: LatLng | null;
    onMentve: () => void;
}) {
    const [hely, setHely] = useState<LatLng | null>(kezdo);
    const [mentes, setMentes] = useState(false);

    // Újranyitáskor az aktuális értékről indulunk (render közbeni igazítás).
    const [elozoOpen, setElozoOpen] = useState(open);
    if (elozoOpen !== open) {
        setElozoOpen(open);
        if (open) setHely(kezdo);
    }

    async function ment() {
        if (!hely) return;
        setMentes(true);
        try {
            const res = await fetch(`/api/halaszatok/${hid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ helyLat: hely.lat, helyLng: hely.lng }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { toast.error(json?.hiba ?? "Nem sikerült menteni."); return; }
            toast.success("Halgazdaság helye mentve");
            onOpenChange(false);
            onMentve();
        } finally {
            setMentes(false);
        }
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Halgazdaság helye"
            description="Kattints a térképre, vagy húzd a gombostűt. Ez alapján jelenik meg az időjárás."
            size="lg"
            preventClose={mentes}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mentes}>Mégse</Button>
                    <Button onClick={ment} loading={mentes} disabled={!hely}>Mentés</Button>
                </>
            }
        >
            <PontValaszto ertek={hely} onChange={setHely} disabled={mentes} />
        </Modal>
    );
}

export default function TerkepClient({ hid }: { hid: string }) {
    const router = useRouter();
    const { adat, hely, toltes, hiba, betolt } = useTerkepAdat(hid);
    const [helyNyitva, setHelyNyitva] = useState(false);

    if (!adat && !hiba) {
        return (
            <div className="grid gap-6" role="status" aria-label="Térkép betöltése">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-[28rem] w-full rounded-xl" />
            </div>
        );
    }

    if (hiba || !adat) {
        return (
            <div className="grid gap-6">
                <PageHeader className="mb-0" title="Térkép" />
                <ErrorState title="Nem sikerült betölteni a térképet" message={hiba ?? "Nincs adat."} onRetry={() => betolt()} />
            </div>
        );
    }

    const kezelo = adat.viewerRole === "OWNER" || adat.viewerRole === "ADMIN";

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <PageHeader
                className="mb-0"
                title="Térkép"
                description={`${adat.toak.length} tóegység a térképen${adat.korvonalNelkul.length ? ` · ${adat.korvonalNelkul.length} körvonal nélkül` : ""}`}
                actions={
                    <div className="flex items-center gap-2">
                        {kezelo && (
                            <Button variant="outline" onClick={() => setHelyNyitva(true)}>
                                <MapPin />
                                {hely ? "Gazdaság helye" : "Hely megadása"}
                            </Button>
                        )}
                        <IconButton
                            label="Frissítés"
                            icon={<RefreshCw className={cn(toltes && "animate-spin")} />}
                            variant="outline"
                            onClick={() => betolt()}
                            disabled={toltes}
                        />
                    </div>
                }
            />

            {!hely && (
                <Alert>
                    <TriangleAlert />
                    <AlertTitle>Még nincs megadva a halgazdaság helye</AlertTitle>
                    <AlertDescription>
                        {kezelo
                            ? "Add meg a helyet — erre épül a térkép kezdőnézete és az időjárás modul."
                            : "Egy adminisztrátor tudja megadni a halgazdaság helyét."}
                    </AlertDescription>
                </Alert>
            )}

            <Card className="gap-4 py-4">
                <CardContent className="grid gap-3 px-4">
                    <HalaszatTerkep
                        className="h-[60vh] min-h-80"
                        hely={hely}
                        toak={adat.toak}
                        onToKattintas={(id) => router.push(`/halaszatok/${hid}/toak/${id}`)}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {TIPUS_JELMAGYARAZAT.map((j) => (
                            <span key={j.tipus} className="flex items-center gap-1.5">
                                <span className="size-3 rounded-sm border-2" style={{ borderColor: j.szin, background: `${j.szin}4d` }} aria-hidden="true" />
                                {toTipusCimke(j.tipus)}
                            </span>
                        ))}
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-sm border-2 border-dashed border-muted-foreground" aria-hidden="true" />
                            Inaktív
                        </span>
                        <span className="ml-auto">Kattints egy tóra az adatlapjához.</span>
                    </div>
                </CardContent>
            </Card>

            {adat.toak.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tóegységek a térképen</CardTitle>
                        <CardDescription>Név, azonosító és a körvonalból számolt terület.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="divide-y">
                            {adat.toak.map((t) => (
                                <li key={t.azonosito}>
                                    <Link
                                        href={`/halaszatok/${hid}/toak/${t.azonosito}`}
                                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-primary"
                                    >
                                        <span className="flex items-center gap-2 font-medium">
                                            {t.nev}
                                            <span className="text-muted-foreground">#{t.azonosito}</span>
                                            <Badge variant="outline">{toTipusCimke(t.tipus)}</Badge>
                                        </span>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                            {t.rajzoltTeruletM2 != null ? rajzoltTeruletSzoveg(t.rajzoltTeruletM2) : "–"}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {adat.korvonalNelkul.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPinned className="size-5 text-warning" aria-hidden="true" />
                            Körvonal nélküli tóegységek
                        </CardTitle>
                        <CardDescription>
                            Ezek a térképes funkció előtt készültek. Nyisd meg őket, és a „Szerkesztés” gombbal rajzold be a körvonalukat.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="flex flex-wrap gap-2">
                            {adat.korvonalNelkul.map((t) => (
                                <li key={t.azonosito}>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/halaszatok/${hid}/toak/${t.azonosito}`}>
                                            {t.nev} <span className="text-muted-foreground">#{t.azonosito}</span>
                                        </Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {kezelo && (
                <HelyModal hid={hid} open={helyNyitva} onOpenChange={setHelyNyitva} kezdo={hely} onMentve={betolt} />
            )}
        </div>
    );
}
