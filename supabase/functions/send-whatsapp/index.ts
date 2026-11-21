import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, template, text, senderName, senderNumber } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ error: "to requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? senderNumber;
    if (!accountSid || !authToken || !fromNumber) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_PHONE_NUMBER no configurados");

    const sender = senderName ? `${senderName} (${fromNumber})` : fromNumber;
    const messageBody = `${text ?? ""}\n\nEnviado por: ${sender}`.trim();

    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", fromNumber);
    params.append("Body", messageBody);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error("Twilio error: " + JSON.stringify(data));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("whatsapp_logs").insert({
        recipient: to,
        provider: "twilio",
        template_name: template?.name ?? null,
        wa_message_id: data?.sid ?? null,
        status: "sent",
      });
    }

    return new Response(JSON.stringify({ ok: true, result: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});