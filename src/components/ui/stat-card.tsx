import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const tonusok = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  danger: "bg-destructive/10 text-destructive",
} as const;

/**
 * KPI / mutató kártya: felirat, nagy érték, rövid alcím és színes ikon.
 * Mobilon az ikon elrejtődik, hogy a szám elférjen.
 * Hosszú összetett szónál a `cim`-be tegyél feltételes elválasztót (`\u00AD`),
 * különben keskeny kártyán a szó közepén törne (pl. „Takarmánykészle-t”).
 */
function StatCard({
  cim,
  ertek,
  alcim,
  ikon: Ikon,
  tonus = "primary",
  className,
}: {
  cim: string;
  ertek: React.ReactNode;
  alcim?: React.ReactNode;
  ikon: LucideIcon;
  tonus?: keyof typeof tonusok;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-4 sm:py-5", className)}>
      <CardContent className="flex items-start justify-between gap-3 px-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold tracking-wide break-words text-muted-foreground uppercase sm:text-xs">{cim}</p>
          <p className="font-heading text-xl font-bold break-words tabular-nums sm:text-3xl">{ertek}</p>
          {alcim && <p className="text-xs text-muted-foreground">{alcim}</p>}
        </div>
        <div className={cn("hidden size-10 shrink-0 items-center justify-center rounded-lg sm:flex", tonusok[tonus])}>
          <Ikon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

// Statikus osztálynevek, hogy a Tailwind megtalálja őket.
const lgOszlop = { 2: "lg:[--stat-oszlop:2]", 3: "lg:[--stat-oszlop:3]", 4: "lg:[--stat-oszlop:4]", 5: "lg:[--stat-oszlop:5]" } as const;
const xlOszlop = { 2: "xl:[--stat-oszlop:2]", 3: "xl:[--stat-oszlop:3]", 4: "xl:[--stat-oszlop:4]", 5: "xl:[--stat-oszlop:5]" } as const;

/**
 * Rács a StatCard-okhoz. Mobilon 2 oszlop, `oszlopok`-kal nagyobb kijelzőn
 * több. Flex-wrap alapú: egy sorban legfeljebb ennyi kártya fér el, a
 * hiányos utolsó sor kártyái pedig kinyúlnak, így sosem marad üres hely
 * (pl. 5 kártya 3 oszlopon → 3 + 2 szélesebb).
 */
function StatGrid({
  oszlopok,
  className,
  ...props
}: React.ComponentProps<"div"> & { oszlopok?: { lg?: keyof typeof lgOszlop; xl?: keyof typeof xlOszlop } }) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-(--stat-res) [--stat-oszlop:2] [--stat-res:0.75rem] sm:[--stat-res:1rem]",
        "*:min-w-0 *:[flex:1_1_calc((100%_-_(var(--stat-oszlop)_-_1)_*_var(--stat-res))_/_var(--stat-oszlop))]",
        oszlopok?.lg && lgOszlop[oszlopok.lg],
        oszlopok?.xl && xlOszlop[oszlopok.xl],
        className
      )}
      {...props}
    />
  );
}

export { StatCard, StatGrid };
