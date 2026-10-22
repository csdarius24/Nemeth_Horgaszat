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

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [hiba, setHiba] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setHiba(data?.error ?? "Sikertelen bejelentkezés.");
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
            title="Üdv újra!"
            description="Lépj be az email címeddel és a jelszavaddal."
        >
            <form onSubmit={onSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="email">Email cím</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            placeholder="pelda@email.com"
                            aria-invalid={!!hiba || undefined}
                            required
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="password">Jelszó</FieldLabel>
                        <PasswordInput
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            aria-invalid={!!hiba || undefined}
                            required
                        />
                    </Field>

                    {hiba && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertDescription>{hiba}</AlertDescription>
                        </Alert>
                    )}

                    <Field>
                        <Button type="submit" loading={loading}>
                            {loading ? "Beléptetés…" : "Belépés"}
                        </Button>
                        <FieldDescription className="text-center">
                            Nincs még fiókod? <Link href="/register">Regisztrálj</Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </AuthCard>
    );
}
