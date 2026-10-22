"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type IconButtonProps = Omit<ButtonProps, "size" | "children" | "aria-label"> & {
  /** Kötelező, látható felirat nélküli gomb akadálymentes neve + tooltip szövege. */
  label: string;
  icon: React.ReactNode;
  size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  /** Tooltip elrejtése (pl. ha a gomb mellett már ott a felirat). */
  hideTooltip?: boolean;
  tooltipSide?: React.ComponentProps<typeof TooltipContent>["side"];
};

/**
 * Csak ikonos gomb. A `label` kötelező: ebből lesz az `aria-label` és a tooltip,
 * így képernyőolvasóval és egérrel is egyértelmű, mit csinál.
 */
function IconButton({
  label,
  icon,
  size = "icon",
  variant = "ghost",
  hideTooltip = false,
  tooltipSide = "bottom",
  ...props
}: IconButtonProps) {
  const button = (
    <Button variant={variant} size={size} aria-label={label} {...props}>
      {icon}
    </Button>
  );

  if (hideTooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { IconButton, type IconButtonProps };
