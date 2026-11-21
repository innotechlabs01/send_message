import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient, verifyHmacSha256Hex } from "../_shared/auth.ts";
import { normalizeColombianE164 } from "../_shared/twilio.ts";

export const PRICE_PER_MESSAGE = 4990;
export const EXPECTED_CURRENCY = "COP";

export interface StoredCartItem {
  id?: string;
  categoryId?: string;
  messageText?: string;
  message?: string;
  recipientName?: string;
  recipient?: string;
  recipientPhone?: string;
  phoneTo?: string;
  senderName?: string;
  sender?: string;
  senderPhone?: string;
  phoneFrom?: string;
  sendDate?: string;
}

export type InternalPaymentState = "pending" | "success" | "failure" | "gateway_blocked";

export function mapBoldStatus(rawStatus: string): {
  boldStatus: string;
  state: InternalPaymentState;
} {
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

  return { boldStatus: upper || "PENDING", state: "pending" };
}

function toBase64Utf8(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Verifies Bold webhook HMAC-SHA256 signature against either raw UTF-8 payload
 * or Base64-encoded raw payload (Bold webhook specification).
 */
export async function verifyBoldWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secrets: string[],
): Promise<boolean> {
  if (!signatureHeader || signatureHeader.trim().length === 0) {
    return false;
  }

  const cleanSig = signatureHeader.trim().replace(/^sha256=/i, "");
  if (cleanSig.length === 0) {
    return false;
  }

  const validSecrets = secrets.filter((s) => typeof s === "string" && s.length > 0);
  if (validSecrets.length === 0) {
    return false;
  }

  const base64Body = toBase64Utf8(rawBody);

  for (const secret of validSecrets) {
    const rawMatch = await verifyHmacSha256Hex(secret, rawBody, cleanSig);
    if (rawMatch) return true;

    const b64Match = await verifyHmacSha256Hex(secret, base64Body, cleanSig);
    if (b64Match) return true;
  }

  return false;
}

export function resolveScheduledForIso(sendDate?: string): string {
  if (!sendDate || sendDate.trim().length === 0) {
    return new Date().toISOString();
  }
  const trimmed = sendDate.trim();
  // If YYYY-MM-DD date string, schedule for 09:00 Colombia time (-05:00)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T09:00:00-05:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

function extractWebhookFields(payload: Record<string, unknown>): {
  referenceId: string | null;
  rawStatus: string;
  amount: number | null;
  currency: string | null;
  transactionId: string | null;
  paymentMethod: string | null;
  reason: string | null;
} {
  const dataObj =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const metadataObj =
    dataObj.metadata && typeof dataObj.metadata === "object"
      ? (dataObj.metadata as Record<string, unknown>)
      : {};

  const referenceId =
    (typeof dataObj.reference === "string" && dataObj.reference) ||
    (typeof dataObj.reference_id === "string" && dataObj.reference_id) ||
    (typeof dataObj.referenceId === "string" && dataObj.referenceId) ||
    (typeof metadataObj.reference === "string" && metadataObj.reference) ||
    (typeof payload.reference === "string" && payload.reference) ||
    (typeof payload.reference_id === "string" && payload.reference_id) ||
    null;

  const rawStatus =
    (typeof dataObj.status === "string" && dataObj.status) ||
    (typeof payload.type === "string" && payload.type) ||
    (typeof payload.status === "string" && payload.status) ||
    "PENDING";

  let amount: number | null = null;
  let currency: string | null = null;

  if (dataObj.amount && typeof dataObj.amount === "object") {
    const amtObj = dataObj.amount as Record<string, unknown>;
    const rawTotal = amtObj.total ?? amtObj.total_amount ?? amtObj.value;
    if (typeof rawTotal === "number") amount = rawTotal;
    else if (typeof rawTotal === "string" && rawTotal.trim() !== "") amount = Number(rawTotal);

    if (typeof amtObj.currency === "string") currency = amtObj.currency;
  } else if (typeof dataObj.amount === "number") {
    amount = dataObj.amount;
  } else if (typeof dataObj.amount === "string" && dataObj.amount.trim() !== "") {
    amount = Number(dataObj.amount);
  } else if (typeof payload.amount === "number") {
    amount = payload.amount;
  }

  if (!currency) {
    if (typeof dataObj.currency === "string") currency = dataObj.currency;
    else if (typeof payload.currency === "string") currency = payload.currency;
  }

  const transactionId =
    (typeof dataObj.payment_id === "string" && dataObj.payment_id) ||
    (typeof dataObj.transaction_id === "string" && dataObj.transaction_id) ||
    (typeof dataObj.id === "string" && dataObj.id) ||
    (typeof payload.payment_id === "string" && payload.payment_id) ||
    null;

  const paymentMethod =
    (typeof dataObj.payment_method === "string" && dataObj.payment_method) ||
    (typeof payload.payment_method === "string" && payload.payment_method) ||
    null;

  const reason =
    (typeof dataObj.reason === "string" && dataObj.reason) ||
    (typeof dataObj.decline_reason === "string" && dataObj.decline_reason) ||
    (typeof dataObj.error_message === "string" && dataObj.error_message) ||
    (typeof payload.reason === "string" && payload.reason) ||
    null;

  return {
    referenceId,
    rawStatus,
    amount,
    currency,
    transactionId,
    paymentMethod,
    reason,
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, corsHeaders);
  }

  try {
    const boldSecretKey = Deno.env.get("BOLD_SECRET_KEY") ?? "";
    const boldWebhookSecret = Deno.env.get("BOLD_WEBHOOK_SECRET") ?? "";
    const secrets = [boldSecretKey, boldWebhookSecret].filter((s) => s.length > 0);

    if (secrets.length === 0) {
      return safeErrorResponse(
        new Error("BOLD_SECRET_KEY or BOLD_WEBHOOK_SECRET must be configured"),
        corsHeaders,
        500,
      );
    }

    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("x-bold-signature") ?? req.headers.get("X-Bold-Signature");

    const isSignatureValid = await verifyBoldWebhookSignature(rawBody, signatureHeader, secrets);
    if (!isSignatureValid) {
      return jsonResponse({ error: "Invalid webhook signature" }, 401, corsHeaders);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Malformed JSON body" }, 400, corsHeaders);
    }

    const extracted = extractWebhookFields(payload);
    if (!extracted.referenceId) {
      return jsonResponse({ error: "Missing payment referenceId" }, 400, corsHeaders);
    }

    const supabase = createServiceClient();
    const { data: payment, error: lookupError } = await supabase
      .from("payments")
      .select("*")
      .eq("reference_id", extracted.referenceId)
      .maybeSingle();

    if (lookupError) {
      return safeErrorResponse(lookupError, corsHeaders, 500);
    }

    if (!payment) {
      return jsonResponse({ error: "Payment reference not found" }, 404, corsHeaders);
    }

    const items: StoredCartItem[] = Array.isArray(payment.items_json)
      ? (payment.items_json as StoredCartItem[])
      : [];

    const expectedAmount =
      Number(payment.expected_amount_cop ?? payment.amount ?? 0) ||
      items.length * PRICE_PER_MESSAGE;

    const normalizedCurrency = (extracted.currency ?? EXPECTED_CURRENCY).trim().toUpperCase();
    if (normalizedCurrency !== EXPECTED_CURRENCY) {
      await supabase
        .from("payments")
        .update({
          state: "failure",
          status: "FAILED",
          bold_status: "CURRENCY_MISMATCH",
          gateway_reason: `Invalid currency: ${normalizedCurrency} (expected ${EXPECTED_CURRENCY})`,
          bold_response: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("reference_id", extracted.referenceId);

      return jsonResponse(
        { error: `Currency mismatch: expected ${EXPECTED_CURRENCY}, got ${normalizedCurrency}` },
        400,
        corsHeaders,
      );
    }

    if (
      extracted.amount === null ||
      Number.isNaN(extracted.amount) ||
      Number(extracted.amount) !== expectedAmount
    ) {
      await supabase
        .from("payments")
        .update({
          state: "failure",
          status: "FAILED",
          bold_status: "AMOUNT_MISMATCH",
          gateway_reason: `Amount mismatch: got ${extracted.amount}, expected ${expectedAmount}`,
          bold_response: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("reference_id", extracted.referenceId);

      return jsonResponse(
        {
          error: `Amount tampering or mismatch: expected ${expectedAmount} COP, received ${extracted.amount}`,
        },
        400,
        corsHeaders,
      );
    }

    const mapped = mapBoldStatus(extracted.rawStatus);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        state: mapped.state,
        status: mapped.boldStatus,
        bold_status: mapped.boldStatus,
        transaction_id: extracted.transactionId ?? payment.transaction_id,
        payment_method: extracted.paymentMethod ?? payment.payment_method,
        gateway_reason: extracted.reason ?? payment.gateway_reason,
        bold_response: payload,
        updated_at: nowIso,
      })
      .eq("reference_id", extracted.referenceId);

    if (updateError) {
      return safeErrorResponse(updateError, corsHeaders, 500);
    }

    let scheduledCount = 0;

    // Schedule messages ONLY on verified SUCCESS payment
    if (mapped.state === "success" && items.length > 0) {
      const rowsToSchedule = items.map((item, idx) => {
        const rawPhone = item.recipientPhone ?? item.phoneTo ?? "";
        let normalizedPhone = rawPhone;
        try {
          normalizedPhone = normalizeColombianE164(rawPhone, false);
        } catch {
          normalizedPhone = rawPhone.trim();
        }

        const messageText = item.messageText ?? item.message ?? "";
        const senderName = item.senderName ?? item.sender ?? "";
        const itemIdempotencyKey = `${extracted.referenceId}:item:${idx}`;

        return {
          to_number: normalizedPhone,
          text: messageText,
          sender_name: senderName,
          sent: false,
          status: "pending",
          scheduled_for: resolveScheduledForIso(item.sendDate),
          payment_reference_id: extracted.referenceId,
          idempotency_key: itemIdempotencyKey,
        };
      });

      const { error: scheduleError } = await supabase
        .from("scheduled_messages")
        .upsert(rowsToSchedule, {
          onConflict: "idempotency_key",
          ignoreDuplicates: true,
        });

      if (scheduleError) {
        console.error("[bold-webhook] Failed to upsert scheduled_messages:", scheduleError);
        return safeErrorResponse(scheduleError, corsHeaders, 500);
      }

      scheduledCount = rowsToSchedule.length;
    }

    return jsonResponse(
      {
        ok: true,
        referenceId: extracted.referenceId,
        state: mapped.state,
        boldStatus: mapped.boldStatus,
        scheduledCount,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
