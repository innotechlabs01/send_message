import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/auth.ts";

const confirmPaymentSchema = z.object({
  referenceId: z.string().trim().min(3, "referenceId is required").max(120),
});

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, corsHeaders);
  }

  try {
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

    // Strictly sanitized response — no PII (customer name/email/phone or message content)
    return jsonResponse(
      {
        referenceId: payment.reference_id,
        status: payment.bold_status ?? payment.status ?? "PENDING",
        state: payment.state ?? "pending",
        boldStatus: payment.bold_status ?? payment.status ?? "PENDING",
        amount: Number(payment.expected_amount_cop ?? payment.amount ?? 0),
        currency: payment.currency ?? "COP",
        reason: payment.gateway_reason ?? undefined,
        updatedAt: payment.updated_at,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
