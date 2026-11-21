import { supabase } from "@/integrations/supabase/client";

export const adminSupabase = supabase;

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
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
      // Clean up legacy insecure localStorage key if present
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

    if (error) throw error;
    if (data?.error) return { user: null, error: data.error };

    if (data?.user) {
      verifiedAdminUser = data.user;
      if (typeof data.token === "string") {
        setSignedToken(data.token);
      }
    }

    return { user: data?.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : "Error de conexión" };
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
  try {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { action: "verify" },
      headers: getSignedTokenHeader(),
    });
    if (error) throw error;
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
    if (error) throw error;
    if (data?.error) return { user: null, error: data.error };
    if (data?.user) {
      verifiedAdminUser = data.user;
      if (typeof data.token === "string") {
        setSignedToken(data.token);
      }
    }
    return { user: data?.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : "Error de conexión" };
  }
}

export async function adminListMessages(categoryId: string): Promise<PredefinedMessageRow[]> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: { action: "list", category_id: categoryId },
    headers: getSignedTokenHeader(),
  });
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.message as PredefinedMessageRow;
}

export async function adminDeleteMessage(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-manage-messages", {
    body: { action: "delete", id },
    headers: getSignedTokenHeader(),
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function adminFetchKpis(days = 30): Promise<AdminKpiOverview> {
  const { data, error } = await supabase.functions.invoke("admin-kpis", {
    body: { action: "overview", days },
    headers: getSignedTokenHeader(),
  });
  if (error) throw error;
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
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; retriedCount: number };
}
