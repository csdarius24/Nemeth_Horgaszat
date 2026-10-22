"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { AuthCard } from "@/components/app/AuthCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export default function RegisterPage() {
    const router = useRouter();
    const [nev, setNev] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [jelszoUjra, setJelszoUjra] = useState("");
    const elteroJelszo = jelszoUjra !== "" && jelszoUjra !== password;
    const [hiba, setHiba] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        // Csak felületi ellenőrzés: a megerősítő mező nem megy a szerverre.
        if (password !== jelszoUjra) {
            setHiba("A két jelszó nem egyezik.");
            return;
        }
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nev: nev.trim(), email: email.trim(), password }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(data?.error ?? "Sikertelen regisztráció.");
                setLoading(false);
                return;
            }

            router.push("/halaszatok");
            router.refresh();
        } catch {
            setHiba("Hálózati hiba.");
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Hozd létre a fiókod"
            description="Add meg az adataidat a fiók létrehozásához."
        >
            <form onSubmit={onSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="nev">Teljes név</FieldLabel>
                        <Input
                            id="nev"
                            type="text"
                            value={nev}
                            onChange={(e) => setNev(e.target.value)}
                            autoComplete="name"
                            placeholder="Nagy Sándor"
                            required
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="email">Email cím</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            placeholder="pelda@email.com"
                            required
                        />
                    </Field>

                    <Field>
                        <Field className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="password">Jelszó</FieldLabel>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    aria-describedby="password-help"
                                    required
                                />
                            </Field>
                            <Field data-invalid={elteroJelszo || undefined}>
                                <FieldLabel htmlFor="password-ujra">Megerősítés</FieldLabel>
                                <PasswordInput
                                    id="password-ujra"
                                    value={jelszoUjra}
                                    onChange={(e) => setJelszoUjra(e.target.value)}
                                    autoComplete="new-password"
                                    aria-invalid={elteroJelszo || undefined}
                                    aria-describedby="password-help"
                                    required
                                />
                            </Field>
                        </Field>
                        <FieldDescription id="password-help">
                            {elteroJelszo ? "A két jelszó nem egyezik." : "Legalább 8 karakter, mindkét mezőbe ugyanaz."}
                        </FieldDescription>
                    </Field>

                    {hiba && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertDescription>{hiba}</AlertDescription>
                        </Alert>
                    )}

                    <Field>
                        <Button type="submit" loading={loading}>
                            {loading ? "Létrehozás…" : "Fiók létrehozása"}
                        </Button>
                        <FieldDescription className="text-center">
                            Van már fiókod? <Link href="/login">Lépj be</Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </AuthCard>
    );
}
