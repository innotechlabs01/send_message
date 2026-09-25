import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { Lock, CreditCard, Loader2, CheckCircle2, Building2, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { wizard, useWizard, getCategory, PRICE_PER_MESSAGE } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell } from "@/components/StepShell";
import { createPaymentIntent, getPseBanks, type BoldPaymentMethod, type BoldPayer } from "@/lib/bold";

export const Route = createFileRoute("/nuevo/pago")({
  head: () => ({ meta: [{ title: "Pago — ConSentido" }] }),
  component: PaymentStep,
});

function PaymentStep() {
  const navigate = useNavigate();
  const state = useWizard();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pse">("card");
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [pseBanks, setPseBanks] = useState<Array<{ bank_code: string; bank_name: string }>>([]);
  const [selectedBank, setSelectedBank] = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  useEffect(() => {
    if (paymentMethod === "pse" && pseBanks.length === 0) {
      getPseBanks()
        .then((res) => setPseBanks(res.payload?.banks || []))
        .catch(() => toast.error("Error cargando bancos"));
    }
  }, [paymentMethod, pseBanks.length]);

  if (!state.hydrated) return <StepShell />;
  if (state.items.length === 0) return <Navigate to="/nuevo/carrito" />;

  const total = state.items.length * PRICE_PER_MESSAGE;

  // Validation helpers
  const isPersonalInfoValid = email.includes("@") && name.trim().length > 0;
  const isCardValid = cardNumber.trim().length >= 15 && cardName.trim().length > 0 && cardExpiry.trim().length === 5 && cardCvc.trim().length >= 3;
  const isPseValid = selectedBank.length > 0;
  const isFormValid = isPersonalInfoValid && (paymentMethod === "card" ? isCardValid : isPseValid);

  async function createIntent() {
    if (!isFormValid) {
      if (!email.includes("@") || !name.trim()) {
        toast.error("Completa nombre y correo válido");
      } else if (paymentMethod === "card" && !isCardValid) {
        toast.error("Completa los datos de la tarjeta");
      } else if (paymentMethod === "pse" && !isPseValid) {
        toast.error("Selecciona un banco");
      }
      return;
    }

    setCreatingIntent(true);

    try {
      const referenceId = `MSG-${Date.now()}`;
      const callbackUrl = `${window.location.origin}/nuevo/confirmacion`;

      // Get first item from cart for message details
      const firstItem = state.items[0];

      // Create payment intent with message data
      const intentResult = await createPaymentIntent({
        referenceId,
        amount: total,
        description: `ConSentido - ${state.items.length} mensaje(s)`,
        callbackUrl,
        categoryId: firstItem.categoryId,
        messageText: firstItem.message,
        recipientName: firstItem.recipient,
        recipientPhone: firstItem.phoneTo,
        senderName: firstItem.sender || name,
        senderPhone: firstItem.phoneFrom || phone,
        sendDate: firstItem.sendDate,
        customer: { name, email, phone },
      });

      if (intentResult.error) {
        throw new Error(intentResult.error);
      }

      // Check if Bold provides a redirect URL (checkout page)
      const nextActions = intentResult.payload?.next_actions;
      if (nextActions?.redirect_url) {
        setRedirectUrl(nextActions.redirect_url);
        return;
      }

      // Fallback: if no redirect, try processPayment (legacy flow)
      const payer: BoldPayer = {
        personType: "NATURAL_PERSON",
        name,
        phone: phone || "0000000000",
        email,
        documentType: "CEDULA",
        documentNumber: "0000000000",
      };

      let paymentMethodData: BoldPaymentMethod;

      if (paymentMethod === "card") {
        const [month, year] = cardExpiry.split("/");
        paymentMethodData = {
          name: "CREDIT_CARD",
          cardNumber: cardNumber.replace(/\s/g, ""),
          cardholderName: cardName,
          expirationMonth: month,
          expirationYear: `20${year}`,
          cvc: cardCvc,
          installments: 1,
        };
      } else {
        paymentMethodData = {
          name: "PSE",
          bankCode: selectedBank,
          bankName: pseBanks.find((b) => b.bank_code === selectedBank)?.bank_name || "",
        };
      }

      const { processPayment } = await import("@/lib/bold");
      const paymentResult = await processPayment({
        referenceId,
        payer,
        paymentMethod: paymentMethodData,
      });

      if (paymentResult.error) {
        throw new Error(paymentResult.error);
      }

      if (paymentResult.payload?.next_actions?.redirect_url) {
        setRedirectUrl(paymentResult.payload.next_actions.redirect_url);
        return;
      }

      // Payment completed without redirect
      toast.success("¡Pago procesado exitosamente!");
      navigate({ to: "/nuevo/confirmacion", search: { payment_id: referenceId } });
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err instanceof Error ? err.message : "Error creando la orden de pago");
    } finally {
      setCreatingIntent(false);
    }
  }

  function goToBold() {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  // If we have a redirect URL, show confirmation screen
  if (redirectUrl) {
    return (
      <StepShell>
        <div className="glass rounded-3xl p-10 text-center animate-rise max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-pulse">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">¡Orden creada!</h2>
          <p className="mt-3 text-muted-foreground">
            Te llevaremos a la pasarela segura de <span className="text-foreground font-medium">Bold</span> para completar el pago.
          </p>
          <div className="mt-6 p-4 glass rounded-2xl text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a pagar</span>
              <span className="font-semibold">${total.toLocaleString("es-CO")} COP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Método</span>
              <span className="font-medium capitalize">{paymentMethod === "card" ? "Tarjeta" : "PSE"}</span>
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
            Conexión cifrada · Procesado por Bold Colombia
          </div>

          {/* Personal Info */}
          <div className="space-y-4 mb-6">
            <Input label="Nombre completo" placeholder="Como aparece en tu documento" value={name} onChange={setName} />
            <Input label="Correo electrónico" placeholder="tucorreo@ejemplo.com" value={email} onChange={setEmail} type="email" />
            <Input label="Teléfono" placeholder="3001234567" value={phone} onChange={setPhone} type="tel" />
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Método de pago</span>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Tarjeta
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("pse")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors ${
                  paymentMethod === "pse"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Building2 className="w-4 h-4" />
                PSE
              </button>
            </div>
          </div>

          {/* Card Fields */}
          {paymentMethod === "card" && (
            <div className="space-y-4 mb-6">
              <Input label="Número de tarjeta" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={setCardNumber} />
              <Input label="Nombre en la tarjeta" placeholder="Como aparece en la tarjeta" value={cardName} onChange={setCardName} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Vencimiento" placeholder="MM/AA" value={cardExpiry} onChange={setCardExpiry} />
                <Input label="CVC" placeholder="123" value={cardCvc} onChange={setCardCvc} />
              </div>
            </div>
          )}

          {/* PSE Bank Selection */}
          {paymentMethod === "pse" && (
            <div className="mb-6">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Banco</span>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">Selecciona tu banco</option>
                  {pseBanks.map((bank) => (
                    <option key={bank.bank_code} value={bank.bank_code}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <button onClick={createIntent} disabled={creatingIntent || !isFormValid} className="mt-4 w-full btn-base btn-primary">
            {creatingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {creatingIntent ? "Creando orden..." : "Crear orden y continuar a Bold"}
          </button>
          {!isFormValid && !creatingIntent && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Completa todos los campos para habilitar el botón
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Al continuar serás redirigido a Bold Colombia para pagar de forma segura.
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
