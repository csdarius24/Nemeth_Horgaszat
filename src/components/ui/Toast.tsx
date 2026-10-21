import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface ToastProps {
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
}

export function Toast({ title, description, type = "info", onClose }: ToastProps) {
  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-white border-slate-200 text-slate-800",
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-danger" />,
    info: <Info className="w-5 h-5 text-primary" />,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg max-w-sm w-full ${styles[type]}`}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold">{title}</h4>
        {description && <p className="text-sm mt-1 opacity-90 font-medium">{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
