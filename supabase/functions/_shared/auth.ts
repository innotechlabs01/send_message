import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);

  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Validates `Authorization: Bearer <token>` against a list of environment variable names.
 * Uses constant-time comparison against each non-empty secret in envVarNames.
 */
export function requireBearerSecret(req: Request, envVarNames: string[]): boolean {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) {
    return false;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }

  const token = match[1].trim();
  if (!token) {
    return false;
  }

  let authorized = false;
  for (const name of envVarNames) {
    const secret = Deno.env.get(name);
    if (secret && secret.length > 0) {
      if (timingSafeEqual(token, secret)) {
        authorized = true;
      }
    }
  }

  return authorized;
}

/**
 * Creates Supabase client with SERVICE_ROLE credentials.
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in environment");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().toLowerCase();
  if (cleanHex.length % 2 !== 0) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    const val = parseInt(cleanHex.substring(i, i + 2), 16);
    if (Number.isNaN(val)) return new Uint8Array(0);
    bytes[i / 2] = val;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signs data using HMAC-SHA256 and returns a hex string.
 */
export async function signHmacSha256Hex(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));

  return bytesToHex(new Uint8Array(signature));
}

/**
 * Verifies HMAC-SHA256 hex signature using constant-time comparison.
 */
export async function verifyHmacSha256Hex(
  key: string,
  data: string,
  expectedHex: string,
): Promise<boolean> {
  try {
    const actualHex = await signHmacSha256Hex(key, data);
    return timingSafeEqual(actualHex.toLowerCase(), expectedHex.toLowerCase());
  } catch {
    return false;
  }
}
