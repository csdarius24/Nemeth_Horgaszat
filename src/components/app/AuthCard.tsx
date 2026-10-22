import * as React from "react";
import Link from "next/link";

import { BrandMark } from "@/components/app/BrandMark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";

/**
 * Bejelentkezés / regisztráció közös váza — a shadcn `login-03` / `signup-03`
 * blokk mintájára: halvány háttéren középre igazítva a márkanév, alatta a
 * kártya az űrlappal, legalul a felhasználási feltételek.
 */
export function AuthCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="/login" className="self-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    <BrandMark size="sm" />
                </Link>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">
                            <h1>{title}</h1>
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent>{children}</CardContent>
                </Card>

                <FieldDescription className="px-6 text-center">
                    A folytatással elfogadod a felhasználási feltételeket és az adatkezelési tájékoztatót.
                </FieldDescription>
            </div>
        </div>
    );
}
