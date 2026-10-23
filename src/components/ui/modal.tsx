"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  /**
   * Ha a felhasználó már módosított valamit, Esc / kattintás kívülre / X előtt
   * rákérdezünk: „Elveted a módosításokat?”. Alapból be van kapcsolva; csak
   * megtekintő (vagy azonnal mentő) modáloknál kell kikapcsolni.
   */
  confirmDiscard?: boolean;
  /** Ha változik (pl. másik nézet / rekord a modálon belül), a „módosítva” jelzés nullázódik. */
  formKey?: React.Key;
};

/**
 * A modál tartalmában lévő egyedi vezérlők (ToggleGroup, Switch, dátumválasztó,
 * színválasztó…) ezen jelzik, hogy a felhasználó módosított valamit. A natív
 * mezők (input, select, textarea) módosítását a modál magától észleli.
 */
const ModalModositasContext = React.createContext<(() => void) | null>(null);

/** Modálon kívül `null`-t ad; így a vezérlők bárhol nyugodtan hívhatják. */
function useModalModositas() {
  return React.useContext(ModalModositasContext);
}

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
  confirmDiscard = true,
  formKey,
}: ModalProps) {
  const [modositva, setModositva] = React.useState(false);
  const [elvetesKerdes, setElvetesKerdes] = React.useState(false);

  // Újranyitáskor / nézetváltáskor tiszta lappal indulunk (render közbeni igazítás, nem effect).
  const [elozo, setElozo] = React.useState({ open, formKey });
  if (elozo.open !== open || elozo.formKey !== formKey) {
    setElozo({ open, formKey });
    setModositva(false);
    setElvetesKerdes(false);
  }

  const jelol = React.useCallback(() => setModositva(true), []);

  const block = (e: Event) => {
    if (preventClose) e.preventDefault();
  };

  function zarasKerelem(next: boolean) {
    if (next) return onOpenChange(true);
    if (preventClose) return;
    if (confirmDiscard && modositva) setElvetesKerdes(true);
    else onOpenChange(false);
  }

  /** Natív mezők módosítása (gépelés, natív select) — buborékozik a tartalomig. */
  function nativModositas(e: React.SyntheticEvent) {
    const t = e.target as HTMLInputElement;
    if (!t.readOnly) setModositva(true);
  }

  return (
    <Dialog open={open} onOpenChange={zarasKerelem}>
      <DialogContent
        className={cn(sizeClasses[size], className)}
        showCloseButton={!preventClose}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
        onInputCapture={nativModositas}
        onChangeCapture={nativModositas}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <ModalModositasContext.Provider value={jelol}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {children && <DialogBody>{children}</DialogBody>}

          {footer && <DialogFooter>{footer}</DialogFooter>}
        </ModalModositasContext.Provider>
      </DialogContent>

      <ConfirmDialog
        open={elvetesKerdes}
        onOpenChange={setElvetesKerdes}
        title="Elveted a módosításokat?"
        description="A beírt adatok nem lesznek elmentve."
        confirmLabel="Elvetés"
        cancelLabel="Folytatom a szerkesztést"
        destructive
        onConfirm={() => {
          setElvetesKerdes(false);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}

export { Modal, useModalModositas, type ModalProps };
