import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient, signHmacSha256Hex } from "../_shared/auth.ts";

export const PRICE_PER_MESSAGE = 4990; // COP
export const CURRENCY = "COP";

const cartItemSchema = z.object({
  id: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().min(1).max(64),
  messageText: z.string().trim().min(1).max(2000),
  recipientName: z.string().trim().min(1).max(120),
  recipientPhone: z.string().trim().min(7).max(32),
  senderName: z.string().trim().min(1).max(120),
  senderPhone: z.string().trim().max(32).optional(),
  sendDate: z.string().trim().min(8).max(40),
});

export type PaymentCartItem = z.infer<typeof cartItemSchema>;

const customerSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().max(32).optional(),
  })
  .optional();

const createIntentSchema = z.object({
  action: z.literal("create-payment-intent"),
  referenceId: z.string().trim().min(3).max(120),
  idempotencyKey: z.string().uuid().optional(),
  amount: z.number().int().positive().optional(),
  description: z.string().trim().max(255).optional(),
  callbackUrl: z.string().url().max(500),
  items: z.array(cartItemSchema).min(1).max(50),
  customer: customerSchema,
});

const getStatusSchema = z.object({
  action: z.literal("get-payment-status"),
  referenceId: z.string().trim().min(3).max(120),
});

const checkExistingSchema = z.object({
  action: z.literal("check-existing-payment"),
  cartSignature: z.string().trim().min(3).max(500),
});

export function computeExpectedAmountCop(itemCount: number): number {
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error("Cart must contain at least 1 item");
  }
  return itemCount * PRICE_PER_MESSAGE;
}

export function buildCartSignature(items: PaymentCartItem[]): string {
  return items
    .map((item) => `${item.categoryId}-${item.recipientName}-${item.recipientPhone}-${item.sendDate}`)
    .join("|");
}

function appendReferenceToCallback(callbackUrl: string, referenceId: string): string {
  try {
    const url = new URL(callbackUrl);
    if (!url.searchParams.has("payment_id")) {
      url.searchParams.set("payment_id", referenceId);
    }
    return url.toString();
  } catch {
    const sep = callbackUrl.includes("?") ? "&" : "?";
    return `${callbackUrl}${sep}payment_id=${encodeURIComponent(referenceId)}`;
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, corsHeaders);
  }

  try {
    const rawBody = await req.json();

    // Normalize legacy single-item payload into items[] if needed
    if (
      rawBody &&
      typeof rawBody === "object" &&
      rawBody.action === "create-payment-intent" &&
      !Array.isArray(rawBody.items) &&
      rawBody.categoryId &&
      rawBody.messageText
    ) {
      rawBody.items = [
        {
          categoryId: rawBody.categoryId,
          messageText: rawBody.messageText,
          recipientName: rawBody.recipientName,
          recipientPhone: rawBody.recipientPhone,
          senderName: rawBody.senderName,
          senderPhone: rawBody.senderPhone,
          sendDate: rawBody.sendDate,
        },
      ];
    }

    const action = rawBody?.action;
    const supabase = createServiceClient();

    if (action === "create-payment-intent") {
      const parsed = createIntentSchema.safeParse(rawBody);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Invalid payment intent payload", details: parsed.error.flatten() },
          400,
          corsHeaders,
        );
      }

      const data = parsed.data;
      const expectedAmountCop = computeExpectedAmountCop(data.items.length);

      // Reject client-side amount tampering
      if (data.amount !== undefined && data.amount !== expectedAmountCop) {
        return jsonResponse(
          {
            error: `Invalid amount: expected ${expectedAmountCop} COP for ${data.items.length} item(s)`,
          },
          400,
          corsHeaders,
        );
      }

      const idempotencyKey = data.idempotencyKey ?? crypto.randomUUID();
      const cartSignature = buildCartSignature(data.items);
      const callbackWithRef = appendReferenceToCallback(data.callbackUrl, data.referenceId);

      // Idempotency lookup: if payment already exists for idempotency_key or reference_id, return existing
      const { data: existingRows } = await supabase
        .from("payments")
        .select("reference_id, idempotency_key, amount, expected_amount_cop, currency, state, status, bold_response")
        .or(`idempotency_key.eq.${idempotencyKey},reference_id.eq.${data.referenceId}`)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        const existingBold = (existing.bold_response ?? {}) as Record<string, unknown>;
        return jsonResponse(
          {
            referenceId: existing.reference_id,
            idempotencyKey: existing.idempotency_key,
            amount: existing.expected_amount_cop ?? existing.amount,
            currency: existing.currency ?? CURRENCY,
            idempotentReplay: true,
            payload: existingBold.payload ?? existingBold,
          },
          200,
          corsHeaders,
        );
      }

      const boldApiKey = Deno.env.get("BOLD_API_KEY");
      const boldSecretKey = Deno.env.get("BOLD_SECRET_KEY");
      if (!boldApiKey) {
        return safeErrorResponse(new Error("BOLD_API_KEY is not configured"), corsHeaders, 500);
      }

      const integritySignature = boldSecretKey
        ? await signHmacSha256Hex(
            boldSecretKey,
            `${data.referenceId}${expectedAmountCop}${CURRENCY}`,
          )
        : undefined;

      const boldRequestBody = {
        amount_type: "CLOSE",
        amount: {
          currency: CURRENCY,
          total_amount: expectedAmountCop,
          tip_amount: 0,
        },
        reference: data.referenceId,
        description: data.description ?? `ConSentido - ${data.items.length} mensaje(s)`,
        callback_url: callbackWithRef,
        payer_email: data.customer?.email,
      };

      const boldResp = await fetch("https://integrations.api.bold.co/online/link/v1", {
        method: "POST",
        headers: {
          Authorization: `x-api-key ${boldApiKey}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(boldRequestBody),
      });

      const boldJson = (await boldResp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!boldResp.ok) {
        console.error("[bold-payment] Bold API error:", boldResp.status, boldJson);
        return jsonResponse(
          { error: "No se pudo crear la orden en la pasarela de pagos" },
          502,
          corsHeaders,
        );
      }

      const innerPayload = (boldJson.payload ?? boldJson) as Record<string, unknown>;
      const nextActions = (innerPayload.next_actions ?? {}) as Record<string, unknown>;
      const redirectUrl =
        (typeof nextActions.redirect_url === "string" && nextActions.redirect_url) ||
        (typeof innerPayload.url === "string" && innerPayload.url) ||
        (typeof boldJson.url === "string" && boldJson.url) ||
        null;

      const normalizedPayload = {
        ...innerPayload,
        payment_link: innerPayload.payment_link ?? innerPayload.id ?? null,
        next_actions: {
          ...nextActions,
          redirect_url: redirectUrl,
        },
      };

      const nowIso = new Date().toISOString();
      const { error: insertError } = await supabase.from("payments").insert({
        reference_id: data.referenceId,
        idempotency_key: idempotencyKey,
        amount: expectedAmountCop,
        expected_amount_cop: expectedAmountCop,
        currency: CURRENCY,
        status: "PENDING",
        state: "pending",
        bold_status: "PENDING",
        items_json: data.items,
        transaction_id:
          typeof innerPayload.payment_link === "string" ? innerPayload.payment_link : null,
        gateway_raw: {
          cartSignature,
          itemCount: data.items.length,
          customer: data.customer ?? null,
        },
        bold_response: {
          payload: normalizedPayload,
          integritySignature,
        },
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (insertError) {
        console.error("[bold-payment] Failed to store payment record:", insertError);
        return safeErrorResponse(new Error("Failed to store payment order"), corsHeaders, 500);
      }

      return jsonResponse(
        {
          referenceId: data.referenceId,
          idempotencyKey,
          amount: expectedAmountCop,
          currency: CURRENCY,
          integritySignature,
          payload: normalizedPayload,
        },
        200,
        corsHeaders,
      );
    }

    if (action === "check-existing-payment") {
      const parsed = checkExistingSchema.safeParse(rawBody);
      if (!parsed.success) {
        return jsonResponse({ error: "Invalid cartSignature" }, 400, corsHeaders);
      }

      const { data: rows, error } = await supabase
        .from("payments")
        .select("reference_id, state, bold_status, status, gateway_reason, created_at")
        .eq("gateway_raw->>cartSignature", parsed.data.cartSignature)
        .in("state", ["pending", "failure", "gateway_blocked"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !rows || rows.length === 0) {
        return jsonResponse({ existingPayment: null }, 200, corsHeaders);
      }

      const row = rows[0];
      return jsonResponse(
        {
          existingPayment: {
            reference_id: row.reference_id,
            state: row.state ?? "pending",
            bold_status: row.bold_status ?? row.status ?? "PENDING",
            gateway_reason: row.gateway_reason ?? undefined,
            created_at: row.created_at,
          },
        },
        200,
        corsHeaders,
      );
    }

    if (action === "get-payment-status") {
      const parsed = getStatusSchema.safeParse(rawBody);
      if (!parsed.success) {
        return jsonResponse({ error: "referenceId is required" }, 400, corsHeaders);
      }

      const { data: payment, error } = await supabase
        .from("payments")
        .select(
          "reference_id, status, state, bold_status, amount, expected_amount_cop, currency, gateway_reason, updated_at",
        )
        .eq("reference_id", parsed.data.referenceId)
        .maybeSingle();

      if (error) {
        return safeErrorResponse(error, corsHeaders, 500);
      }

      if (!payment) {
        return jsonResponse({ error: "Payment not found" }, 404, corsHeaders);
      }

      // Sanitized response: never expose customer PII or items_json
      return jsonResponse(
        {
          referenceId: payment.reference_id,
          status: payment.bold_status ?? payment.status ?? "PENDING",
          state: payment.state ?? "pending",
          boldStatus: payment.bold_status ?? payment.status ?? "PENDING",
          amount: Number(payment.expected_amount_cop ?? payment.amount ?? 0),
          currency: payment.currency ?? CURRENCY,
          reason: payment.gateway_reason ?? undefined,
          updatedAt: payment.updated_at,
        },
        200,
        corsHeaders,
      );
    }

    return jsonResponse({ error: "Unsupported action" }, 400, corsHeaders);
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
