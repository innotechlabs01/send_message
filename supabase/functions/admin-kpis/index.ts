import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { verifyAdminSession } from "../_shared/admin-session.ts";
import { getCorsHeaders, handleCorsPreflight, type CorsOptions } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";

const CORS_OPTIONS: CorsOptions = {
  credentials: true,
  allowedHeaders: [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-admin-token",
  ],
};

const overviewSchema = z.object({
  action: z.literal("overview").default("overview"),
  days: z.number().int().min(1).max(90).optional().default(30),
});

const retrySchema = z.object({
  action: z.literal("retry"),
  id: z.string().uuid("ID de mensaje programado inválido").optional(),
  ids: z.array(z.string().uuid()).min(1).max(50).optional(),
});

const kpiPayloadSchema = z.union([retrySchema, overviewSchema]);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, CORS_OPTIONS);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, CORS_OPTIONS);

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Método no permitido" }, 405, corsHeaders);
  }

  try {
    const adminSupabase = createServiceClient();
    const adminUser = await verifyAdminSession(req, adminSupabase);
    if (!adminUser) {
      return jsonResponse({ error: "No autenticado como administrador" }, 401, corsHeaders);
    }

    let rawBody: unknown = { action: "overview" };
    if (req.method === "POST") {
      try {
        const text = await req.text();
        if (text.trim().length > 0) {
          rawBody = JSON.parse(text);
        }
      } catch {
        return jsonResponse({ error: "Cuerpo JSON inválido" }, 400, corsHeaders);
      }
    }

    const parsed = kpiPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        {
          error: parsed.error.issues[0]?.message ?? "Parámetros inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
        corsHeaders,
      );
    }

    const payload = parsed.data;

    if (payload.action === "retry") {
      const targetIds = payload.ids ?? (payload.id ? [payload.id] : []);
      if (targetIds.length === 0) {
        return jsonResponse(
          { error: "Se requiere 'id' o 'ids' para reintentar" },
          400,
          corsHeaders,
        );
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: updateError } = await adminSupabase
        .from("scheduled_messages")
        .update({
          status: "pending",
          attempts: 0,
          next_retry_at: nowIso,
          locked_at: null,
          last_error: null,
        })
        .in("id", targetIds)
        .eq("sent", false)
        .select("id, to_number, status, attempts, next_retry_at");

      if (updateError) throw updateError;

      return jsonResponse(
        {
          success: true,
          retriedCount: updated?.length ?? 0,
          messages: updated ?? [],
        },
        200,
        corsHeaders,
      );
    }

    // Overview action: query KPI views, failed/dead_letter queue, and recent payments
    const [funnelRes, deliveryRes, dailyRes, failedQueueRes, recentPaymentsRes] =
      await Promise.all([
        adminSupabase.from("v_kpi_payment_funnel").select("*").maybeSingle(),
        adminSupabase.from("v_kpi_delivery_health").select("*").maybeSingle(),
        adminSupabase.from("v_kpi_daily_revenue").select("*").limit(payload.days ?? 30),
        adminSupabase
          .from("scheduled_messages")
          .select(
            "id, to_number, sender_name, text, status, attempts, max_attempts, last_error, scheduled_for, next_retry_at, payment_reference_id, created_at",
          )
          .in("status", ["failed", "dead_letter"])
          .order("created_at", { ascending: false })
          .limit(50),
        adminSupabase
          .from("payments")
          .select(
            "id, reference_id, amount, expected_amount_cop, currency, state, status, payment_method, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

    // Check .error on all 5 queries and return 500 on DB failure
    const dbError =
      funnelRes.error ||
      deliveryRes.error ||
      dailyRes.error ||
      failedQueueRes.error ||
      recentPaymentsRes.error;

    if (dbError) {
      console.error("[admin-kpis] Database query error:", dbError);
      return jsonResponse(
        { error: "Error consultando base de datos para KPIs" },
        500,
        corsHeaders,
      );
    }

    const paymentFunnel = funnelRes.data ?? {
      total_intents: 0,
      pending_count: 0,
      success_count: 0,
      blocked_count: 0,
      failed_count: 0,
      conversion_rate_pct: 0,
      gross_revenue_cop: 0,
      avg_ticket_cop: 0,
    };

    const deliveryHealth = deliveryRes.data ?? {
      total_scheduled: 0,
      pending_messages: 0,
      sent_messages: 0,
      failed_messages: 0,
      dead_letter_messages: 0,
      delivery_rate_pct: 0,
      failure_rate_pct: 0,
      dead_letter_rate_pct: 0,
      avg_send_latency_seconds: 0,
      wa_logs_total: 0,
      wa_delivered_count: 0,
      wa_failed_count: 0,
    };

    return jsonResponse(
      {
        paymentFunnel,
        deliveryHealth,
        dailyRevenue: dailyRes.data ?? [],
        failedQueue: failedQueueRes.data ?? [],
        recentPayments: recentPaymentsRes.data ?? [],
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
