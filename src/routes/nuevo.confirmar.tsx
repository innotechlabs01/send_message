import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Pencil, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { wizard, useWizard, getCategory } from "@/lib/wizard-store";
import { formatPhone } from "@/lib/phone";
import { DateField, MessageInput, messageDetailsSchema } from "@/components/MessageFormFields";
import { StepHeader } from "@/components/StepHeader";
import { StepShell, StepFooter } from "@/components/StepShell";

export { formatPhone };

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
  const [leaving, setLeaving] = useState(false);

  if (!state.hydrated || leaving) return <StepShell withFooter />;
  if (!category || !d.message) return <Navigate to="/nuevo/categoria" />;

  function field(name: keyof typeof d, value: string) {
    wizard.setDraft({ [name]: value });
  }

  function validate(): boolean {
    const r = messageDetailsSchema.safeParse({
      recipient: d.recipient,
      sender: d.sender,
      phoneFrom: d.phoneFrom,
      phoneTo: d.phoneTo,
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
    setLeaving(true);
    const added = wizard.addItemFromDraft();
    if (!added) {
      setLeaving(false);
      toast.error("Datos incompletos");
      return;
    }
    navigate({ to: "/nuevo/carrito", search: {} });
  }

  function saveAndAddAnother() {
    if (!validate()) return;
    setLeaving(true);
    const added = wizard.addItemFromDraft();
    if (!added) {
      setLeaving(false);
      toast.error("Datos incompletos");
      return;
    }
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
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                {category.label}
              </div>
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
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Datos
            </div>
            <h3 className="font-display text-lg font-semibold">Datos de envío</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <MessageInput
              label="Para"
              placeholder="Nombre del destinatario"
              value={d.recipient}
              onChange={(v) => field("recipient", v)}
              error={errors.recipient}
            />
            <MessageInput
              label="De"
              placeholder="Tu nombre"
              value={d.sender}
              onChange={(v) => field("sender", v)}
              error={errors.sender}
            />
            <MessageInput
              label="Celular del remitente"
              placeholder="300-000-00-00"
              value={d.phoneFrom}
              onChange={(v) => field("phoneFrom", formatPhone(v))}
              error={errors.phoneFrom}
              phone
            />
            <MessageInput
              label="Celular del destinatario"
              placeholder="300-000-00-00"
              value={d.phoneTo}
              onChange={(v) => field("phoneTo", formatPhone(v))}
              error={errors.phoneTo}
              phone
            />
            <div className="sm:col-span-2">
              <DateField
                value={d.sendDate}
                onChange={(iso) => field("sendDate", iso)}
                error={errors.sendDate}
              />
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
