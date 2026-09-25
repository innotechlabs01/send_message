import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { StepHeader } from "@/components/StepHeader";
import { StepFooter, StepShell } from "@/components/StepShell";
import { getPaymentStatus } from "@/lib/bold";
import {
  getPaymentStatusCopy,
  type PaymentState,
} from "@/lib/payment-status";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/nuevo/confirmacion")({
  validateSearch: z.object({
    payment_id: z.string().optional(),
  }),
  head: () => ({
    meta: [{ title: "Pago — ConSentido" }],
  }),
  component: PaymentConfirmation,
});

type Status = "checking" | PaymentState;

function PaymentConfirmation() {
  const { payment_id } = Route.useSearch();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!payment_id) {
      setStatus("failure");
      setError("Falta el ID del pago");
      return;
    }

    let cancelled = false;

    getPaymentStatus(payment_id)
      .then((result) => {
        if (cancelled) return;
        setStatus(result.state);
        if (result.error) setError(result.error);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus("failure");
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [payment_id]);

  const copy = getPaymentStatusCopy(status, error);
  const isPending = status === "checking" || status === "pending";

  return (
    <StepShell withFooter>
      <StepHeader
        step={4}
        total={4}
        title="Confirmación"
        subtitle="Verificando el estado de tu pago"
        backTo="/nuevo/pago"
        backLabel="Volver a intentar"
      />

      <main className="mt-8 flex justify-center">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            {isPending && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            )}
            {status === "failure" && !isPending && (
              <AlertCircle className="h-12 w-12 text-red-500" />
            )}

            <div>
              <h2 className="text-xl font-semibold">{copy.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.message}
              </p>
              {copy.errorCode && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Código: {copy.errorCode}
                </p>
              )}
            </div>

            {status === "failure" && !isPending && (
              <Link
                to="/nuevo/pago"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a intentar
              </Link>
            )}
          </div>
        </div>
      </main>

      <StepFooter />
    </StepShell>
  );
}