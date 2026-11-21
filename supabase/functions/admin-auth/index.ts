import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import {
  createServiceClient,
  requireBearerSecret,
  timingSafeEqual,
} from "../_shared/auth.ts";
import {
  buildSessionCookie,
  signAdminSession,
  verifyAdminSession,
  SESSION_TTL_SECONDS,
  type VerifiedAdminUser,
} from "../_shared/admin-session.ts";
import { checkUpstashRateLimit, getClientIp } from "../_shared/rate-limit.ts";
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
    "x-bootstrap-secret",
  ],
};

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().trim().email("Email inválido").max(254),
  password: z.string().min(1, "Contraseña requerida").max(256),
});

const logoutSchema = z.object({
  action: z.literal("logout"),
});

const verifySchema = z.object({
  action: z.literal("verify"),
});

const createSchema = z.object({
  action: z.literal("create"),
  email: z.string().trim().email("Email inválido").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(256),
  name: z.string().trim().min(1).max(120).optional(),
  bootstrapSecret: z.string().min(1).max(512).optional(),
});

const changePasswordSchema = z.object({
  action: z.literal("change-password"),
  currentPassword: z.string().min(1, "Contraseña actual requerida").max(256),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(256),
});

const adminAuthPayloadSchema = z.discriminatedUnion("action", [
  loginSchema,
  logoutSchema,
  verifySchema,
  createSchema,
  changePasswordSchema,
]);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const hashArray = new Uint8Array(derivedBits);
  return `pbkdf2_sha256$100000$${btoa(String.fromCharCode(...salt))}$${btoa(String.fromCharCode(...hashArray))}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    if (Number.isNaN(iterations) || iterations < 10000 || iterations > 1000000) {
      return false;
    }
    const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
    const storedHashBytes = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    const derivedArray = new Uint8Array(derivedBits);
    if (derivedArray.length !== storedHashBytes.length) return false;
    let diff = 0;
    for (let i = 0; i < derivedArray.length; i++) {
      diff |= derivedArray[i] ^ storedHashBytes[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

function isAuthorizedAdminCreate(req: Request, bodyBootstrapSecret?: string): boolean {
  if (requireBearerSecret(req, ["ADMIN_BOOTSTRAP_SECRET"])) {
    return true;
  }
  const configuredSecret = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
  if (!configuredSecret || configuredSecret.trim().length === 0) {
    return false;
  }
  const headerSecret = req.headers.get("x-bootstrap-secret")?.trim();
  if (headerSecret && timingSafeEqual(headerSecret, configuredSecret)) {
    return true;
  }
  if (bodyBootstrapSecret && timingSafeEqual(bodyBootstrapSecret.trim(), configuredSecret)) {
    return true;
  }
  return false;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, CORS_OPTIONS);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, CORS_OPTIONS);

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

    const parsed = adminAuthPayloadSchema.safeParse(rawBody);
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
    const adminSupabase = createServiceClient();

    switch (payload.action) {
      case "login": {
        const clientIp = getClientIp(req);
        const normalizedEmail = payload.email.toLowerCase();
        const rateLimit = await checkUpstashRateLimit(
          `rl:admin-login:${clientIp}:${normalizedEmail}`,
          5,
          60,
        );

        if (!rateLimit.allowed) {
          return jsonResponse(
            { error: "Demasiados intentos de inicio de sesión. Intenta en 1 minuto." },
            429,
            corsHeaders,
          );
        }

        const { data: admin, error } = await adminSupabase
          .from("admin_users")
          .select("id, email, password_hash, name")
          .eq("email", normalizedEmail)
          .single();

        if (error || !admin) {
          return jsonResponse({ error: "Credenciales inválidas" }, 401, corsHeaders);
        }

        const valid = await verifyPassword(payload.password, admin.password_hash);
        if (!valid) {
          return jsonResponse({ error: "Credenciales inválidas" }, 401, corsHeaders);
        }

        const user: VerifiedAdminUser = {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        };
        const signedToken = await signAdminSession(user);

        return jsonResponse({ user, token: signedToken }, 200, {
          ...corsHeaders,
          "Set-Cookie": buildSessionCookie(signedToken, SESSION_TTL_SECONDS),
        });
      }

      case "logout": {
        return jsonResponse({ success: true }, 200, {
          ...corsHeaders,
          "Set-Cookie": buildSessionCookie("", 0),
        });
      }

      case "verify": {
        const user = await verifyAdminSession(req, adminSupabase);
        if (!user) {
          return jsonResponse({ user: null, error: "No autenticado" }, 401, {
            ...corsHeaders,
            "Set-Cookie": buildSessionCookie("", 0),
          });
        }
        return jsonResponse({ user }, 200, corsHeaders);
      }

      case "create": {
        const hasBootstrapSecret = isAuthorizedAdminCreate(req, payload.bootstrapSecret);
        const existingAdmin = hasBootstrapSecret
          ? null
          : await verifyAdminSession(req, adminSupabase);

        if (!hasBootstrapSecret && !existingAdmin) {
          return jsonResponse(
            { error: "No autorizado para crear administradores" },
            403,
            corsHeaders,
          );
        }

        const passwordHash = await hashPassword(payload.password);
        const { data, error } = await adminSupabase
          .from("admin_users")
          .insert({
            email: payload.email.toLowerCase(),
            password_hash: passwordHash,
            name: payload.name ?? "Admin",
          })
          .select("id, email, name")
          .single();

        if (error) {
          if (error.code === "23505") {
            return jsonResponse({ error: "Email ya registrado" }, 409, corsHeaders);
          }
          throw error;
        }

        return jsonResponse({ user: data }, 201, corsHeaders);
      }

      case "change-password": {
        const verifiedUser = await verifyAdminSession(req, adminSupabase);
        if (!verifiedUser) {
          return jsonResponse({ error: "Sesión inválida o no autenticada" }, 401, {
            ...corsHeaders,
            "Set-Cookie": buildSessionCookie("", 0),
          });
        }

        const { data: admin, error } = await adminSupabase
          .from("admin_users")
          .select("id, password_hash")
          .eq("id", verifiedUser.id)
          .single();

        if (error || !admin) {
          return jsonResponse({ error: "Usuario no encontrado" }, 404, corsHeaders);
        }

        const valid = await verifyPassword(payload.currentPassword, admin.password_hash);
        if (!valid) {
          return jsonResponse({ error: "Contraseña actual incorrecta" }, 401, corsHeaders);
        }

        const newHash = await hashPassword(payload.newPassword);
        const passwordChangedAt = new Date().toISOString();
        const { error: updError } = await adminSupabase
          .from("admin_users")
          .update({
            password_hash: newHash,
            password_changed_at: passwordChangedAt,
          })
          .eq("id", verifiedUser.id);

        if (updError) {
          console.error("[admin-auth] Error actualizando password:", updError);
          return jsonResponse({ error: "Error actualizando contraseña" }, 500, corsHeaders);
        }

        const updatedUser: VerifiedAdminUser = {
          ...verifiedUser,
          password_changed_at: passwordChangedAt,
        };
        const signedToken = await signAdminSession(updatedUser);
        return jsonResponse({ success: true, user: updatedUser, token: signedToken }, 200, {
          ...corsHeaders,
          "Set-Cookie": buildSessionCookie(signedToken, SESSION_TTL_SECONDS),
        });
      }
    }
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
