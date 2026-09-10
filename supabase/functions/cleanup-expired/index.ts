// Cleanup expired messages (older than 3 days without payment)
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
    const supabase = getSupabaseAdmin();

    // Mark messages as expired if payment not completed within 3 days
    const { data: expiredMessages, error: expireError } = await supabase
      .from("messages")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .select();

    if (expireError) {
      console.error("Error expiring messages:", expireError);
      throw expireError;
    }

    // Delete expired messages older than 1 day (after being marked expired)
    const { data: deletedMessages, error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("status", "expired")
      .lt("updated_at", new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString())
      .select();

    if (deleteError) {
      console.error("Error deleting expired messages:", deleteError);
      throw deleteError;
    }

    return new Response(JSON.stringify({
      success: true,
      expiredCount: expiredMessages?.length || 0,
      deletedCount: deletedMessages?.length || 0,
      message: `Expired ${expiredMessages?.length || 0} messages, deleted ${deletedMessages?.length || 0} old messages`,
    }), {
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
