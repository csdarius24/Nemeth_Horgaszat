"use client";

import * as React from "react";
import { ChevronDown, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * Összecsukható „Tudnivalók” doboz az oldalak alján (hogyan működik a modul,
 * mi nincs még kész). Alapból zárva, hogy ne foglalja a helyet.
 */
export function Tudnivalok({ cim, children }: { cim: string; children: React.ReactNode }) {
    return (
        <Collapsible>
            <Alert variant="info">
                <Info />
                <AlertTitle>
                    <CollapsibleTrigger className="group flex items-center gap-1 rounded-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        {cim}
                        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                    </CollapsibleTrigger>
                </AlertTitle>
                <CollapsibleContent asChild>
                    <AlertDescription className="text-muted-foreground">{children}</AlertDescription>
                </CollapsibleContent>
            </Alert>
        </Collapsible>
    );
}
