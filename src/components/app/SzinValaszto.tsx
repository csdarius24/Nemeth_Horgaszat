"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * Kerek színminták választója (billentyűzettel és képernyőolvasóval is
 * kezelhető: rádiócsoport, nyilakkal léptethető, minden mintának van neve).
 */
export function SzinValaszto({ szinek, value, onChange, label = "Szín" }: {
    szinek: ReadonlyArray<{ ertek: string; cimke: string; hex: string }>;
    value: string;
    onChange: (ertek: string) => void;
    label?: string;
}) {
    return (
        <ToggleGroup type="single" spacing={2} value={value} onValueChange={(v) => v && onChange(v)} aria-label={label} className="flex-wrap">
            {szinek.map((s) => (
                <ToggleGroupItem
                    key={s.ertek}
                    value={s.ertek}
                    aria-label={s.cimke}
                    title={s.cimke}
                    className="size-9 min-w-9 rounded-full p-0 data-[state=on]:bg-transparent"
                >
                    <span
                        className={cn(
                            "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background",
                            value === s.ertek && "ring-2 ring-foreground/70"
                        )}
                        style={{ background: s.hex }}
                    >
                        {value === s.ertek && <Check className="size-4 text-white" aria-hidden="true" />}
                    </span>
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
