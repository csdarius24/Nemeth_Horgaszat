
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Hiba történt", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start w-full p-5 border border-red-200 bg-red-50 rounded-2xl">
      <div className="flex items-center gap-3 mb-2 text-danger">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-bold text-base">{title}</h3>
      </div>
      <p className="text-sm text-red-800 font-medium mb-4">{message}</p>
      
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Újrapróbálkozás
        </Button>
      )}
    </div>
  );
}
