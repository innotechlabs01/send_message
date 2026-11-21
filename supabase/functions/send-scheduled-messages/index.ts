import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient, requireBearerSecret } from "../_shared/auth.ts";
import { normalizeColombianE164, sendTwilioMessage } from "../_shared/twilio.ts";

interface ScheduledMessageRow {
  id: string;
  to_number: string;
  text: string | null;
  sender_name: string | null;
  sent: boolean;
  sent_at: string | null;
  scheduled_for?: string | null;
  payment_reference_id?: string | null;
  idempotency_key?: string | null;
  status?: string;
  attempts?: number;
  max_attempts?: number;
  next_retry_at?: string | null;
  locked_at?: string | null;
  last_error?: string | null;
}

const DEFAULT_BATCH_SIZE = 20;
const BASE_BACKOFF_SECONDS = 300; // 5 minutes base exponential backoff

function resolveStatusCallbackUrl(): string | undefined {
  const explicit = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl && supabaseUrl.trim().length > 0) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twilio-webhook`;
  }
  return undefined;
}

export function computeRetryState(
  currentAttempts: number,
  maxAttempts: number,
  nowMs = Date.now(),
): {
  attempts: number;
  status: "failed" | "dead_letter";
  nextRetryAt: string | null;
} {
  const attempts = currentAttempts + 1;
  if (attempts >= maxAttempts) {
    return {
      attempts,
      status: "dead_letter",
      nextRetryAt: null,
    };
  }
  const delaySeconds = BASE_BACKOFF_SECONDS * Math.pow(2, attempts - 1);
  return {
    attempts,
    status: "failed",
    nextRetryAt: new Date(nowMs + delaySeconds * 1000).toISOString(),
  };
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  if (!requireBearerSecret(req, ["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"])) {
    return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
  }

  try {
    let batchSize = DEFAULT_BATCH_SIZE;
    try {
      const body = await req.json();
      if (typeof body?.batchSize === "number" && body.batchSize > 0 && body.batchSize <= 100) {
        batchSize = Math.floor(body.batchSize);
      }
    } catch {
      // Empty or non-JSON body allowed for cron invocations
    }

    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER is required in environment");
    }

    const supabase = createServiceClient();
    const statusCallbackUrl = resolveStatusCallbackUrl();

    // Claim due messages via atomic FOR UPDATE SKIP LOCKED RPC
    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_due_scheduled_messages",
      { batch_size: batchSize },
    );

    if (claimError) {
      throw claimError;
    }

    const messages = (claimed ?? []) as ScheduledMessageRow[];
    let sentCount = 0;
    let failedCount = 0;
    let deadLetterCount = 0;

    const isWhatsappFrom = fromNumber.toLowerCase().startsWith("whatsapp:");

    for (const msg of messages) {
      const currentAttempts = typeof msg.attempts === "number" ? msg.attempts : 0;
      const maxAttempts = typeof msg.max_attempts === "number" && msg.max_attempts > 0
        ? msg.max_attempts
        : 3;

      let formattedTo = msg.to_number;
      try {
        const useWhatsapp =
          isWhatsappFrom || msg.to_number.toLowerCase().startsWith("whatsapp:");
        formattedTo = normalizeColombianE164(msg.to_number, useWhatsapp);
        const formattedFrom = isWhatsappFrom
          ? fromNumber
          : useWhatsapp
            ? `whatsapp:${fromNumber}`
            : fromNumber;

        const sender = msg.sender_name ? `${msg.sender_name} (${formattedFrom})` : formattedFrom;
        const body = `${msg.text ?? ""}\n\nEnviado por: ${sender}`.trim();

        const twilioRes = await sendTwilioMessage({
          to: formattedTo,
          from: formattedFrom,
          body,
          statusCallbackUrl,
        });

        const sentAtIso = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("scheduled_messages")
          .update({
            sent: true,
            sent_at: sentAtIso,
            status: "sent",
            attempts: currentAttempts + 1,
            locked_at: null,
            next_retry_at: null,
            last_error: null,
          })
          .eq("id", msg.id);

        if (updateErr) {
          console.error("[send-scheduled-messages] Failed to update sent state:", updateErr);
        }

        const { error: logErr } = await supabase.from("whatsapp_logs").insert({
          recipient: formattedTo,
          provider: "twilio",
          template_name: null,
          wa_message_id: twilioRes.sid ?? null,
          status: "sent",
          provider_status: twilioRes.status ?? "queued",
          scheduled_message_id: msg.id,
          payment_reference_id: msg.payment_reference_id ?? null,
        });

        if (logErr) {
          console.error("[send-scheduled-messages] Failed to log sent message:", logErr);
        }

        sentCount += 1;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const codeMatch = errMsg.match(/\(code:\s*(\d+)\)/);
        const errorCode = codeMatch ? codeMatch[1] : "SEND_FAILED";

        const retryState = computeRetryState(currentAttempts, maxAttempts);
        if (retryState.status === "dead_letter") {
          deadLetterCount += 1;
        } else {
          failedCount += 1;
        }

        const { error: updateErr } = await supabase
          .from("scheduled_messages")
          .update({
            sent: false,
            status: retryState.status,
            attempts: retryState.attempts,
            next_retry_at: retryState.nextRetryAt,
            locked_at: null,
            last_error: errMsg.slice(0, 500),
          })
          .eq("id", msg.id);

        if (updateErr) {
          console.error("[send-scheduled-messages] Failed to update retry state:", updateErr);
        }

        const { error: logErr } = await supabase.from("whatsapp_logs").insert({
          recipient: formattedTo,
          provider: "twilio",
          template_name: null,
          wa_message_id: null,
          status: "failed",
          provider_status: retryState.status,
          error_code: errorCode,
          error_message: errMsg.slice(0, 500),
          scheduled_message_id: msg.id,
          payment_reference_id: msg.payment_reference_id ?? null,
        });

        if (logErr) {
          console.error("[send-scheduled-messages] Failed to log failed message:", logErr);
        }
      }
    }

    return jsonResponse(
      {
        ok: true,
        claimed: messages.length,
        sent: sentCount,
        failed: failedCount,
        dead_letter: deadLetterCount,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
