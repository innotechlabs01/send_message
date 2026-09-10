import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Pencil, CalendarDays, Sparkles, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { wizard, useWizard, getCategory } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell, StepFooter } from "@/components/StepShell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join("-");
}

const schema = z.object({
  recipient: z.string().trim().min(1, "El destinatario es obligatorio").max(80),
  sender: z.string().trim().min(1, "Indica quién lo envía").max(80),
  phoneFrom: z.string().trim().refine((v) => v.replace(/\D/g, "").length === 10, "Celular debe tener 10 dígitos"),
  phoneTo: z.string().trim().refine((v) => v.replace(/\D/g, "").length === 10, "Celular debe tener 10 dígitos"),
  sendDate: z.string({ required_error: "Selecciona una fecha" }).min(1, "Selecciona una fecha")
    .refine((s) => { const d = new Date(s + "T00:00:00"); return !isNaN(d.getTime()) && d.getTime() >= today().getTime(); }, "La fecha debe ser hoy o posterior"),
});

export const Route = createFileRoute("/nuevo/confirmar")({
  head: () => ({ meta: [{ title: "Confirma los detalles — ConSentido" }] }),
  component: ConfirmStep,
});

function ConfirmStep() {
  const navigate = useNavigate();
  const state = useWizard();
  const d = state.draft;
  const category = getCategory(d.categoryId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!state.hydrated) return <StepShell withFooter />;
  if (!category || !d.message) return <Navigate to="/nuevo/categoria" />;

  function field(name: keyof typeof d, value: string) {
    wizard.setDraft({ [name]: value });
  }

  function validate(): boolean {
    const r = schema.safeParse({
      recipient: d.recipient, sender: d.sender,
      phoneFrom: d.phoneFrom, phoneTo: d.phoneTo,
      sendDate: d.sendDate ?? "",
    });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => (e[i.path[0] as string] = i.message));
      setErrors(e);
      toast.error("Revisa los campos marcados");
      return false;
    }
    setErrors({});
    return true;
  }

  function saveAndCheckout() {
    if (!validate()) return;
    const added = wizard.addItemFromDraft();
    if (!added) { toast.error("Datos incompletos"); return; }
    navigate({ to: "/nuevo/carrito" });
  }

  function saveAndAddAnother() {
    if (!validate()) return;
    const added = wizard.addItemFromDraft();
    if (!added) { toast.error("Datos incompletos"); return; }
    toast.success("Mensaje guardado en el carrito");
    navigate({ to: "/nuevo/carrito", search: { nuevo: "1" } });
  }

  return (
    <StepShell withFooter>
      <StepHeader
        step={3}
        total={4}
        title="Confirma los detalles"
        subtitle="Revisa el mensaje y completa los datos del envío."
        backTo="/nuevo/mensaje"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Izquierda: preview de tarjeta */}
        <section className="glass rounded-3xl p-7 animate-rise h-fit">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{category.label}</div>
              <h3 className="font-display text-lg font-semibold">Vista previa</h3>
            </div>
            <button
              onClick={() => navigate({ to: "/nuevo/mensaje" })}
              className="text-sm inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Cambiar
            </button>
          </div>

          <div className="aspect-[4/3] bg-muted rounded-2xl border border-border/60 grid place-items-center mb-5 text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-xs">
              <ImageIcon className="w-6 h-6 opacity-60" />
              <span>Imagen de {category.label.toLowerCase()}</span>
            </div>
          </div>

          <p className="text-base leading-relaxed text-foreground/95">{d.message}</p>
        </section>

        {/* Derecha: formulario */}
        <section className="glass rounded-3xl p-7 animate-rise">
          <div className="mb-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Datos</div>
            <h3 className="font-display text-lg font-semibold">Datos de envío</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Para" placeholder="Nombre del destinatario" value={d.recipient} onChange={(v) => field("recipient", v)} error={errors.recipient} />
            <Input label="De" placeholder="Tu nombre" value={d.sender} onChange={(v) => field("sender", v)} error={errors.sender} />
            <Input label="Celular del remitente" placeholder="300-000-00-00" value={d.phoneFrom} onChange={(v) => field("phoneFrom", formatPhone(v))} error={errors.phoneFrom} phone />
            <Input label="Celular del destinatario" placeholder="300-000-00-00" value={d.phoneTo} onChange={(v) => field("phoneTo", formatPhone(v))} error={errors.phoneTo} phone />
            <div className="sm:col-span-2">
              <DateField value={d.sendDate} onChange={(iso) => field("sendDate", iso)} error={errors.sendDate} />
            </div>
          </div>
        </section>
      </div>

      <StepFooter>
        <button onClick={saveAndAddAnother} className="btn-base btn-secondary w-full sm:w-auto">
          <Sparkles className="w-4 h-4" />
          Guardar y crear otro
        </button>
        <button onClick={saveAndCheckout} className="group btn-base btn-primary w-full sm:w-auto">
          Ver carrito
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </StepFooter>
    </StepShell>
  );
}

function Input({
  label, value, onChange, placeholder, error, phone,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; phone?: boolean;
}) {
  const filled = value.trim().length > 0 && !error;
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode={phone ? "numeric" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-2 w-full bg-input/60 border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors ${
          error ? "border-destructive" : filled ? "input-filled" : "border-border"
        }`}
      />
      {error && <span className="text-xs text-destructive mt-1.5 block">{error}</span>}
    </label>
  );
}

function DateField({ value, onChange, error }: { value: string | null; onChange: (iso: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const min = today();

  return (
    <div className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">Fecha de envío</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "mt-2 w-full bg-input/60 border rounded-xl px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors focus:outline-none focus:border-primary",
              error ? "border-destructive" : selected ? "input-filled" : "border-border",
              !selected && "text-muted-foreground/70",
            )}
          >
            <span className="truncate">
              {selected ? format(selected, "EEEE d 'de' MMMM, yyyy", { locale: es }) : "Selecciona una fecha"}
            </span>
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto p-0 rounded-2xl border-border/70 shadow-[var(--shadow-card)] bg-popover">
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
      {error && <span className="text-xs text-destructive mt-1.5 block">{error}</span>}
    </div>
  );
}
