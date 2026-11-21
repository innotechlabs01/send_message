import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signHmacSha256Hex, verifyHmacSha256Hex } from "./auth.ts";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 86400;

export interface VerifiedAdminUser {
  id: string;
  email: string;
  name: string | null;
  password_changed_at?: string | null;
}

export interface SessionTokenPayload {
  id: string;
  email: string;
  name: string | null;
  iat: number;
  exp: number;
}

/**
 * UTF-8 safe base64url encode.
 */
export function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * UTF-8 safe base64url decode.
 */
export function decodeBase64Url(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Aliases for compatibility
export const base64UrlEncode = encodeBase64Url;
export const base64UrlDecode = decodeBase64Url;

export function getSessionSecret(customSecret?: string): string {
  const secret = customSecret ?? Deno.env.get("ADMIN_SESSION_SECRET");
  if (!secret || secret.trim().length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 16 characters");
  }
  return secret;
}

export function buildSessionCookie(token: string, maxAgeSeconds: number = SESSION_TTL_SECONDS): string {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function extractRawSessionToken(req: Request): string | null {
  const headerToken = req.headers.get("x-admin-token")?.trim();
  if (headerToken) {
    return headerToken;
  }

  const cookie = req.headers.get("cookie") ?? req.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`));
  if (match) {
    return match[1].trim();
  }

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && bearerMatch[1].trim().includes(".")) {
      return bearerMatch[1].trim();
    }
  }

  return null;
}

export async function signAdminSession(
  user: { id: string; email: string; name?: string | null },
  optionsOrSecret?: { secret?: string; ttlSeconds?: number } | string,
  ttlOverride?: number,
): Promise<string> {
  let secret: string;
  let ttl = SESSION_TTL_SECONDS;

  if (typeof optionsOrSecret === "string") {
    secret = getSessionSecret(optionsOrSecret);
    if (typeof ttlOverride === "number") {
      ttl = ttlOverride;
    }
  } else {
    secret = getSessionSecret(optionsOrSecret?.secret);
    if (typeof optionsOrSecret?.ttlSeconds === "number") {
      ttl = optionsOrSecret.ttlSeconds;
    }
  }

  const now = Date.now();
  const payload: SessionTokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    iat: now,
    exp: now + ttl * 1000,
  };

  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const signatureHex = await signHmacSha256Hex(secret, payloadB64);
  return `${payloadB64}.${signatureHex}`;
}

/**
 * Validates HMAC signature and payload expiration without database lookup.
 */
export async function verifySessionTokenPayload(
  rawToken: string,
  customSecret?: string,
): Promise<SessionTokenPayload | null> {
  const parts = rawToken.split(".");
  if (parts.length !== 2) return null;

  const [payloadPart, signatureHex] = parts;
  if (!payloadPart || !signatureHex) return null;

  const secret = getSessionSecret(customSecret);
  const validSig = await verifyHmacSha256Hex(secret, payloadPart, signatureHex);
  if (!validSig) return null;

  try {
    let jsonStr: string;
    try {
      jsonStr = decodeBase64Url(payloadPart);
    } catch {
      jsonStr = atob(payloadPart);
    }

    const decoded = JSON.parse(jsonStr) as Partial<SessionTokenPayload>;
    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.exp !== "number" ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name ?? null,
      iat: typeof decoded.iat === "number" ? decoded.iat : 0,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies admin session from Request or raw token string against HMAC signature and database.
 * If password_changed_at is present on the admin record, revokes tokens issued prior to that timestamp.
 */
export async function verifyAdminSession(
  reqOrToken: Request | string,
  adminSupabase: SupabaseClient,
  customSecret?: string,
): Promise<VerifiedAdminUser | null> {
  const rawToken = typeof reqOrToken === "string" ? reqOrToken : extractRawSessionToken(reqOrToken);
  if (!rawToken) return null;

  const payload = await verifySessionTokenPayload(rawToken, customSecret);
  if (!payload) return null;

  try {
    // Try selecting with password_changed_at
    const { data: admin, error } = await adminSupabase
      .from("admin_users")
      .select("id, email, name, password_changed_at")
      .eq("id", payload.id)
      .single();

    if (error || !admin) {
      // If error might be due to missing password_changed_at column before migration, fallback
      const { data: fallbackAdmin, error: fallbackError } = await adminSupabase
        .from("admin_users")
        .select("id, email, name")
        .eq("id", payload.id)
        .single();

      if (fallbackError || !fallbackAdmin) {
        return null;
      }

      return {
        id: fallbackAdmin.id,
        email: fallbackAdmin.email,
        name: fallbackAdmin.name,
      };
    }

    // Check if password was changed after token issuance
    if (admin.password_changed_at) {
      const passwordChangedAtMs = new Date(admin.password_changed_at).getTime();
      if (!Number.isNaN(passwordChangedAtMs) && payload.iat < passwordChangedAtMs) {
        return null;
      }
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      password_changed_at: admin.password_changed_at ?? null,
    };
  } catch {
    return null;
  }
}
