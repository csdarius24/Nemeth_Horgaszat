import * as React from "react";
import { FolderOpen, RotateCcw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

/*
 * Egységes oldal-/szekcióállapotok: betöltés, hiba, üres lista.
 * Minden listás/adatos nézet ezt a hármast használja, hogy az app mindenhol
 * ugyanúgy „viselkedjen”.
 */

function LoadingState({
  text = "Betöltés…",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 p-10 text-sm text-muted-foreground",
        className
      )}
    >
      <Spinner className="size-6 text-primary" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function ErrorState({
  title = "Hiba történt",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 text-foreground">
            <RotateCcw />
            Újrapróbálás
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function EmptyState({
  title,
  description,
  icon = <FolderOpen />,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("border bg-card", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-accent text-accent-foreground">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="font-heading font-bold">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

export { LoadingState, ErrorState, EmptyState };
