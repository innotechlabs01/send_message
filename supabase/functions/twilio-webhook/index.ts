import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient, timingSafeEqual } from "../_shared/auth.ts";

/**
 * Status transition rank so out-of-order Twilio callbacks don't regress status
 * (e.g. a late 'sent' callback won't overwrite 'delivered' or 'read').
 */
const STATUS_RANK: Record<string, number> = {
  queued: 1,
  accepted: 1,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 5,
  undelivered: 5,
  canceled: 5,
};

export function normalizeTwilioStatus(rawStatus: string): string {
  const s = rawStatus.trim().toLowerCase();
  switch (s) {
    case "queued":
    case "accepted":
    case "sending":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "undelivered":
    case "canceled":
      return s === "undelivered" ? "undelivered" : "failed";
    default:
      return s || "sent";
  }
}

export function shouldAdvanceStatus(
  currentStatus: string | null | undefined,
  nextRawStatus: string,
): boolean {
  if (!currentStatus) return true;
  const currentRank = STATUS_RANK[currentStatus.toLowerCase()] ?? 0;
  const nextRank = STATUS_RANK[nextRawStatus.toLowerCase()] ?? 0;
  return nextRank >= currentRank;
}

/**
 * Computes Twilio HMAC-SHA1 Base64 signature over `url + sortedParams(key + value)`.
 */
export async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + (params[key] ?? "");
  }

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  const bytes = new Uint8Array(sigBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function verifyTwilioSignature(
  authToken: string,
  signatureHeader: string,
  candidateUrls: string[],
  params: Record<string, string>,
): Promise<boolean> {
  if (!authToken || !signatureHeader) return false;
  const expected = signatureHeader.trim();
  if (!expected) return false;

  for (const url of candidateUrls) {
    if (!url) continue;
    const computed = await computeTwilioSignature(authToken, url, params);
    if (timingSafeEqual(computed, expected)) {
      return true;
    }
  }
  return false;
}

function buildCandidateUrls(req: Request): string[] {
  const urls = new Set<string>();
  const explicit = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");
  if (explicit && explicit.trim().length > 0) {
    urls.add(explicit.trim());
  }

  const reqUrl = new URL(req.url);
  urls.add(req.url);

  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (forwardedHost) {
    urls.add(`${forwardedProto}://${forwardedHost}${reqUrl.pathname}${reqUrl.search}`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) {
    const base = supabaseUrl.replace(/\/$/, "");
    urls.add(`${base}/functions/v1/twilio-webhook${reqUrl.search}`);
  }

  return Array.from(urls);
}

if (import.meta.main) {
  Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!authToken) {
      throw new Error("TWILIO_AUTH_TOKEN is not configured");
    }

    const signatureHeader =
      req.headers.get("x-twilio-signature") ?? req.headers.get("X-Twilio-Signature") ?? "";
    if (!signatureHeader) {
      return jsonResponse({ error: "Missing X-Twilio-Signature" }, 401, corsHeaders);
    }

    const bodyText = await req.text();
    const searchParams = new URLSearchParams(bodyText);
    const params: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      params[k] = v;
    }

    const candidateUrls = buildCandidateUrls(req);
    const isValid = await verifyTwilioSignature(authToken, signatureHeader, candidateUrls, params);
    if (!isValid) {
      return jsonResponse({ error: "Invalid X-Twilio-Signature" }, 403, corsHeaders);
    }

    const messageSid = params.MessageSid || params.SmsSid || "";
    const rawStatus = params.MessageStatus || params.SmsStatus || "";
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;
    const to = params.To || "";

    if (!messageSid || !rawStatus) {
      return jsonResponse({ error: "Missing MessageSid or MessageStatus" }, 400, corsHeaders);
    }

    const normalizedStatus = normalizeTwilioStatus(rawStatus);
    const supabase = createServiceClient();

    const { data: existingLogs, error: fetchErr } = await supabase
      .from("whatsapp_logs")
      .select("id, status, provider_status, scheduled_message_id")
      .eq("wa_message_id", messageSid)
      .limit(1);

    if (fetchErr) {
      throw fetchErr;
    }

    const existing = existingLogs?.[0];
    if (existing) {
      const canAdvance = shouldAdvanceStatus(existing.provider_status ?? existing.status, rawStatus);
      const nextStatus = canAdvance ? normalizedStatus : (existing.status ?? normalizedStatus);
      const nextProviderStatus = canAdvance
        ? rawStatus.toLowerCase()
        : (existing.provider_status ?? rawStatus.toLowerCase());

      const updatePayload: Record<string, unknown> = {
        status: nextStatus,
        provider_status: nextProviderStatus,
        updated_at: new Date().toISOString(),
      };
      if (errorCode) updatePayload.error_code = errorCode;
      if (errorMessage) updatePayload.error_message = errorMessage;

      const { error: updateErr } = await supabase
        .from("whatsapp_logs")
        .update(updatePayload)
        .eq("id", existing.id);

      if (updateErr) {
        throw updateErr;
      }

      // If Twilio reports async failure/undelivered, sync scheduled_messages row
      const isTerminalFailure = normalizedStatus === "failed" || normalizedStatus === "undelivered";
      if (isTerminalFailure && existing.scheduled_message_id) {
        const failureReason = errorMessage || (errorCode ? `Twilio error code: ${errorCode}` : `Twilio status: ${rawStatus}`);
        const { error: smUpdateErr } = await supabase
          .from("scheduled_messages")
          .update({
            status: "failed",
            last_error: failureReason.slice(0, 500),
          })
          .eq("id", existing.scheduled_message_id);

        if (smUpdateErr) {
          console.error("[twilio-webhook] Failed to update scheduled_messages for failed delivery:", smUpdateErr);
        }
      }
    } else {
      // Fallback insert if callback arrives before initial row or for external message
      const { error: insertErr } = await supabase.from("whatsapp_logs").insert({
        recipient: to || "unknown",
        provider: "twilio",
        wa_message_id: messageSid,
        status: normalizedStatus,
        provider_status: rawStatus.toLowerCase(),
        error_code: errorCode,
        error_message: errorMessage,
      });

      if (insertErr) {
        throw insertErr;
      }
    }

    return jsonResponse({ ok: true, sid: messageSid, status: normalizedStatus }, 200, corsHeaders);
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
}
