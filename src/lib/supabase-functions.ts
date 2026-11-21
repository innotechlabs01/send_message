import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export class EdgeFunctionError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = status;
    this.details = details;
  }
}

export interface InvokeEdgeFunctionOptions {
  headers?: Record<string, string>;
  method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
}

/**
 * Invokes a Supabase Edge Function and surfaces real server `{ error }` messages
 * from `FunctionsHttpError` responses (`error.context?.json()`).
 */
export async function invokeEdgeFunction<T = unknown>(
  fnName: string,
  body?: Record<string, unknown>,
  options?: InvokeEdgeFunctionOptions,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body,
    headers: options?.headers,
    method: options?.method,
  });

  if (error) {
    if (
      error instanceof FunctionsHttpError ||
      (typeof error === "object" && error !== null && "context" in error)
    ) {
      const response = (error as { context?: Response }).context;
      const status = response?.status;
      let payload: Record<string, unknown> | null = null;

      if (response && typeof response.json === "function") {
        try {
          payload = (await response.json()) as Record<string, unknown>;
        } catch {
          payload = null;
        }
      }

      const serverMessage =
        (typeof payload?.error === "string" && payload.error) ||
        (typeof payload?.message === "string" && payload.message) ||
        error.message ||
        "Error en la función del servidor";

      throw new EdgeFunctionError(serverMessage, status, payload);
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new EdgeFunctionError(error.message || "Error de conexión con el servidor");
    }

    const fallbackMsg =
      error instanceof Error ? error.message : "Error inesperado al invocar la función";
    throw new EdgeFunctionError(fallbackMsg);
  }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as Record<string, unknown>).error === "string"
  ) {
    throw new EdgeFunctionError((data as Record<string, unknown>).error as string, 200, data);
  }

  return data as T;
}
