import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
import {
  Lock,
  CreditCard,
  Loader2,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useWizard, getCategory, PRICE_PER_MESSAGE, wizard } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell } from "@/components/StepShell";
import {
  buildCartSignature,
  checkExistingPayment,
  computeExpectedTotalCop,
  createPaymentIntent,
  generateIdempotencyKey,
  mapCartItemsForPayment,
  type ExistingPaymentSummary,
} from "@/lib/bold";

const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(1, "Ingresa tu nombre completo").max(120),
  email: z.string().trim().email("Ingresa un correo electrónico válido").max(254),
  phone: z.string().trim().max(32).optional(),
});

const PAYMENT_DRAFT_STORAGE_KEY = "sentido-payment-draft-v1";

interface PaymentDraft {
  cartSignature: string;
  idempotencyKey: string;
  referenceId: string;
}

function loadPaymentDraft(cartSignature: string): PaymentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PaymentDraft>;
    if (
      parsed.cartSignature === cartSignature &&
      typeof parsed.idempotencyKey === "string" &&
      typeof parsed.referenceId === "string"
    ) {
      return parsed as PaymentDraft;
    }
    return null;
  } catch {
    return null;
  }
}

function savePaymentDraft(draft: PaymentDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PAYMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage quota errors
  }
}

export const Route = createFileRoute("/nuevo/pago")({
  head: () => ({ meta: [{ title: "Pago — ConSentido" }] }),
  component: PaymentStep,
});

function PaymentStep() {
  const state = useWizard();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [existingPayment, setExistingPayment] = useState<ExistingPaymentSummary | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Check for existing payment on mount via server edge function (no direct anon table query / no PII leak)
  useEffect(() => {
    const checkExisting = async () => {
      if (!state.hydrated || state.items.length === 0) return;

      const mappedItems = mapCartItemsForPayment(state.items, "");
      const cartSignature = buildCartSignature(mappedItems);

      try {
        const payment = await checkExistingPayment(cartSignature);
        if (
          payment &&
          ["pending", "success", "failure", "gateway_blocked"].includes(payment.state)
        ) {
          setExistingPayment(payment);
        }
      } catch (e) {
        console.warn("Could not check existing payment:", e);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExisting();
  }, [state.hydrated, state.items]);

  if (!state.hydrated) return <StepShell />;
  if (state.items.length === 0) return <Navigate to="/nuevo/carrito" />;

  const total = computeExpectedTotalCop(state.items.length);

  // Validation helpers
  const customerValidation = checkoutCustomerSchema.safeParse({
    name,
    email,
    phone: phone.trim() || undefined,
  });
  const isFormValid = customerValidation.success;

  async function createIntent() {
    if (existingPayment?.state === "success") {
      toast.error("Este carrito ya fue pagado.");
      return;
    }

    const parsed = checkoutCustomerSchema.safeParse({
      name,
      email,
      phone: phone.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Completa nombre y correo válido");
      return;
    }

    setCreatingIntent(true);

    try {
      const baseSignature = buildCartSignature(mapCartItemsForPayment(state.items, ""));
      const existingDraft = loadPaymentDraft(baseSignature);
      const idempotencyKey = existingDraft?.idempotencyKey ?? generateIdempotencyKey();
      const referenceId =
        existingDraft?.referenceId ?? `MSG-${Date.now()}-${idempotencyKey.slice(0, 8)}`;

      savePaymentDraft({
        cartSignature: baseSignature,
        idempotencyKey,
        referenceId,
      });

      const callbackUrl = `${window.location.origin}/nuevo/confirmacion`;
      const items = mapCartItemsForPayment(state.items, parsed.data.name, parsed.data.phone ?? "");

      const intentResult = await createPaymentIntent({
        referenceId,
        idempotencyKey,
        amount: total,
        description: `ConSentido - ${state.items.length} mensaje(s)`,
        callbackUrl,
        items,
        customer: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
        },
      });

      if (intentResult.error) throw new Error(intentResult.error);

      const nextActions = intentResult.payload?.next_actions;
      if (nextActions?.redirect_url) {
        setRedirectUrl(nextActions.redirect_url);
        return;
      }

      toast.error("No se pudo obtener la URL de pago. Intenta nuevamente.");
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err instanceof Error ? err.message : "Error creando la orden de pago");
    } finally {
      setCreatingIntent(false);
    }
  }

  async function retryPayment() {
    if (!existingPayment) return;
    if (existingPayment.state === "success") {
      toast.error("Este carrito ya fue pagado.");
      return;
    }

    const parsed = checkoutCustomerSchema.safeParse({
      name,
      email,
      phone: phone.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Completa tu nombre y correo válido para reintentar",
      );
      setExistingPayment(null);
      return;
    }

    setRetrying(true);
    try {
      const baseSignature = buildCartSignature(mapCartItemsForPayment(state.items, ""));
      const existingDraft =
        existingPayment.state === "pending" ? loadPaymentDraft(baseSignature) : null;
      const idempotencyKey = existingDraft?.idempotencyKey ?? generateIdempotencyKey();
      const referenceId =
        existingDraft?.referenceId ?? `MSG-${Date.now()}-${idempotencyKey.slice(0, 8)}-retry`;

      savePaymentDraft({
        cartSignature: baseSignature,
        idempotencyKey,
        referenceId,
      });

      const callbackUrl = `${window.location.origin}/nuevo/confirmacion`;
      const items = mapCartItemsForPayment(state.items, parsed.data.name, parsed.data.phone ?? "");

      const intentResult = await createPaymentIntent({
        referenceId,
        idempotencyKey,
        amount: total,
        description: `ConSentido - ${state.items.length} mensaje(s) (reintento)`,
        callbackUrl,
        items,
        customer: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
        },
      });

      if (intentResult.error) throw new Error(intentResult.error);

      const nextActions = intentResult.payload?.next_actions;
      if (nextActions?.redirect_url) {
        setRedirectUrl(nextActions.redirect_url);
        setExistingPayment(null);
        return;
      }

      toast.error("No se pudo obtener la URL de pago. Intenta nuevamente.");
    } catch (err) {
      console.error("Retry error:", err);
      toast.error(err instanceof Error ? err.message : "Error en reintento");
    } finally {
      setRetrying(false);
    }
  }

  function goToBold() {
    if (redirectUrl) window.location.href = redirectUrl;
  }

  // Pre-compute render pieces to satisfy TanStack router generator
  const isAlreadyPaid = existingPayment?.state === "success";
  const isRetryable =
    existingPayment && ["pending", "failure", "gateway_blocked"].includes(existingPayment.state);
  const statusIcon =
    existingPayment?.state === "success" ? (
      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
    ) : existingPayment?.state === "pending" ? (
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    ) : existingPayment?.state === "failure" ? (
      <AlertCircle className="w-6 h-6 text-red-500" />
    ) : existingPayment?.state === "gateway_blocked" ? (
      <Shield className="w-6 h-6 text-amber-500" />
    ) : null;
  const statusTitle =
    existingPayment?.state === "success"
      ? "Este pedido ya fue pagado"
      : existingPayment?.state === "pending"
        ? "Pago pendiente de confirmación"
        : existingPayment?.state === "failure"
          ? "Pago fallido"
          : existingPayment?.state === "gateway_blocked"
            ? "Pago bloqueado por la pasarela"
            : "";

  // Button icon/text for create intent
  const createBtnIcon = creatingIntent ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <CreditCard className="w-4 h-4" />
  );
  const createBtnText = creatingIntent ? "Creando orden..." : "Pagar con Bold";

  // Button icon/text for retry
  const retryBtnIcon = retrying ? (
    <Loader2 className="w-4 h-4 animate-spin mr-2" />
  ) : (
    <RotateCcw className="w-4 h-4 mr-2" />
  );
  const retryBtnText = retrying ? "Reintentando..." : "Reintentar pago";

  // Single return with all conditional rendering
  return (
    <StepShell>
      {redirectUrl && (
        <>
          <div className="glass rounded-3xl p-10 text-center animate-rise max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">¡Orden creada!</h2>
            <p className="mt-3 text-muted-foreground">
              Te llevaremos a la pasarela segura de{" "}
              <span className="text-foreground font-medium">Bold</span> para completar el pago.
            </p>
            <div className="mt-6 p-4 glass rounded-2xl text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="font-semibold">${total.toLocaleString("es-CO")} COP</span>
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button onClick={() => setRedirectUrl(null)} className="btn-base btn-secondary">
                <ArrowRight className="w-4 h-4 mr-2" /> Volver
              </button>
              <button onClick={goToBold} className="btn-base btn-primary group">
                Continuar a Bold
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Serás redirigido a Bold Colombia para completar tu pago de forma segura.
            </p>
          </div>
        </>
      )}

      {existingPayment && !checkingExisting && !redirectUrl && (
        <>
          <StepHeader
            step={4}
            total={4}
            title="Pago previo detectado"
            subtitle="Encontramos un intento anterior para este envío"
            backTo="/nuevo/carrito"
          />
          <div className="glass rounded-3xl p-7 animate-rise max-w-2xl mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 mb-6">
              {statusIcon}
              <div>
                <p className="font-medium">{statusTitle}</p>
                <p className="text-sm text-muted-foreground">
                  Referencia: {existingPayment.reference_id} ·{" "}
                  {new Date(existingPayment.created_at).toLocaleString("es-CO")}
                </p>
                {existingPayment.gateway_reason && (
                  <p className="text-sm text-amber-700 mt-1">
                    Motivo: {existingPayment.gateway_reason}
                  </p>
                )}
              </div>
            </div>

            {isAlreadyPaid && existingPayment && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Ya registramos un pago aprobado para este carrito. No es necesario pagar de nuevo.
                </p>
                <div className="flex gap-3">
                  <Link
                    to="/nuevo/confirmacion"
                    search={{ payment_id: existingPayment.reference_id }}
                    className="flex-1 btn-base btn-primary text-center"
                  >
                    Ver confirmación
                  </Link>
                  <button
                    onClick={() => {
                      wizard.reset();
                      setExistingPayment(null);
                    }}
                    className="flex-1 btn-base btn-secondary"
                  >
                    Limpiar carrito
                  </button>
                </div>
              </div>
            )}

            {isRetryable && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  ¿Quieres reintentar con los mismos datos o modificarlos?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={retryPayment}
                    disabled={retrying || creatingIntent}
                    className="flex-1 btn-base btn-primary"
                  >
                    {retryBtnIcon} {retryBtnText}
                  </button>
                  <button
                    onClick={() => setExistingPayment(null)}
                    className="flex-1 btn-base btn-secondary"
                  >
                    Crear nuevo pago
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!redirectUrl && !(existingPayment && !checkingExisting) && (
        <>
          <StepHeader
            step={4}
            total={4}
            title="Datos de pago"
            subtitle="Completa tus datos básicos. Te llevaremos a la pasarela segura de Bold para finalizar."
            backTo="/nuevo/carrito"
          />

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6">
            <section className="glass rounded-3xl p-7 animate-rise">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Lock className="w-4 h-4 text-primary" />
                Conexión cifrada · Procesado por Bold Colombia
              </div>

              <div className="space-y-4 mb-6">
                <Input
                  label="Nombre completo"
                  placeholder="Como aparece en tu documento"
                  value={name}
                  onChange={setName}
                />
                <Input
                  label="Correo electrónico"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={setEmail}
                  type="email"
                />
                <Input
                  label="Teléfono"
                  placeholder="3001234567"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                />
              </div>

              <button
                onClick={createIntent}
                disabled={creatingIntent || !isFormValid}
                className="mt-4 w-full btn-base btn-primary"
              >
                {createBtnIcon} {createBtnText}
              </button>
              {!isFormValid && !creatingIntent && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Completa todos los campos para habilitar el botón
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Al continuar serás redirigido a Bold Colombia donde podrás elegir tu método de pago
                (tarjeta, PSE, Nequi, etc.) y pagar de forma segura.
              </p>
            </section>

            <aside className="glass rounded-3xl p-7 h-fit animate-rise">
              <h3 className="font-display text-lg font-semibold mb-4">
                Resumen ({state.items.length})
              </h3>
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {state.items.map((it) => {
                  const c = getCategory(it.categoryId);
                  if (!c) return null;
                  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[
                    c.icon
                  ];
                  return (
                    <div
                      key={it.id}
                      className={`cat-${c.accent} rounded-2xl border border-border/50 bg-secondary/40 p-3 flex gap-3`}
                    >
                      <span
                        data-cat
                        className="shrink-0 w-9 h-9 rounded-xl icon-duotone grid place-items-center"
                      >
                        {Icon ? <Icon className="w-4 h-4" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {c.label} · {it.recipient}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ${PRICE_PER_MESSAGE.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(it.sendDate + "T00:00:00"), "d MMM yyyy", {
                            locale: es,
                          })}
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
                  ${total.toLocaleString("es-CO")}{" "}
                  <span className="text-xs text-muted-foreground">COP</span>
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </StepShell>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
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
