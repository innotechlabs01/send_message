import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";

import { StepHeader } from "@/components/StepHeader";
import { StepFooter, StepShell } from "@/components/StepShell";
import { getPaymentStatus } from "@/lib/bold";
import {
  getPaymentStatusCopy,
  type PaymentState,
  type PaymentRecord,
} from "@/lib/payment-status";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [gatewayReason, setGatewayReason] = useState<string>();
  const [gatewayRaw, setGatewayRaw] = useState<Record<string, unknown>>();
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [persisted, setPersisted] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const maxPolls = 40; // ~2 minutes at 3s interval

  const persistPayment = useCallback(async (record: PaymentRecord) => {
    try {
      await supabase.from("payments").upsert(record, {
        onConflict: "reference_id",
      });
      setPersisted(true);
    } catch (e) {
      console.error("Failed to persist payment:", e);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!payment_id || !isMountedRef.current) return;

    try {
      pollCountRef.current += 1;
      const result = await getPaymentStatus(payment_id);

      if (!isMountedRef.current) return;

      const boldStatus = result?.status || result?.state || "UNKNOWN";
      const gwReason = result?.reason || result?.decline_reason || result?.error_message;
      const gwRaw = result as Record<string, unknown>;

      setGatewayRaw(gwRaw);
      if (gwReason) setGatewayReason(gwReason);
      setLastPolled(new Date());

      const copy = getPaymentStatusCopy(boldStatus, undefined, gwReason);
      setStatus(copy.state);
      if (copy.errorCode) setError(copy.errorCode);

      // Persist to DB
      await persistPayment({
        referenceId: payment_id,
        state: copy.state,
        boldStatus,
        amount: result?.amount || 0,
        gatewayReason: gwReason,
        gatewayRaw: gwRaw,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Stop polling on terminal states
      const isTerminal = copy.state === "success" || copy.state === "failure" || copy.state === "gateway_blocked";
      if (isTerminal || pollCountRef.current >= maxPolls) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Error verificando pago";
      setStatus("failure");
      setError(msg);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [payment_id, persistPayment]);

  useEffect(() => {
    if (!payment_id) {
      setStatus("failure");
      setError("Falta el ID del pago");
      return;
    }

    isMountedRef.current = true;
    pollCountRef.current = 0;

    // Initial check
    checkStatus();

    // Poll every 3 seconds while pending
    intervalRef.current = window.setInterval(() => {
      if (status === "pending" || status === "checking") {
        checkStatus();
      }
    }, 3000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [payment_id, checkStatus, status]);

  const copy = getPaymentStatusCopy(status, error, gatewayReason);
  const isPending = status === "checking" || status === "pending";
  const isGatewayBlocked = status === "gateway_blocked";

  return (
    <StepShell withFooter>
      <StepHeader
        step={4}
        total={4}
        title="Confirmación"
        subtitle={isPending ? "Verificando el estado de tu pago" : "Estado del pago"}
        backTo="/nuevo/pago"
        backLabel="Volver a pagar"
      />

      <main className="mt-8 flex justify-center">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            {isPending && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
            {status === "failure" && !isPending && !isGatewayBlocked && (
              <AlertCircle className="h-12 w-12 text-red-500" />
            )}
            {isGatewayBlocked && <ShieldAlert className="h-12 w-12 text-amber-500" />}

            <div>
              <h2 className="text-xl font-semibold">{copy.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy.message}</p>
              {copy.errorCode && (
                <p className="mt-2 text-xs text-muted-foreground">Código: {copy.errorCode}</p>
              )}
              {isGatewayBlocked && gatewayReason && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left w-full max-w-md">
                  <p className="text-xs font-medium text-amber-800">Motivo del bloqueo:</p>
                  <p className="mt-1 text-sm text-amber-700 font-mono">{gatewayReason}</p>
                  {gatewayRaw && Object.keys(gatewayRaw).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-amber-600 cursor-pointer">Ver detalles técnicos</summary>
                      <pre className="mt-2 text-xs bg-amber-100 p-2 rounded overflow-auto">
                        {JSON.stringify(gatewayRaw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {(status === "failure" || isGatewayBlocked) && !isPending && (
              <Link
                to="/nuevo/pago"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                {isGatewayBlocked ? "Intentar con otro método" : "Volver a intentar"}
              </Link>
            )}

            {status === "success" && (
              <p className="mt-4 text-sm text-muted-foreground">
                El mensaje se enviará automáticamente. Puedes cerrar esta página.
              </p>
            )}

            {lastPolled && (
              <p className="mt-4 text-xs text-muted-foreground">
                Última verificación: {lastPolled.toLocaleTimeString("es-CO")}
                {persisted && " · Guardado en BD"}
              </p>
            )}
          </div>
        </div>
      </main>

      <StepFooter />
    </StepShell>
  );
}