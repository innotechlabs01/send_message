import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient, requireBearerSecret } from "../_shared/auth.ts";
import { normalizeColombianE164, sendTwilioMessage } from "../_shared/twilio.ts";

const sendWhatsappSchema = z.object({
  to: z.string().trim().min(7, "to requerido").max(32),
  text: z.string().trim().max(2000).optional().default(""),
  senderName: z.string().trim().max(120).optional(),
  senderNumber: z.string().trim().max(32).optional(),
  template: z
    .object({
      name: z.string().trim().max(120).optional(),
    })
    .optional(),
  scheduledMessageId: z.string().uuid().optional(),
  paymentReferenceId: z.string().trim().max(120).optional(),
});

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
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    const parsed = sendWhatsappSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
        400,
        corsHeaders,
      );
    }

    const { to, template, text, senderName, senderNumber, scheduledMessageId, paymentReferenceId } =
      parsed.data;

    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? senderNumber;
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER is not configured");
    }

    const isWhatsappChannel =
      fromNumber.toLowerCase().startsWith("whatsapp:") || to.toLowerCase().startsWith("whatsapp:");
    const formattedTo = normalizeColombianE164(to, isWhatsappChannel);
    const formattedFrom = fromNumber.toLowerCase().startsWith("whatsapp:")
      ? fromNumber
      : isWhatsappChannel
        ? `whatsapp:${fromNumber}`
        : fromNumber;

    const sender = senderName ? `${senderName} (${formattedFrom})` : formattedFrom;
    const messageBody = `${text ?? ""}\n\nEnviado por: ${sender}`.trim();
    const statusCallbackUrl = resolveStatusCallbackUrl();

    const supabase = createServiceClient();

    try {
      const data = await sendTwilioMessage({
        to: formattedTo,
        from: formattedFrom,
        body: messageBody,
        statusCallbackUrl,
      });

      const { error: logErr } = await supabase.from("whatsapp_logs").insert({
        recipient: formattedTo,
        provider: "twilio",
        template_name: template?.name ?? null,
        wa_message_id: data.sid ?? null,
        status: "sent",
        provider_status: data.status ?? "queued",
        scheduled_message_id: scheduledMessageId ?? null,
        payment_reference_id: paymentReferenceId ?? null,
      });

      if (logErr) {
        console.error("[send-whatsapp] Failed to insert whatsapp_logs success row:", logErr);
      }

      return jsonResponse({ ok: true, result: { sid: data.sid, status: data.status } }, 200, corsHeaders);
    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      const codeMatch = errMsg.match(/\(code:\s*(\d+)\)/);
      const errorCode = codeMatch ? codeMatch[1] : "TWILIO_SEND_ERROR";

      const { error: logErr } = await supabase.from("whatsapp_logs").insert({
        recipient: formattedTo,
        provider: "twilio",
        template_name: template?.name ?? null,
        wa_message_id: null,
        status: "failed",
        provider_status: "failed",
        error_code: errorCode,
        error_message: errMsg.slice(0, 500),
        scheduled_message_id: scheduledMessageId ?? null,
        payment_reference_id: paymentReferenceId ?? null,
      });

      if (logErr) {
        console.error("[send-whatsapp] Failed to insert whatsapp_logs failure row:", logErr);
      }

      throw sendErr;
    }
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
