import { Loader2 } from "lucide-react";
import React from "react";

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm focus-visible:ring-primary/30",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:ring-slate-500/30",
    outline: "border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-foreground focus-visible:ring-slate-500/30",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground",
    danger: "bg-danger text-danger-foreground hover:bg-red-700 shadow-sm focus-visible:ring-danger/30",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-11 w-11",
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button
      disabled={disabled || isLoading}
      className={combinedClasses}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
