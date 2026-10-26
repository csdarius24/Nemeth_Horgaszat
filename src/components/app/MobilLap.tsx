"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Mobilon alulról felcsúszó lap (shadcn Sheet, `side="bottom"`): hüvelykujjal
 * elérhető, lekerekített tetejű, fogantyúval. A halászat-váltó és a
 * „Továbbiak” menü közös kerete.
 */
export function MobilLap({
    open,
    onOpenChange,
    cim,
    leiras,
    children,
    className,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cim: string;
    leiras?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className={cn(
                    "max-h-[85dvh] gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]",
                    className
                )}
            >
                <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
                <SheetHeader className="pt-3 pb-2">
                    <SheetTitle>{cim}</SheetTitle>
                    <SheetDescription className={leiras ? undefined : "sr-only"}>{leiras ?? cim}</SheetDescription>
                </SheetHeader>
                <div className="min-h-0 overflow-y-auto px-4">{children}</div>
            </SheetContent>
        </Sheet>
    );
}
