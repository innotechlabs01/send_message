import { useState } from "react";
import { CalendarDays, Pin, PinOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { cleanPhoneDigits } from "@/lib/phone";

export function getStartOfToday(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const bogotaDateStr = formatter.format(new Date()); // YYYY-MM-DD
  const [year, month, day] = bogotaDateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export const messageDetailsSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(1, "El destinatario es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  sender: z.string().trim().min(1, "Indica quién lo envía").max(80, "Máximo 80 caracteres"),
  phoneFrom: z
    .string()
    .trim()
    .refine(
      (v) => /^3\d{9}$/.test(cleanPhoneDigits(v)),
      "Celular debe tener 10 dígitos y comenzar por 3 (ej: 300 123 4567)",
    ),
  phoneTo: z
    .string()
    .trim()
    .refine(
      (v) => /^3\d{9}$/.test(cleanPhoneDigits(v)),
      "Celular debe tener 10 dígitos y comenzar por 3 (ej: 300 123 4567)",
    ),
  sendDate: z
    .string({ required_error: "Selecciona una fecha" })
    .min(1, "Selecciona una fecha")
    .refine((s) => {
      const d = new Date(s + "T00:00:00");
      return !isNaN(d.getTime()) && d.getTime() >= getStartOfToday().getTime();
    }, "La fecha debe ser hoy o posterior"),
});

export type MessageDetailsValues = z.infer<typeof messageDetailsSchema>;

export interface MessageInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  phone?: boolean;
  compact?: boolean;
  hint?: string;
}

export function MessageInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  phone,
  compact = false,
  hint,
}: MessageInputProps) {
  const filled = value.trim().length > 0 && !error;
  return (
    <label className="block">
      <span
        className={cn(
          "uppercase tracking-widest text-muted-foreground",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        {label}
      </span>
      <input
        type={phone ? "tel" : "text"}
        maxLength={phone ? 20 : 80}
        aria-invalid={Boolean(error)}
        value={value}
        inputMode={phone ? "numeric" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-input/60 border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors",
          compact ? "mt-1.5 px-3 py-2.5 text-sm" : "mt-2 px-4 py-3",
          error ? "border-destructive" : filled ? "input-filled" : "border-border",
        )}
      />
      {hint && !error && (
        <span
          className={cn(
            "text-muted-foreground block",
            compact ? "text-[11px] mt-1" : "text-xs mt-1.5",
          )}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          className={cn("text-destructive block", compact ? "text-[11px] mt-1" : "text-xs mt-1.5")}
        >
          {error}
        </span>
      )}
    </label>
  );
}

export interface DateFieldProps {
  value: string | null;
  onChange: (iso: string) => void;
  error?: string;
  compact?: boolean;
}

export function DateField({ value, onChange, error, compact = false }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const min = getStartOfToday();

  return (
    <div className="block">
      <span
        className={cn(
          "uppercase tracking-widest text-muted-foreground",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        Fecha de envío
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-invalid={Boolean(error)}
            className={cn(
              "w-full bg-input/60 border rounded-xl text-left flex items-center justify-between gap-3 cursor-pointer transition-colors focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
              compact ? "mt-1.5 px-3 py-2.5 text-sm" : "mt-2 px-4 py-3",
              error ? "border-destructive" : selected ? "input-filled" : "border-border",
              !selected && "text-muted-foreground/70",
            )}
          >
            <span className="truncate">
              {selected
                ? format(selected, "EEEE d 'de' MMMM, yyyy", { locale: es })
                : "Selecciona una fecha"}
            </span>
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto p-0 rounded-2xl border-border/70 shadow-[var(--shadow-card)] bg-popover"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(dd) => {
              if (!dd) return;
              const iso = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setOpen(false);
            }}
            disabled={{ before: min }}
            locale={es}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {error && (
        <span
          className={cn("text-destructive block", compact ? "text-[11px] mt-1" : "text-xs mt-1.5")}
        >
          {error}
        </span>
      )}
    </div>
  );
}

export interface MessageOptionCardProps {
  message: string;
  pinned?: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  index?: number;
  compact?: boolean;
  delay?: number;
}

export function MessageOptionCard({
  message,
  pinned = false,
  onSelect,
  onTogglePin,
  index,
  compact = false,
  delay = 0,
}: MessageOptionCardProps) {
  return (
    <div
      className={cn(
        "flex items-start transition-colors",
        compact
          ? "bg-secondary/50 border border-border/50 rounded-xl p-3 gap-3 hover:border-primary/40"
          : "glass step-card rounded-2xl p-5 gap-4 animate-rise group",
      )}
      style={!compact && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex-1 flex items-start -m-2 p-2 rounded-xl text-left leading-relaxed cursor-pointer",
          compact ? "gap-3 text-sm" : "gap-4 text-foreground/95",
        )}
      >
        {typeof index === "number" && (
          <span className="shrink-0 w-8 h-8 rounded-full icon-duotone grid place-items-center text-sm font-medium tabular-nums">
            {index}
          </span>
        )}
        <span className="flex-1 pt-0.5">{message}</span>
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={pinned}
        aria-label={pinned ? "Desanclar" : "Anclar"}
        className={cn(
          "relative before:content-[''] before:absolute before:-inset-1.5 shrink-0 rounded-full grid place-items-center border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
          compact ? "w-8 h-8" : "w-9 h-9",
          pinned
            ? "bg-primary text-primary-foreground border-transparent"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
        )}
      >
        {pinned ? (
          <PinOff className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        ) : (
          <Pin className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        )}
      </button>
    </div>
  );
}
