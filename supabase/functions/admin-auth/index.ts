import { z } from "https://deno.land/x/zod@v3.24.2/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createServiceClient,
  requireBearerSecret,
  signHmacSha256Hex,
  timingSafeEqual,
  verifyHmacSha256Hex,
} from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsPreflight, type CorsOptions } from "../_shared/cors.ts";
import { jsonResponse, safeErrorResponse } from "../_shared/http.ts";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 86400;

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

interface SessionTokenPayload {
  id: string;
  email: string;
  name: string | null;
  iat: number;
  exp: number;
}

export interface VerifiedAdminUser {
  id: string;
  email: string;
  name: string | null;
}

function getSessionSecret(): string {
  const secret = Deno.env.get("ADMIN_SESSION_SECRET");
  if (!secret || secret.trim().length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 16 characters");
  }
  return secret;
}

async function createSignedSessionToken(user: VerifiedAdminUser): Promise<string> {
  const secret = getSessionSecret();
  const now = Date.now();
  const payload: SessionTokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
  };
  const payloadB64 = btoa(JSON.stringify(payload));
  const signatureHex = await signHmacSha256Hex(secret, payloadB64);
  return `${payloadB64}.${signatureHex}`;
}

function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
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

async function verifySessionToken(
  req: Request,
  adminSupabase: SupabaseClient,
): Promise<VerifiedAdminUser | null> {
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
      typeof decoded.exp !== "number"
    ) {
      return null;
    }

    if (decoded.exp <= Date.now()) {
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

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  } catch {
    return null;
  }
}

async function checkUpstashRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL")?.trim();
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN")?.trim();
  if (!redisUrl || !redisToken) {
    return { allowed: true, remaining: maxRequests };
  }

  try {
    const cleanUrl = redisUrl.replace(/\/+$/, "");
    const resp = await fetch(`${cleanUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
      ]),
    });

    if (!resp.ok) {
      console.warn("[RateLimit] Upstash responded with status", resp.status);
      return { allowed: true, remaining: maxRequests };
    }

    const results = (await resp.json()) as Array<{ result?: number }>;
    const count = Number(results?.[0]?.result ?? 1);
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch (err) {
    console.warn("[RateLimit] Upstash check failed, failing open:", err);
    return { allowed: true, remaining: maxRequests };
  }
}

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
        const clientIp =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("cf-connecting-ip") ||
          "unknown";
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
        const signedToken = await createSignedSessionToken(user);

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
        const user = await verifySessionToken(req, adminSupabase);
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
          : await verifySessionToken(req, adminSupabase);

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
        const verifiedUser = await verifySessionToken(req, adminSupabase);
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
        const { error: updError } = await adminSupabase
          .from("admin_users")
          .update({ password_hash: newHash })
          .eq("id", verifiedUser.id);

        if (updError) {
          console.error("[admin-auth] Error actualizando password:", updError);
          return jsonResponse({ error: "Error actualizando contraseña" }, 500, corsHeaders);
        }

        const signedToken = await createSignedSessionToken(verifiedUser);
        return jsonResponse({ success: true, user: verifiedUser, token: signedToken }, 200, {
          ...corsHeaders,
          "Set-Cookie": buildSessionCookie(signedToken, SESSION_TTL_SECONDS),
        });
      }
    }
  } catch (err) {
    return safeErrorResponse(err, corsHeaders, 500);
  }
});
