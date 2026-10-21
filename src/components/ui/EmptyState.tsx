import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 md:p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 [&_svg]:w-8 [&_svg]:h-8">
        {icon || <FolderOpen />}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
