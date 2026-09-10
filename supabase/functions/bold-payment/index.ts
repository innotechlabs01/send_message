// Bold Colombia payment integration with database persistence
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOLD_API_URL = "https://api.online.payments.bold.co";

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase credentials not configured");
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BOLD_API_KEY = Deno.env.get("BOLD_API_KEY");
    if (!BOLD_API_KEY) throw new Error("BOLD_API_KEY no configurada");

    const { action, ...data } = await req.json();
    const supabase = getSupabaseAdmin();

    if (action === "create-payment-intent") {
      // Save message to database first
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          category_id: data.categoryId,
          message_text: data.messageText,
          recipient_name: data.recipientName,
          recipient_phone: data.recipientPhone,
          sender_name: data.senderName,
          sender_phone: data.senderPhone,
          send_date: data.sendDate,
          status: "pending",
        })
        .select()
        .single();

      if (messageError) {
        console.error("Error saving message:", messageError);
        throw new Error("Error guardando el mensaje");
      }

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
        // Update message status to failed
        await supabase
          .from("messages")
          .update({ status: "cancelled" })
          .eq("id", message.id);
        return new Response(JSON.stringify({ error: result.message || "Error creando intención de pago" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          message_id: message.id,
          reference_id: data.referenceId,
          amount: data.amount,
          currency: "COP",
          status: "pending",
          payment_method: data.paymentMethod || "pending",
        });

      if (paymentError) {
        console.error("Error saving payment:", paymentError);
      }

      // Update message with payment reference
      await supabase
        .from("messages")
        .update({ payment_reference: data.referenceId })
        .eq("id", message.id);

      return new Response(JSON.stringify({ ...result, messageId: message.id }), {
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

      // Update payment status
      await supabase
        .from("payments")
        .update({
          transaction_id: result.payload?.transaction_id,
          status: "pending",
          bold_response: result,
        })
        .eq("reference_id", data.referenceId);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm-payment") {
      // Confirm payment and update database
      const { referenceId, status, transactionId } = data;

      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*, messages(*)")
        .eq("reference_id", referenceId)
        .single();

      if (paymentError || !payment) {
        return new Response(JSON.stringify({ error: "Pago no encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment status
      await supabase
        .from("payments")
        .update({
          status: status,
          transaction_id: transactionId || payment.transaction_id,
        })
        .eq("id", payment.id);

      // Update message status based on payment
      if (status === "approved") {
        await supabase
          .from("messages")
          .update({ status: "paid" })
          .eq("id", payment.message_id);

        // Send SMS via Twilio
        const twilioResult = await sendSMS(
          payment.messages.recipient_phone,
          payment.messages.sender_name,
          payment.messages.message_text,
          payment.messages.category_id
        );

        if (twilioResult.success) {
          await supabase
            .from("messages")
            .update({ status: "sent" })
            .eq("id", payment.message_id);
        }

        return new Response(JSON.stringify({ success: true, message: "Pago confirmado y mensaje enviado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        await supabase
          .from("messages")
          .update({ status: "pending" })
          .eq("id", payment.message_id);

        return new Response(JSON.stringify({ success: true, message: "Pago en proceso" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

// Send SMS via Twilio
async function sendSMS(
  recipientPhone: string,
  senderName: string,
  messageText: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Twilio credentials not configured");
      return { success: false, error: "Twilio not configured" };
    }

    // Format the message
    const formattedMessage = `¡Hola ${recipientPhone}! ${senderName} te envió un mensaje especial de ConSentido:\n\n"${messageText}"\n\nCon cariño, ConSentido 💝`;

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipientPhone,
        From: twilioPhoneNumber,
        Body: formattedMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: String(error) };
  }
}
