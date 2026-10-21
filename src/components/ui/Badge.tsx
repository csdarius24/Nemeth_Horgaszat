import React from "react";

export interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className = "", variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-border",
    primary: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    danger: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30",
    info: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30",
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
