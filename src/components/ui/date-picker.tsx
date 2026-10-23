"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { hu } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useModalModositas } from "@/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Segédek: „YYYY-MM-DD” ↔ Date (helyi idő, időzóna-csúszás nélkül) ─────────

function datumbol(ertek: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ertek);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

function datumma(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const megjelenites = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" });

type DatePickerProps = {
  id?: string;
  /** „YYYY-MM-DD”, vagy üres string, ha nincs kiválasztva. Ugyanaz a formátum, mint a natív `type="date"` mezőé. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Üresen nem küldhető be az űrlap (a böngésző saját figyelmeztetésével). */
  required?: boolean;
  /** Törlés gomb a naptár alján (opcionális mezőknél). */
  clearable?: boolean;
  className?: string;
  /** „sm”: alacsonyabb (h-9) változat szűrősávokba. */
  size?: "default" | "sm";
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
};

function idoMost(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const megjelenitesIdovel = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Közös megvalósítás: egyetlen gomb, alatta lenyíló naptár. Időpontos módban
 * a naptár alján egy időmező is van, és dátumválasztás után nyitva marad.
 */
function DatumValaszto({
  id,
  value,
  onChange,
  placeholder = "Válassz dátumot",
  disabled,
  required,
  clearable = false,
  className,
  size = "default",
  idovel,
  ...aria
}: DatePickerProps & { idovel: boolean }) {
  const [nyitva, setNyitva] = React.useState(false);
  const jelolModositas = useModalModositas();
  const [datum = "", ido = ""] = value.split("T");
  const kivalasztott = datumbol(datum);

  function beallit(ertek: string, bezar: boolean) {
    jelolModositas?.();
    onChange(ertek);
    if (bezar) setNyitva(false);
  }

  /** Napválasztás: időpontos módban megtartja (vagy most-ra állítja) az időt. */
  function napot(d: string) {
    if (!idovel) return beallit(d, true);
    beallit(d ? `${d}T${ido.slice(0, 5) || idoMost()}` : "", !d);
  }

  const felirat = kivalasztott
    ? idovel
      ? megjelenitesIdovel.format(new Date(`${datum}T${ido.slice(0, 5) || "00:00"}`))
      : megjelenites.format(kivalasztott)
    : placeholder;

  return (
    <Popover open={nyitva} onOpenChange={setNyitva}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            className={cn(
              "w-full justify-start px-3 font-normal aria-invalid:border-destructive",
              !kivalasztott && "text-muted-foreground"
            )}
            {...aria}
          >
            <CalendarIcon className="text-muted-foreground" />
            <span className="truncate">{felirat}</span>
          </Button>
        </PopoverTrigger>
        {/* Rejtett mező, hogy a `required` a natív űrlap-ellenőrzéssel is működjön. */}
        {required && (
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={value}
            onChange={() => {}}
            className="pointer-events-none absolute inset-0 -z-10 opacity-0"
          />
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={hu}
          selected={kivalasztott}
          defaultMonth={kivalasztott}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
          onSelect={(d) => d && napot(datumma(d))}
          autoFocus
        />
        {idovel && (
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <label htmlFor={id ? `${id}-ido` : undefined} className="text-sm text-muted-foreground">
              Időpont
            </label>
            <Input
              id={id ? `${id}-ido` : undefined}
              type="time"
              value={ido.slice(0, 5)}
              onChange={(e) => datum && beallit(`${datum}T${e.target.value || "00:00"}`, false)}
              disabled={!datum}
              className="ml-auto h-8 w-28"
            />
          </div>
        )}
        <div className="flex gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => beallit(idovel ? `${datumma(new Date())}T${idoMost()}` : datumma(new Date()), true)}
          >
            {idovel ? "Most" : "Ma"}
          </Button>
          {clearable && value && (
            <Button type="button" variant="ghost" size="sm" className="flex-1 text-muted-foreground" onClick={() => beallit("", true)}>
              <X />
              Törlés
            </Button>
          )}
          {idovel && (
            <Button type="button" size="sm" className="flex-1" onClick={() => setNyitva(false)}>
              Kész
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Magyar nyelvű dátumválasztó (shadcn Calendar + Popover) a böngésző natív
 * dátummezője helyett, ami minden böngészőben és telefonon máshogy néz ki.
 * Hétfővel kezdődő hét, „Ma” gyorsgomb, billentyűzettel is kezelhető.
 * Értéke „YYYY-MM-DD” — ugyanaz, mint a natív `type="date"` mezőé.
 */
function DatePicker(props: DatePickerProps) {
  return <DatumValaszto {...props} idovel={false} />;
}

/**
 * Dátum + időpont egy gombban; a naptár alján időmező és „Most” gomb.
 * Értéke „YYYY-MM-DDTHH:mm” — ugyanaz, mint a natív `datetime-local` mezőé.
 */
function DateTimePicker(props: DatePickerProps) {
  return <DatumValaszto placeholder="Válassz időpontot" {...props} idovel />;
}

export { DatePicker, DateTimePicker };
