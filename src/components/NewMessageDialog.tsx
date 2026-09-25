import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import { ArrowLeft, ArrowRight, CalendarDays, Image as ImageIcon, Loader2, Pin, PinOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, getCategory, wizard, type CartItem } from "@/lib/wizard-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const MAX_PINNED = 2;
const TOTAL_SLOTS = 5;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join("-");
}

const dataSchema = z.object({
  recipient: z.string().trim().min(1, "Obligatorio").max(80),
  sender: z.string().trim().min(1, "Obligatorio").max(80),
  phoneFrom: z.string().trim().refine((v) => v.replace(/\D/g, "").length === 10, "10 dígitos"),
  phoneTo: z.string().trim().refine((v) => v.replace(/\D/g, "").length === 10, "10 dígitos"),
  sendDate: z.string().min(1, "Selecciona fecha")
    .refine((s) => { const dd = new Date(s + "T00:00:00"); return !isNaN(dd.getTime()) && dd.getTime() >= today().getTime(); }, "Debe ser hoy o posterior"),
});

type Form = {
  categoryId: string | null;
  message: string | null;
  recipient: string;
  sender: string;
  phoneFrom: string;
  phoneTo: string;
  sendDate: string | null;
};

const emptyForm: Form = {
  categoryId: null, message: null,
  recipient: "", sender: "", phoneFrom: "", phoneTo: "", sendDate: null,
};

export function NewMessageDialog({
  open, onOpenChange, editingItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingItem?: CartItem | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Form>(emptyForm);
  const [messages, setMessages] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset / seed when opening
  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      setForm({ ...editingItem });
      setStep(3);
    } else {
      setForm(emptyForm);
      setStep(1);
    }
    setMessages([]);
    setPinned([]);
    setSeed(0);
    setErrors({});
  }, [open, editingItem]);

  const category = getCategory(form.categoryId);

  async function loadMessages(nextSeed: number) {
    if (!category) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-message", {
        body: { category: category.label, seed: nextSeed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(data?.messages ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No fue posible generar mensajes");
    } finally {
      setLoading(false);
    }
  }

  function goStep2(catId: string) {
    setForm((f) => ({ ...f, categoryId: catId, message: f.categoryId === catId ? f.message : null }));
    setStep(2);
    setMessages([]);
    setPinned([]);
    setSeed(0);
    // Trigger load on step 2 after state updates
    setTimeout(() => {
      const cat = getCategory(catId);
      if (!cat) return;
      setLoading(true);
      supabase.functions.invoke("generate-message", { body: { category: cat.label, seed: 0 } })
        .then(({ data, error }) => {
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          setMessages(data?.messages ?? []);
        })
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Error"))
        .finally(() => setLoading(false));
    }, 0);
  }

  function pickMessage(m: string) {
    setForm((f) => ({ ...f, message: m }));
    setStep(3);
  }

  function togglePin(m: string) {
    setPinned((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= MAX_PINNED) { toast.error(`Máx ${MAX_PINNED} anclados`); return prev; }
      return [...prev, m];
    });
  }

  function refresh() {
    const next = seed + 1; setSeed(next); loadMessages(next);
  }

  function submit() {
    const r = dataSchema.safeParse({
      recipient: form.recipient, sender: form.sender,
      phoneFrom: form.phoneFrom, phoneTo: form.phoneTo,
      sendDate: form.sendDate ?? "",
    });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => (e[i.path[0] as string] = i.message));
      setErrors(e);
      toast.error("Revisa los campos");
      return;
    }
    if (!form.categoryId || !form.message || !form.sendDate) return;

    if (editingItem) {
      wizard.updateItem(editingItem.id, {
        categoryId: form.categoryId,
        message: form.message,
        recipient: form.recipient,
        sender: form.sender,
        phoneFrom: form.phoneFrom,
        phoneTo: form.phoneTo,
        sendDate: form.sendDate,
      });
      toast.success("Mensaje actualizado");
    } else {
      wizard.addItem({
        categoryId: form.categoryId,
        message: form.message,
        recipient: form.recipient,
        sender: form.sender,
        phoneFrom: form.phoneFrom,
        phoneTo: form.phoneTo,
        sendDate: form.sendDate,
      });
      toast.success("Mensaje agregado al carrito");
    }
    onOpenChange(false);
  }

  const fresh = messages.filter((m) => !pinned.includes(m)).slice(0, TOTAL_SLOTS - pinned.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-2xl w-[calc(100%-1.5rem)]">
        <div className="bg-card rounded-[28px] overflow-hidden border border-border/60 shadow-2xl flex flex-col max-h-[88vh]">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="font-display text-xl tracking-tight">
              {editingItem ? "Editar mensaje" : "Nuevo mensaje"}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Paso {step} de 3 · {step === 1 ? "Elige la ocasión" : step === 2 ? "Elige el mensaje" : "Completa los datos"}
            </DialogDescription>
            <div className="h-[2px] w-full bg-muted rounded-full overflow-hidden mt-3">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%`, background: "var(--gradient-primary)" }} />
            </div>
          </DialogHeader>

          <div className="px-6 pb-3 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
                {CATEGORIES.map((cat) => {
                  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[cat.icon];
                  const selected = form.categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => goStep2(cat.id)}
                      className={`cat-${cat.accent} glass step-card rounded-2xl p-4 text-left group ${selected ? "!border-primary/40" : ""}`}
                    >
                      <div data-cat className="w-10 h-10 rounded-xl icon-duotone grid place-items-center mb-3 transition-transform group-hover:scale-110">
                        {Icon ? <Icon className="w-5 h-5" /> : null}
                      </div>
                      <h4 className="text-sm font-semibold">{cat.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2 py-1">
                {pinned.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      <Pin className="w-3.5 h-3.5" /> Anclados ({pinned.length}/{MAX_PINNED})
                    </div>
                    {pinned.map((m, i) => (
                      <MiniMsg key={`p-${i}`} message={m} pinned onSelect={() => pickMessage(m)} onTogglePin={() => togglePin(m)} />
                    ))}
                    <div className="border-t border-border/60 my-3" />
                  </>
                )}
                {loading && fresh.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="bg-secondary/50 rounded-xl h-16 relative overflow-hidden">
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    ))
                  : fresh.map((m, i) => (
                      <MiniMsg key={`${seed}-${i}`} message={m} onSelect={() => pickMessage(m)} onTogglePin={() => togglePin(m)} />
                    ))}
              </div>
            )}

            {step === 3 && category && form.message && (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl bg-secondary/50 border border-border/50 p-4">
                  <div className="aspect-[16/9] bg-muted rounded-xl border border-border/60 grid place-items-center mb-3 text-muted-foreground">
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <ImageIcon className="w-5 h-5 opacity-60" />
                      <span>Imagen de {category.label.toLowerCase()}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{form.message}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MiniInput label="Para" value={form.recipient} onChange={(v) => setForm((f) => ({ ...f, recipient: v }))} error={errors.recipient} placeholder="Destinatario" />
                  <MiniInput label="De" value={form.sender} onChange={(v) => setForm((f) => ({ ...f, sender: v }))} error={errors.sender} placeholder="Tu nombre" />
                  <MiniInput label="Cel. remitente" value={form.phoneFrom} onChange={(v) => setForm((f) => ({ ...f, phoneFrom: formatPhone(v) }))} error={errors.phoneFrom} placeholder="300-000-00-00" phone />
                  <MiniInput label="Cel. destinatario" value={form.phoneTo} onChange={(v) => setForm((f) => ({ ...f, phoneTo: formatPhone(v) }))} error={errors.phoneTo} placeholder="300-000-00-00" phone />
                  <div className="sm:col-span-2">
                    <MiniDate value={form.sendDate} onChange={(iso) => setForm((f) => ({ ...f, sendDate: iso }))} error={errors.sendDate} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border/60 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <button
              onClick={() => {
                if (step === 1) onOpenChange(false);
                else setStep((s) => (s === 3 ? 2 : 1));
              }}
              className="btn-base btn-secondary w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Cancelar" : "Atrás"}
            </button>

            {step === 2 && (
              <button onClick={refresh} disabled={loading} className="btn-base btn-secondary w-full sm:w-auto">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refrescar
              </button>
            )}

            {step === 3 && (
              <button onClick={submit} className="group btn-base btn-primary w-full sm:w-auto">
                {editingItem ? "Guardar cambios" : "Agregar al carrito"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniMsg({ message, pinned = false, onSelect, onTogglePin }: { message: string; pinned?: boolean; onSelect: () => void; onTogglePin: () => void }) {
  return (
    <div className="bg-secondary/50 border border-border/50 rounded-xl p-3 flex items-start gap-3 hover:border-primary/40 transition-colors">
      <button onClick={onSelect} className="flex-1 text-left text-sm leading-relaxed">{message}</button>
      <button
        onClick={onTogglePin}
        aria-label={pinned ? "Desanclar" : "Anclar"}
        className={`shrink-0 w-8 h-8 rounded-full grid place-items-center border transition-colors ${
          pinned ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground border-border hover:text-foreground"
        }`}
      >
        {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function MiniInput({ label, value, onChange, placeholder, error, phone }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; phone?: boolean }) {
  const filled = value.trim().length > 0 && !error;
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode={phone ? "numeric" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1.5 w-full bg-input/60 border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors ${
          error ? "border-destructive" : filled ? "input-filled" : "border-border"
        }`}
      />
      {error && <span className="text-[11px] text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

function MiniDate({ value, onChange, error }: { value: string | null; onChange: (iso: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const min = today();
  return (
    <div className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Fecha de envío</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "mt-1.5 w-full bg-input/60 border rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between gap-3 transition-colors focus:outline-none focus:border-primary",
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
      {error && <span className="text-[11px] text-destructive mt-1 block">{error}</span>}
    </div>
  );
}
