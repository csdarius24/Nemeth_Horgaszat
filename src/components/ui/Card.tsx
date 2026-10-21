import React from "react";

export interface CardProps extends React.ComponentProps<"div"> {}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div 
      className={`bg-card border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`p-6 md:p-8 ${className}`} {...props}>
      {children}
    </div>
  );
}
