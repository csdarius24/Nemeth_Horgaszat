import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Oldalfejléc: cím + rövid leírás + jobb oldali műveletek.
 * Mobilon a műveletek a cím alá törnek.
 */
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {description && <div className="text-sm text-muted-foreground sm:text-base">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
