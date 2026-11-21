import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";

const getPredefinedMessagesSchema = z.object({
  category: z.enum(["cumpleanos", "graduacion", "aniversario", "luto", "amor"], {
    errorMap: () => ({ message: "Categoría inválida" }),
  }),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405, corsHeaders);
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Cuerpo JSON inválido" }, 400, corsHeaders);
    }

    const parsed = getPredefinedMessagesSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        {
          error: parsed.error.issues[0]?.message ?? "Parámetros inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
        corsHeaders,
      );
    }

    const { category, offset, limit } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables de entorno Supabase no configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, count, error } = await supabase
      .from("predefined_messages")
      .select("message_text", { count: "exact" })
      .eq("category_id", category)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const total = count ?? 0;
    const messages = (data ?? []).map((row: { message_text: string }) => row.message_text);
    const hasMore = offset + limit < total;

    return jsonResponse(
      {
        messages,
        hasMore,
        total,
        offset,
        limit,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
