import React from "react";
import { Loader2 } from "lucide-react";

export function Loading({ text = "Betöltés..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full p-12 text-slate-400">
      <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
      {text && <p className="text-sm font-medium">{text}</p>}
    </div>
  );
}
