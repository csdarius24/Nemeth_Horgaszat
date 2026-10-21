"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = "md" }: ModalProps) {
  // Görgetés letiltása, amíg a modal nyitva van
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Sötétített háttér (Backdrop) */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Kártya */}
      <div className={`relative w-full ${maxWidthClasses[maxWidth]} bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}>
        
        {/* Fejléc */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tartalom */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>

        {/* Lábjegyzet / Gombok */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-slate-50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
