import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";

import { StepHeader } from "@/components/StepHeader";
import { StepFooter, StepShell } from "@/components/StepShell";
import { getPaymentStatus } from "@/lib/bold";
import { getPaymentStatusCopy, type PaymentState } from "@/lib/payment-status";
import { EdgeFunctionError } from "@/lib/supabase-functions";
import { wizard } from "@/lib/wizard-store";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
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
  const [gatewayReason, setGatewayReason] = useState<string>();
  const [gatewayRaw, setGatewayRaw] = useState<Record<string, unknown>>();
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const statusRef = useRef<Status>("checking");
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);
  const wizardResetRef = useRef(false);
  const maxPolls = 40; // ~2 minutes at 3s interval

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((nextStatus: Status) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    if (nextStatus === "success" && !wizardResetRef.current) {
      wizardResetRef.current = true;
      wizard.reset();
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!payment_id || !isMountedRef.current) return;

    try {
      pollCountRef.current += 1;
      const result = await getPaymentStatus(payment_id);

      if (!isMountedRef.current) return;

      // Check if Bold/edge function returned an error in the response body
      const boldError = result?.error || result?.error_message || result?.message;
      if (boldError) {
        throw new Error(
          typeof boldError === "string" ? boldError : "Error en la respuesta de Bold",
        );
      }

      consecutiveErrorsRef.current = 0;

      const boldStatus = String(result?.boldStatus || result?.status || result?.state || "UNKNOWN");
      const gwReason =
        typeof result?.reason === "string"
          ? result.reason
          : typeof result?.decline_reason === "string"
            ? result.decline_reason
            : typeof result?.error_message === "string"
              ? result.error_message
              : undefined;
      const gwRaw = result as Record<string, unknown>;

      setGatewayRaw(gwRaw);
      if (gwReason) setGatewayReason(gwReason);
      setLastPolled(new Date());

      const copy = getPaymentStatusCopy(boldStatus, undefined, gwReason);
      updateStatus(copy.state);
      if (copy.errorCode) setError(copy.errorCode);

      // Stop polling on terminal states or maxPolls timeout
      const isTerminal =
        copy.state === "success" || copy.state === "failure" || copy.state === "gateway_blocked";
      if (isTerminal) {
        setTimedOut(false);
        stopPolling();
      } else if (pollCountRef.current >= maxPolls) {
        setTimedOut(true);
        stopPolling();
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Error verificando pago";
      const errStatus = err instanceof EdgeFunctionError ? err.status : undefined;
      const currentStatus = statusRef.current;

      // Fail fast only on 400 (bad request) or after >=3 consecutive errors
      if (errStatus === 400) {
        if (
          currentStatus !== "success" &&
          currentStatus !== "failure" &&
          currentStatus !== "gateway_blocked"
        ) {
          updateStatus("failure");
          setError(msg);
        }
        stopPolling();
        return;
      }

      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 3) {
        if (
          currentStatus !== "success" &&
          currentStatus !== "failure" &&
          currentStatus !== "gateway_blocked"
        ) {
          updateStatus("failure");
          setError(msg);
        }
        stopPolling();
        return;
      }

      if (pollCountRef.current >= maxPolls) {
        setTimedOut(true);
        stopPolling();
      }
    }
  }, [payment_id, stopPolling, updateStatus]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    consecutiveErrorsRef.current = 0;
    setTimedOut(false);
    setError(undefined);

    checkStatus();

    intervalRef.current = window.setInterval(() => {
      const current = statusRef.current;
      if (current === "pending" || current === "checking") {
        checkStatus();
      }
    }, 3000);
  }, [checkStatus, stopPolling]);

  useEffect(() => {
    if (!payment_id) {
      updateStatus("failure");
      setError("Falta el ID del pago");
      return;
    }

    isMountedRef.current = true;
    startPolling();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [payment_id, startPolling, stopPolling, updateStatus]);

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
            {isPending && !timedOut && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {isPending && timedOut && <Clock className="h-12 w-12 text-amber-500" />}
            {status === "success" && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
            {status === "failure" && !isPending && !isGatewayBlocked && (
              <AlertCircle className="h-12 w-12 text-red-500" />
            )}
            {isGatewayBlocked && <ShieldAlert className="h-12 w-12 text-amber-500" />}

            <div>
              <h2 className="text-xl font-semibold">
                {isPending && timedOut ? "Aún estamos esperando confirmación" : copy.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isPending && timedOut
                  ? "La pasarela está tardando más de lo habitual. Puedes verificar manualmente ahora."
                  : copy.message}
              </p>
              {copy.errorCode && (
                <p className="mt-2 text-xs text-muted-foreground">Código: {copy.errorCode}</p>
              )}
              {isGatewayBlocked && gatewayReason && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left w-full max-w-md">
                  <p className="text-xs font-medium text-amber-800">Motivo del bloqueo:</p>
                  <p className="mt-1 text-sm text-amber-700 font-mono">{gatewayReason}</p>
                  {gatewayRaw && Object.keys(gatewayRaw).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-amber-600 cursor-pointer">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-2 text-xs bg-amber-100 p-2 rounded overflow-auto">
                        {JSON.stringify(gatewayRaw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {isPending && timedOut && (
              <button
                type="button"
                onClick={startPolling}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Verificar ahora
              </button>
            )}

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
              </p>
            )}
          </div>
        </div>
      </main>

      <StepFooter>
        <></>
      </StepFooter>
    </StepShell>
  );
}
