// Generate AI message suggestions for special occasions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, recipient, sender, tone, seed } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");

    const sys = `Eres un escritor experto en mensajes especiales y emotivos en español. Generas mensajes breves (máximo 3 frases), originales, con sentimiento genuino y modernos —nada cursi ni cliché. Evita rimas obvias.`;
    const usr = `Genera 5 mensajes únicos para la ocasión: "${category}".
${recipient ? `Destinatario: ${recipient}.` : ""}
${sender ? `De parte de: ${sender}.` : ""}
${tone ? `Tono: ${tone}.` : "Tono: cálido y especial."}
Variación: ${seed ?? Math.random()}.
Devuelve exclusivamente el JSON con la herramienta suggest_messages.`;

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_messages",
            description: "Devuelve 5 mensajes especiales.",
            parameters: {
              type: "object",
              properties: {
                messages: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 5,
                  maxItems: 5,
                },
              },
              required: ["messages"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_messages" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Se requieren créditos en Groq." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("Groq API error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Error generando mensajes" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { messages: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
