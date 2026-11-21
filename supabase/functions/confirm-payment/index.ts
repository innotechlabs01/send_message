import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { checkUpstashRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { normalizeColombianE164 } from "../_shared/twilio.ts";

const confirmPaymentSchema = z.object({
  referenceId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{3,120}$/, "Valid referenceId is required"),
});

interface StoredCartItem {
  categoryId?: string;
  messageText?: string;
  message?: string;
  recipientPhone?: string;
  phoneTo?: string;
  senderName?: string;
  sender?: string;
  senderPhone?: string;
  phoneFrom?: string;
  sendDate?: string;
}

function mapBoldFallbackStatus(rawStatus: string): {
  boldStatus: string;
  state: "pending" | "success" | "failure" | "gateway_blocked";
} | null {
  const upper = rawStatus.trim().toUpperCase();
  if (["SALE_APPROVED", "APPROVED", "SUCCESS", "PAID", "SUCCEEDED"].includes(upper)) {
    return { boldStatus: "SUCCESS", state: "success" };
  }
  if (["SALE_REJECTED", "REJECTED", "DECLINED", "BLOCKED"].includes(upper)) {
    return { boldStatus: upper === "SALE_REJECTED" ? "REJECTED" : upper, state: "gateway_blocked" };
  }
  if (
    ["FAILED", "ERROR", "CANCELLED", "EXPIRED", "VOIDED", "ABANDONED", "REJECTED_BY_BANK"].includes(
      upper,
    )
  ) {
    return { boldStatus: upper, state: "failure" };
  }
  return null;
}

function resolveScheduledForIso(sendDate?: string): string {
  if (!sendDate || sendDate.trim().length === 0) {
    return new Date().toISOString();
  }
  const trimmed = sendDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T09:00:00-05:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, corsHeaders);
  }

  try {
    const ip = getClientIp(req);
    const rateLimit = await checkUpstashRateLimit(`rl:confirm-payment:${ip}`, 60, 60);
    if (!rateLimit.allowed) {
      return jsonResponse({ error: "Too many requests" }, 429, corsHeaders);
    }

    let rawReferenceId: unknown;
    if (req.method === "GET") {
      const url = new URL(req.url);
      rawReferenceId = url.searchParams.get("referenceId") ?? url.searchParams.get("payment_id");
    } else {
      const body = await req.json().catch(() => ({}));
      rawReferenceId = body?.referenceId ?? body?.payment_id;
    }

    const parsed = confirmPaymentSchema.safeParse({ referenceId: rawReferenceId });
    if (!parsed.success) {
      return jsonResponse({ error: "Valid referenceId is required" }, 400, corsHeaders);
    }

    const supabase = createServiceClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .select(
        "reference_id, status, state, bold_status, amount, expected_amount_cop, currency, gateway_reason, transaction_id, items_json, updated_at",
      )
      .eq("reference_id", parsed.data.referenceId)
      .maybeSingle();

    if (error) {
      return safeErrorResponse(error, corsHeaders, 500);
    }

    if (!payment) {
      return jsonResponse({ error: "Payment not found" }, 404, corsHeaders);
    }

    let currentState = payment.state ?? "pending";
    let currentBoldStatus = payment.bold_status ?? payment.status ?? "PENDING";
    let currentReason = payment.gateway_reason ?? undefined;
    let currentUpdatedAt = payment.updated_at;

    // Optional fallback: if still pending and BOLD_API_KEY + transaction_id are present, poll Bold link status API
    const boldApiKey = Deno.env.get("BOLD_API_KEY")?.trim();
    if (currentState === "pending" && boldApiKey && payment.transaction_id) {
      try {
        const boldResp = await fetch(
          `https://integrations.api.bold.co/online/link/v1/${encodeURIComponent(payment.transaction_id)}`,
          {
            method: "GET",
            headers: { Authorization: `x-api-key ${boldApiKey}` },
            signal: AbortSignal.timeout(4000),
          },
        );
        if (boldResp.ok) {
          const boldJson = (await boldResp.json().catch(() => ({}))) as Record<string, unknown>;
          const inner =
            boldJson.payload && typeof boldJson.payload === "object"
              ? (boldJson.payload as Record<string, unknown>)
              : boldJson;
          const rawStatus = typeof inner.status === "string" ? inner.status : "";
          const mapped = rawStatus ? mapBoldFallbackStatus(rawStatus) : null;

          if (mapped) {
            const nowIso = new Date().toISOString();
            const { data: updatedRow } = await supabase
              .from("payments")
              .update({
                state: mapped.state,
                status: mapped.boldStatus,
                bold_status: mapped.boldStatus,
                updated_at: nowIso,
              })
              .eq("reference_id", payment.reference_id)
              .eq("state", "pending")
              .select("state, bold_status, updated_at")
              .maybeSingle();

            if (updatedRow) {
              currentState = updatedRow.state ?? mapped.state;
              currentBoldStatus = updatedRow.bold_status ?? mapped.boldStatus;
              currentUpdatedAt = updatedRow.updated_at ?? nowIso;

              const eventType =
                mapped.state === "success"
                  ? "success"
                  : mapped.state === "gateway_blocked"
                    ? "blocked"
                    : "failed";
              await supabase
                .from("payment_events")
                .insert({
                  reference_id: payment.reference_id,
                  event_type: eventType,
                  amount_cop: Number(payment.expected_amount_cop ?? payment.amount ?? 0),
                  currency: payment.currency ?? "COP",
                  metadata: { source: "confirm-payment-fallback", boldStatus: mapped.boldStatus },
                })
                .then(() => undefined, () => undefined);

              if (mapped.state === "success" && Array.isArray(payment.items_json)) {
                const items = payment.items_json as StoredCartItem[];
                if (items.length > 0) {
                  const rows = items.map((item, idx) => {
                    const rawPhone = item.recipientPhone ?? item.phoneTo ?? "";
                    let normalizedPhone = rawPhone;
                    try {
                      normalizedPhone = normalizeColombianE164(rawPhone, false);
                    } catch {
                      normalizedPhone = rawPhone.trim();
                    }
                    const rawSenderPhone = item.senderPhone ?? item.phoneFrom ?? null;
                    return {
                      to_number: normalizedPhone,
                      text: item.messageText ?? item.message ?? "",
                      sender_name: item.senderName ?? item.sender ?? "",
                      sender_phone: rawSenderPhone ? rawSenderPhone.trim() : null,
                      sent: false,
                      status: "pending",
                      scheduled_for: resolveScheduledForIso(item.sendDate),
                      payment_reference_id: payment.reference_id,
                      idempotency_key: `${payment.reference_id}:item:${idx}`,
                    };
                  });
                  await supabase.from("scheduled_messages").upsert(rows, {
                    onConflict: "idempotency_key",
                    ignoreDuplicates: true,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Fallback poll is best-effort; return current DB state
      }
    }

    // Strictly sanitized response — no PII (customer name/email/phone or message content)
    return jsonResponse(
      {
        referenceId: payment.reference_id,
        status: currentBoldStatus,
        state: currentState,
        boldStatus: currentBoldStatus,
        amount: Number(payment.expected_amount_cop ?? payment.amount ?? 0),
        currency: payment.currency ?? "COP",
        reason: currentReason,
        updatedAt: currentUpdatedAt,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
