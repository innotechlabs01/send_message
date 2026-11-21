import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createServiceClient, verifyHmacSha256Hex } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsPreflight, type CorsOptions } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";

const ADMIN_SESSION_COOKIE = "admin_session";

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

interface SessionTokenPayload {
  id: string;
  email: string;
  name: string | null;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = Deno.env.get("ADMIN_SESSION_SECRET");
  if (!secret || secret.trim().length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 16 characters");
  }
  return secret;
}

function extractRawSessionToken(req: Request): string | null {
  const headerToken = req.headers.get("x-admin-token")?.trim();
  if (headerToken) {
    return headerToken;
  }
  const cookie = req.headers.get("cookie") ?? req.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`));
  return match ? match[1].trim() : null;
}

async function verifyAdminSession(
  req: Request,
  adminSupabase: SupabaseClient,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const rawToken = extractRawSessionToken(req);
  if (!rawToken) return null;

  const parts = rawToken.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signatureHex] = parts;
  if (!payloadB64 || !signatureHex) return null;

  const secret = getSessionSecret();
  const validSig = await verifyHmacSha256Hex(secret, payloadB64, signatureHex);
  if (!validSig) return null;

  try {
    const decoded = JSON.parse(atob(payloadB64)) as Partial<SessionTokenPayload>;
    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.exp !== "number" ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }

    const { data: admin, error } = await adminSupabase
      .from("admin_users")
      .select("id, email, name")
      .eq("id", decoded.id)
      .single();

    if (error || !admin) {
      return null;
    }

    return { id: admin.id, email: admin.email, name: admin.name };
  } catch {
    return null;
  }
}

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
        if (!sortOrder) {
          const { data: existing } = await adminSupabase
            .from("predefined_messages")
            .select("sort_order")
            .eq("category_id", payload.category_id)
            .order("sort_order", { ascending: false })
            .limit(1);

          const maxOrder = existing && existing.length > 0 ? Number(existing[0].sort_order) : 0;
          sortOrder = maxOrder + 1;
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

        if (error) throw error;
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

        if (error) throw error;
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
