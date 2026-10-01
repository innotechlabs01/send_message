// Get predefined messages from database with pagination
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, offset = 0, limit = 5 } = await req.json();

    if (!category) {
      return new Response(JSON.stringify({ error: "Categoría requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validCategories = ['cumpleanos', 'graduacion', 'aniversario', 'luto', 'amor'];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: "Categoría inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Variables de entorno Supabase no configuradas");
    }

    // Obtener total de mensajes para la categoría
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/predefined_messages?category_id=eq.${category}&select=count`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "count=exact",
        },
      }
    );

    if (!countResp.ok) {
      const err = await countResp.text();
      throw new Error(`Error counting messages: ${err}`);
    }

    const total = parseInt(countResp.headers.get("content-range")?.split("/")[1] || "0");

    // Obtener página de mensajes
    const messagesResp = await fetch(
      `${SUPABASE_URL}/rest/v1/predefined_messages?category_id=eq.${category}&order=sort_order.asc&limit=${limit}&offset=${offset}&select=message_text`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!messagesResp.ok) {
      const err = await messagesResp.text();
      throw new Error(`Error fetching messages: ${err}`);
    }

    const data = await messagesResp.json();
    const messages = data.map((row: { message_text: string }) => row.message_text);
    const hasMore = offset + limit < total;

    return new Response(
      JSON.stringify({
        messages,
        hasMore,
        total,
        offset,
        limit,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});