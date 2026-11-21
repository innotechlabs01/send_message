import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: pending, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("sent", false);

    if (error) throw error;

    let sentCount = 0;
    for (const msg of pending ?? []) {
      const sender = msg.sender_name ? `${msg.sender_name} (${fromNumber})` : fromNumber;
      const body = `${msg.text ?? ""}\n\nEnviado por: ${sender}`.trim();

      const params = new URLSearchParams();
      params.append("To", msg.to_number);
      params.append("From", fromNumber);
      params.append("Body", body);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Twilio send failed", data);
        continue;
      }

      await supabase
        .from("scheduled_messages")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", msg.id);

      sentCount += 1;
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
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
