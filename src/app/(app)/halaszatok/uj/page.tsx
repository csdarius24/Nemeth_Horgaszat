"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { HibaAlert } from "@/components/app/urlap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export default function UjHalaszatPage() {
    const router = useRouter();
    const [nev, setNev] = useState("");
    const [loading, setLoading] = useState(false);
    const [hiba, setHiba] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);

        const trimmed = nev.trim();
        if (trimmed.length < 3) {
            setHiba("Adj meg legalább 3 karaktert.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/halaszatok", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: trimmed }),
            });

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setHiba(data?.hiba ?? "Nem sikerült létrehozni a halászatot.");
                return;
            }

            toast.success("Halászat létrehozva", { description: data?.halaszat?.nev ?? trimmed });
            // Egyből az új halászat áttekintőjére visszük — ott tud tavat felvenni.
            const id = data?.halaszat?.azonosito;
            router.push(id ? `/halaszatok/${id}` : "/halaszatok");
            router.refresh();
        } catch {
            setHiba("Hálózati hiba. Próbáld újra.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid gap-6">
            <Button variant="ghost" size="sm" asChild className="-mb-2 justify-self-start text-muted-foreground">
                <Link href="/halaszatok">
                    <ArrowLeft />
                    Vissza a halászataimhoz
                </Link>
            </Button>

            <div className="grid gap-1.5 text-center">
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Új halászat</h1>
                <p className="text-balance text-muted-foreground">
                    Létrehozás után automatikusan te leszel a tulajdonosa, és meghívhatod a csapatot.
                </p>
            </div>

            <Card>
                <CardContent>
                    <form id="uj-halaszat" onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field data-invalid={!!hiba || undefined}>
                                <FieldLabel htmlFor="halaszat-nev">Halászat neve</FieldLabel>
                                <Input
                                    id="halaszat-nev"
                                    value={nev}
                                    onChange={(e) => setNev(e.target.value)}
                                    placeholder="pl. Németh Halászat Kft."
                                    disabled={loading}
                                    aria-invalid={!!hiba || undefined}
                                    required
                                    minLength={3}
                                    autoFocus
                                />
                                <FieldDescription>Legalább 3 karakter. Később is látszik a halászat-váltóban.</FieldDescription>
                            </Field>
                            <HibaAlert uzenet={hiba} />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter className="flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href="/halaszatok">Mégse</Link>
                    </Button>
                    <Button type="submit" form="uj-halaszat" loading={loading} className="w-full sm:w-auto">
                        Halászat létrehozása
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
