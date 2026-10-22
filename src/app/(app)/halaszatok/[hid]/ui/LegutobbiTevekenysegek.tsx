import Link from "next/link";
import { History } from "lucide-react";

import { EsemenyElem } from "@/components/app/EsemenyElem";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";

import type { LegutobbiEsemeny } from "./HalaszatStatClient";

const MAX_TETEL = 6;

export function LegutobbiTevekenysegek({ hid, esemenyek }: { hid: string; esemenyek: LegutobbiEsemeny[] | null | undefined }) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Legutóbbi tevékenységek</CardTitle>
                <CardDescription>A naplóba rögzített utolsó műveletek.</CardDescription>
                <CardAction>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/halaszatok/${hid}/naplo`}>Napló</Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                {esemenyek === undefined ? (
                    <div className="grid gap-3" role="status" aria-label="Tevékenységek betöltése">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                    </div>
                ) : !esemenyek || esemenyek.length === 0 ? (
                    <EmptyState
                        className="p-6 md:p-8"
                        icon={<History />}
                        title="Még nincs naplózott művelet"
                        description="A telepítések, etetések és kivételek itt jelennek meg."
                    />
                ) : (
                    <ol className="divide-y">
                        {esemenyek.slice(0, MAX_TETEL).map((e) => (
                            <EsemenyElem
                                key={e.azonosito}
                                tipus={e.tipus}
                                cimKiegeszites={e.to?.nev}
                                leiras={e.leiras}
                                datum={e.datum}
                                rogzito={e.rogzitoNev}
                            />
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
