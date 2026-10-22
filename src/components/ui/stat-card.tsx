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

/** Rács a StatCard-okhoz: páratlan darabszámnál mobilon az utolsó kitölti a sort. */
function StatGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1",
        className
      )}
      {...props}
    />
  );
}

export { StatCard, StatGrid };
