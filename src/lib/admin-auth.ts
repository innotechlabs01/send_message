import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export const adminSupabase = supabase;

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  password_changed_at?: string | null;
};

export type PredefinedMessageRow = {
  id: string;
  category_id: string;
  message_text: string;
  sort_order: number;
  created_at?: string | null;
};

export type KpiPaymentFunnel = {
  total_intents: number;
  pending_count: number;
  success_count: number;
  blocked_count: number;
  failed_count: number;
  conversion_rate_pct: number;
  gross_revenue_cop: number;
  avg_ticket_cop: number;
};

export type KpiDeliveryHealth = {
  total_scheduled: number;
  pending_messages: number;
  sent_messages: number;
  failed_messages: number;
  dead_letter_messages: number;
  delivery_rate_pct: number;
  failure_rate_pct: number;
  dead_letter_rate_pct: number;
  avg_send_latency_seconds: number;
  wa_logs_total: number;
  wa_delivered_count: number;
  wa_failed_count: number;
};

export type KpiDailyRevenueRow = {
  day: string;
  total_orders: number;
  paid_orders: number;
  failed_orders: number;
  revenue_cop: number;
  conversion_rate_pct: number;
};

export type FailedScheduledMessageRow = {
  id: string;
  to_number: string;
  sender_name: string | null;
  text: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_for: string | null;
  next_retry_at: string | null;
  payment_reference_id: string | null;
  created_at: string;
};

export type RecentPaymentRow = {
  id: string;
  reference_id: string;
  amount: number;
  expected_amount_cop: number | null;
  currency: string;
  state: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
};

export type AdminKpiOverview = {
  paymentFunnel: KpiPaymentFunnel;
  deliveryHealth: KpiDeliveryHealth;
  dailyRevenue: KpiDailyRevenueRow[];
  failedQueue: FailedScheduledMessageRow[];
  recentPayments: RecentPaymentRow[];
};

const SESSION_TOKEN_KEY = "admin_signed_token";
let verifiedAdminUser: AdminUser | null = null;
let signedSessionToken: string | null = null;

async function parseFunctionError(
  error: unknown,
  fallbackMessage = "Error de conexión",
): Promise<string> {
  if (
    error instanceof FunctionsHttpError ||
    (error && typeof error === "object" && "context" in error)
  ) {
    try {
      const ctx = (error as { context?: unknown }).context;
      if (ctx && typeof (ctx as Response).json === "function") {
        const body = await (ctx as Response).json();
        if (body && typeof body.error === "string") {
          return body.error;
        }
      }
    } catch {
      // Ignore json parse failure and fall back
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export function hasStoredAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.sessionStorage.getItem(SESSION_TOKEN_KEY));
  } catch {
    return false;
  }
}

function getSignedTokenHeader(): Record<string, string> | undefined {
  if (!signedSessionToken && typeof window !== "undefined") {
    try {
      signedSessionToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
  return signedSessionToken ? { "x-admin-token": signedSessionToken } : undefined;
}

function setSignedToken(token: string | null) {
  signedSessionToken = token;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("admin_session");
      if (token) {
        window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { action: "login", email, password },
    });

    if (error) {
      const errMsg = await parseFunctionError(error, "Credenciales inválidas");
      return { user: null, error: errMsg };
    }
    if (data?.error) return { user: null, error: data.error };

    if (data?.user) {
      verifiedAdminUser = data.user;
      if (typeof data.token === "string") {
        setSignedToken(data.token);
      }
    }

    return { user: data?.user ?? null, error: null };
  } catch (e) {
    const errMsg = await parseFunctionError(e, "Error de conexión");
    return { user: null, error: errMsg };
  }
}

export async function adminLogout(): Promise<void> {
  verifiedAdminUser = null;
  const headers = getSignedTokenHeader();
  setSignedToken(null);
  try {
    await supabase.functions.invoke("admin-auth", {
      body: { action: "logout" },
      headers,
    });
  } catch {
    // Ignore logout errors
  }
}

export function getAdminSession(): AdminUser | null {
  return verifiedAdminUser;
}

export async function verifyAdminSession(): Promise<AdminUser | null> {
  const headers = getSignedTokenHeader();
  if (!headers) {
    verifiedAdminUser = null;
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { action: "verify" },
      headers,
    });
    if (error) {
      verifiedAdminUser = null;
      setSignedToken(null);
      return null;
    }
    if (data?.user) {
      verifiedAdminUser = data.user;
      return data.user;
    }
    verifiedAdminUser = null;
    setSignedToken(null);
    return null;
  } catch {
    verifiedAdminUser = null;
    setSignedToken(null);
    return null;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { action: "change-password", currentPassword, newPassword },
      headers: getSignedTokenHeader(),
    });
    if (error) {
      const errMsg = await parseFunctionError(error, "Error al cambiar contraseña");
      return { user: null, error: errMsg };
    }
    if (data?.error) return { user: null, error: data.error };
    if (data?.user) {
      verifiedAdminUser = data.user;
      if (typeof data.token === "string") {
        setSignedToken(data.token);
      }
    }
    return { user: data?.user ?? null, error: null };
  } catch (e) {
    const errMsg = await parseFunctionError(e, "Error de conexión");
    return { user: null, error: errMsg };
  }
}

export async function adminListMessages(categoryId: string): Promise<PredefinedMessageRow[]> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: { action: "list", category_id: categoryId },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error cargando mensajes");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return (data?.messages as PredefinedMessageRow[]) ?? [];
}

export async function adminCreateMessage(
  categoryId: string,
  messageText: string,
  sortOrder?: number,
): Promise<PredefinedMessageRow> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: {
      action: "create",
      category_id: categoryId,
      message_text: messageText,
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
    },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error creando mensaje");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data.message as PredefinedMessageRow;
}

export async function adminUpdateMessage(
  id: string,
  messageText: string,
  sortOrder?: number,
): Promise<PredefinedMessageRow> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: {
      action: "update",
      id,
      message_text: messageText,
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
    },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error actualizando mensaje");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data.message as PredefinedMessageRow;
}

export async function adminDeleteMessage(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: { action: "delete", id },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error eliminando mensaje");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
}

export async function adminFetchKpis(days = 30): Promise<AdminKpiOverview> {
  const { data, error } = await supabase.functions.invoke("admin-kpis", {
    body: { action: "overview", days },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error obteniendo KPIs");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data as AdminKpiOverview;
}

export async function adminRetryScheduledMessage(
  id: string,
): Promise<{ success: boolean; retriedCount: number }> {
  const { data, error } = await supabase.functions.invoke("admin-kpis", {
    body: { action: "retry", id },
    headers: getSignedTokenHeader(),
  });
  if (error) {
    const errMsg = await parseFunctionError(error, "Error reintentando mensaje");
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; retriedCount: number };
}
