import React from "react";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ className = "", error, icon, ...props }: InputProps) {
  
  // Tiszta, flat dizájn határozott kerettel és elegáns fókusszal
  const baseStyles =
    "flex w-full rounded-xl border-2 px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 bg-white";
  
  const stateStyles = error
    ? "border-danger/60 focus:border-danger focus:ring-danger/10"
    : "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-primary/10";
    
  const paddingStyles = icon ? "pl-11" : "";

  return (
    <div className="relative w-full group">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </div>
      )}
      
      <input className={`${baseStyles} ${stateStyles} ${paddingStyles} ${className}`} {...props} />
      
      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}
