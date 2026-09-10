// Confirm payment and send SMS via Twilio
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase credentials not configured");
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { referenceId, status, transactionId } = await req.json();
    const supabase = getSupabaseAdmin();

    // Get payment record with message
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

    // If payment approved, send SMS
    if (status === "approved") {
      // Update message status
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

        return new Response(JSON.stringify({
          success: true,
          message: "Pago confirmado y mensaje enviado",
          smsStatus: "sent",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({
          success: true,
          message: "Pago confirmado pero error enviando SMS",
          smsStatus: "failed",
          smsError: twilioResult.error,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Payment not approved, keep message as pending
      return new Response(JSON.stringify({
        success: true,
        message: "Pago en proceso",
        status: status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    // Format the message based on category
    const categoryMessages: Record<string, string> = {
      cumpleanos: "🎂",
      graduacion: "🎓",
      aniversario: "💕",
      boda: "💍",
      nacimiento: "👶",
      amistad: "✨",
    };

    const emoji = categoryMessages[categoryId] || "💝";
    const formattedMessage = `${emoji} ¡Hola! ${senderName} te envió un mensaje especial de ConSentido:\n\n"${messageText}"\n\nCon cariño, ConSentido 💝`;

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
