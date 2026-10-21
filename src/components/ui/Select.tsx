import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.ComponentProps<"select"> {
  error?: string;
  icon?: React.ReactNode;
}

export function Select({ className = "", error, icon, children, ...props }: SelectProps) {
  const baseStyles =
    "flex w-full appearance-none rounded-xl border-2 px-4 py-3 text-sm text-foreground transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 bg-white";
  
  const stateStyles = error
    ? "border-danger/60 focus:border-danger focus:ring-danger/10"
    : "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-primary/10";
    
  const paddingStyles = icon ? "pl-11" : "";

  return (
    <div className="relative w-full group">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 pointer-events-none">
          {icon}
        </div>
      )}
      
      <select className={`${baseStyles} ${stateStyles} ${paddingStyles} ${className}`} {...props}>
        {children}
      </select>
      
      {/* Egyedi legördülő nyíl */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <ChevronDown className="w-4 h-4" />
      </div>
      
      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}
