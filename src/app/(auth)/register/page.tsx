"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, AlertCircle, Fish } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
    const router = useRouter();
    const [nev, setNev] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [hiba, setHiba] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHiba(null);
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
        <div className="min-h-screen w-full flex bg-white">

            {/* BAL OLDAL - Brand Panel */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
                <div className="absolute inset-0 bg-primary/10" />
                <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/20 blur-[120px]" />

                {/* Prémium Logó terület */}
                <div className="relative z-10 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.3)] border border-white/20">
                        <Fish className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
                        Fish App
                    </span>
                </div>

                {/* Hero Szöveg */}
                <div className="relative z-10 max-w-lg mb-12 text-white">
                    <h2 className="text-4xl font-bold leading-tight mb-5">
                        Indítsd el a halgazdaságod digitalizációját.
                    </h2>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Hozd létre a fiókod, és csatlakozz a legkorszerűbb hazai halászati menedzsment platformhoz.
                    </p>
                </div>

            </div>

            {/* JOBB OLDAL - Auth Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-[400px] grid gap-8">

                    <div className="grid gap-2">
                        <h1 className="text-3xl font-bold text-foreground">Regisztráció</h1>
                        <p className="text-slate-500 font-medium">Hozd létre az új fiókodat.</p>
                    </div>

                    <form onSubmit={onSubmit} className="grid gap-5">
                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-foreground">Teljes név</label>
                            <Input
                                type="text"
                                value={nev}
                                onChange={(e) => setNev(e.target.value)}
                                autoComplete="name"
                                placeholder="Nagy Sándor"
                                icon={<User />}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-foreground">Email cím</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                placeholder="pelda@email.com"
                                icon={<Mail />}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-foreground">Jelszó</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="legalább 8 karakter"
                                icon={<Lock />}
                                required
                            />
                        </div>

                        {hiba && (
                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-danger">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div className="text-sm font-semibold">{hiba}</div>
                            </div>
                        )}

                        <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full mt-2">
                            {loading ? "Létrehozás…" : "Fiók létrehozása"}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-slate-500 font-medium mt-2">
                        Van már fiókod?{" "}
                        <Link href="/login" className="text-primary hover:text-primary-hover transition-colors font-bold">
                            Lépj be itt
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
