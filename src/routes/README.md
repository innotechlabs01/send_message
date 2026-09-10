import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Lock, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { wizard, useWizard, getCategory, PRICE_PER_MESSAGE } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell } from "@/components/StepShell";

export const Route = createFileRoute("/nuevo/pago")({
  head: () => ({ meta: [{ title: "Pago — ConSentido" }] }),
  component: PaymentStep,
});

function PaymentStep() {
  const navigate = useNavigate();
  const state = useWizard();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!state.hydrated) return <StepShell />;
  if (state.items.length === 0) return <Navigate to="/nuevo/carrito" />;

  const total = state.items.length * PRICE_PER_MESSAGE;

  function pay() {
    if (!email.includes("@") || !name.trim()) {
      toast.error("Completa nombre y correo válido");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast.success("Te redirigiríamos a la pasarela de pagos");
    }, 1100);
  }

  if (done) {
    return (
      <StepShell>
        <div className="glass rounded-3xl p-10 text-center animate-rise max-w-2xl mx-auto">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5 animate-float" />
          <h2 className="text-3xl font-semibold tracking-tight">¡Casi listo!</h2>
          <p className="mt-3 text-muted-foreground">
            Aquí te redirigiríamos a la plataforma de pagos para finalizar el envío de{" "}
            <span className="text-foreground font-medium">{state.items.length} mensaje{state.items.length > 1 ? "s" : ""}</span>.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => { wizard.reset(); navigate({ to: "/" }); }} className="btn-base btn-secondary">
              Volver al inicio
            </button>
            <button onClick={() => { wizard.reset(); navigate({ to: "/nuevo/categoria" }); }} className="btn-base btn-primary">
              Crear otro mensaje
            </button>
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell>
      <StepHeader
        step={4}
        total={4}
        title="Datos de pago"
        subtitle="Completa tus datos básicos. Te llevaremos a la pasarela segura para finalizar."
        backTo="/nuevo/carrito"
      />

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-6">
        <section className="glass rounded-3xl p-7 animate-rise">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Lock className="w-4 h-4 text-primary" />
            Conexión cifrada · Procesado por pasarela externa
          </div>
          <div className="space-y-4">
            <Input label="Nombre completo" placeholder="Como aparece en tu documento" value={name} onChange={setName} />
            <Input label="Correo electrónico" placeholder="tucorreo@ejemplo.com" value={email} onChange={setEmail} type="email" />
          </div>
          <button onClick={pay} disabled={submitting} className="mt-8 w-full btn-base btn-primary">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Ir a la pasarela de pago
          </button>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Al continuar aceptas los términos. Podrás revisar tu pedido antes de pagar.
          </p>
        </section>

        <aside className="glass rounded-3xl p-7 h-fit animate-rise">
          <h3 className="font-display text-lg font-semibold mb-4">Resumen ({state.items.length})</h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {state.items.map((it) => {
              const c = getCategory(it.categoryId);
              if (!c) return null;
              const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[c.icon];
              return (
                <div key={it.id} className={`cat-${c.accent} rounded-2xl border border-border/50 bg-secondary/40 p-3 flex gap-3`}>
                  <span data-cat className="shrink-0 w-9 h-9 rounded-xl icon-duotone grid place-items-center">
                    {Icon ? <Icon className="w-4 h-4" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{c.label} · {it.recipient}</span>
                      <span className="text-xs text-muted-foreground">${PRICE_PER_MESSAGE.toLocaleString("es-CO")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(it.sendDate + "T00:00:00"), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="my-5 border-t border-border/50" />
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="font-display text-2xl font-semibold">
              ${total.toLocaleString("es-CO")} <span className="text-xs text-muted-foreground">COP</span>
            </span>
          </div>
        </aside>
      </div>
    </StepShell>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
      />
    </label>
  );
}
