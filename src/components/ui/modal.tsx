"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Gombsor a modál alján (jobbra igazítva, mobilon teljes szélességben, egymás alatt). */
  footer?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Mentés közben ne lehessen véletlenül bezárni (Esc / kattintás kívülre). */
  preventClose?: boolean;
};

/**
 * Az alkalmazás EGYETLEN, egységes modál mintája (shadcn Dialog-ra építve).
 *
 * Amit a Radix Dialog ad: fókuszcsapda, Esc-re zárás, fókusz visszaadása a
 * nyitó gombra, görgetés-zárolás, `role="dialog"` + `aria-labelledby`.
 *
 *   <Modal open={nyitva} onOpenChange={setNyitva} title="Új tó"
 *          footer={<><Button variant="outline" onClick={…}>Mégse</Button>
 *                    <Button type="submit" form="uj-to" loading={mentes}>Mentés</Button></>}>
 *     <form id="uj-to" onSubmit={…}>…</form>
 *   </Modal>
 */
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  preventClose = false,
}: ModalProps) {
  const block = (e: Event) => {
    if (preventClose) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (preventClose && !next ? undefined : onOpenChange(next))}>
      <DialogContent
        className={cn(sizeClasses[size], className)}
        showCloseButton={!preventClose}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && <DialogBody>{children}</DialogBody>}

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export { Modal, type ModalProps };
