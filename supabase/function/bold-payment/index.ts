// Bold Colombia payment integration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOLD_API_URL = "https://api.online.payments.bold.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BOLD_API_KEY = Deno.env.get("BOLD_API_KEY");
    if (!BOLD_API_KEY) throw new Error("BOLD_API_KEY no configurada");

    const { action, ...data } = await req.json();

    if (action === "create-payment-intent") {
      // Create payment intent
      const response = await fetch(`${BOLD_API_URL}/v1/payment-intent`, {
        method: "POST",
        headers: {
          "Authorization": `x-api-key ${BOLD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference_id: data.referenceId,
          amount: {
            currency: "COP",
            total_amount: data.amount,
          },
          description: data.description || "Mensaje programado ConSentido",
          callback_url: data.callbackUrl,
          customer: data.customer || {},
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Bold API error:", response.status, result);
        return new Response(JSON.stringify({ error: result.message || "Error creando intención de pago" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "process-payment") {
      // Process payment with card
      const response = await fetch(`${BOLD_API_URL}/v1/payment`, {
        method: "POST",
        headers: {
          "Authorization": `x-api-key ${BOLD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference_id: data.referenceId,
          payer: data.payer,
          payment_method: data.paymentMethod,
          device_fingerprint: data.deviceFingerprint || {},
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Bold payment error:", response.status, result);
        return new Response(JSON.stringify({ error: result.message || "Error procesando pago" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-payment-status") {
      // Get payment status
      const response = await fetch(`${BOLD_API_URL}/v1/payment/${data.referenceId}`, {
        method: "GET",
        headers: {
          "Authorization": `x-api-key ${BOLD_API_KEY}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Bold status error:", response.status, result);
        return new Response(JSON.stringify({ error: result.message || "Error consultando estado" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-pse-banks") {
      // Get PSE banks list
      const response = await fetch(`${BOLD_API_URL}/v1/payment/pse/banks`, {
        method: "GET",
        headers: {
          "Authorization": `x-api-key ${BOLD_API_KEY}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Bold banks error:", response.status, result);
        return new Response(JSON.stringify({ error: result.message || "Error obteniendo bancos" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
