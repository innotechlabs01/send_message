import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { verifyAdminSession } from "../_shared/admin-session.ts";
import { getCorsHeaders, handleCorsPreflight, type CorsOptions } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";

const CORS_OPTIONS: CorsOptions = {
  credentials: true,
  allowedHeaders: [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-admin-token",
  ],
};

const categoryEnum = z.enum(["cumpleanos", "graduacion", "aniversario", "luto", "amor"]);

const listSchema = z.object({
  action: z.literal("list"),
  category_id: categoryEnum,
});

const createMessageSchema = z.object({
  action: z.literal("create"),
  category_id: categoryEnum,
  message_text: z.string().trim().min(1, "El mensaje no puede estar vacío").max(1000),
  sort_order: z.number().int().min(1).optional(),
});

const updateMessageSchema = z.object({
  action: z.literal("update"),
  id: z.string().uuid("ID de mensaje inválido"),
  message_text: z.string().trim().min(1, "El mensaje no puede estar vacío").max(1000),
  sort_order: z.number().int().min(1).optional(),
});

const deleteMessageSchema = z.object({
  action: z.literal("delete"),
  id: z.string().uuid("ID de mensaje inválido"),
});

const manageMessagesSchema = z.discriminatedUnion("action", [
  listSchema,
  createMessageSchema,
  updateMessageSchema,
  deleteMessageSchema,
]);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, CORS_OPTIONS);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, CORS_OPTIONS);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405, corsHeaders);
  }

  try {
    const adminSupabase = createServiceClient();
    const adminUser = await verifyAdminSession(req, adminSupabase);
    if (!adminUser) {
      return jsonResponse({ error: "No autenticado como administrador" }, 401, corsHeaders);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Cuerpo JSON inválido" }, 400, corsHeaders);
    }

    const parsed = manageMessagesSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        {
          error: parsed.error.issues[0]?.message ?? "Datos de entrada inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
        corsHeaders,
      );
    }

    const payload = parsed.data;

    switch (payload.action) {
      case "list": {
        const { data, error } = await adminSupabase
          .from("predefined_messages")
          .select("id, category_id, message_text, sort_order, created_at")
          .eq("category_id", payload.category_id)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        return jsonResponse({ messages: data ?? [] }, 200, corsHeaders);
      }

      case "create": {
        let sortOrder = payload.sort_order;
        if (typeof sortOrder !== "number") {
          const { data: maxRow, error: maxErr } = await adminSupabase
            .from("predefined_messages")
            .select("sort_order")
            .eq("category_id", payload.category_id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxErr) throw maxErr;
          sortOrder = (maxRow?.sort_order ?? 0) + 1;
        }

        const { data, error } = await adminSupabase
          .from("predefined_messages")
          .insert({
            category_id: payload.category_id,
            message_text: payload.message_text,
            sort_order: sortOrder,
          })
          .select("id, category_id, message_text, sort_order, created_at")
          .single();

        if (error) {
          if (error.code === "23505") {
            return jsonResponse(
              { error: "Conflicto de orden: ya existe un mensaje con ese orden en la categoría" },
              409,
              corsHeaders,
            );
          }
          throw error;
        }

        return jsonResponse({ message: data }, 201, corsHeaders);
      }

      case "update": {
        const updates: Record<string, unknown> = {
          message_text: payload.message_text,
        };
        if (payload.sort_order !== undefined) {
          updates.sort_order = payload.sort_order;
        }

        const { data, error } = await adminSupabase
          .from("predefined_messages")
          .update(updates)
          .eq("id", payload.id)
          .select("id, category_id, message_text, sort_order, created_at")
          .single();

        if (error) {
          if (error.code === "23505") {
            return jsonResponse(
              { error: "Conflicto de orden: ya existe un mensaje con ese orden en la categoría" },
              409,
              corsHeaders,
            );
          }
          throw error;
        }

        return jsonResponse({ message: data }, 200, corsHeaders);
      }

      case "delete": {
        const { error } = await adminSupabase
          .from("predefined_messages")
          .delete()
          .eq("id", payload.id);

        if (error) throw error;
        return jsonResponse({ success: true }, 200, corsHeaders);
      }
    }
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
