import { assertEquals } from "jsr:@std/assert@1";
import {
  timingSafeEqual,
  signHmacSha256Hex,
  verifyHmacSha256Hex,
  requireBearerSecret,
} from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.test("auth - timingSafeEqual correctly compares strings in constant time", () => {
  // Identical strings
  assertEquals(timingSafeEqual("hello", "hello"), true);
  assertEquals(timingSafeEqual("", ""), true);
  assertEquals(timingSafeEqual("abc123XYZ", "abc123XYZ"), true);
  assertEquals(timingSafeEqual("clave_secreta_12345", "clave_secreta_12345"), true);

  // Different length
  assertEquals(timingSafeEqual("short", "longer_string"), false);
  assertEquals(timingSafeEqual("", "a"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);

  // Same length, different contents
  assertEquals(timingSafeEqual("aaaaa", "aaaab"), false);
  assertEquals(timingSafeEqual("baaaa", "aaaaa"), false);
  assertEquals(timingSafeEqual("12345", "54321"), false);
});

Deno.test("auth - signHmacSha256Hex generates valid 64-char hex HMAC signature", async () => {
  const secret = "test-secret-key-123456";
  const message = "payload to be signed";

  const hexSig = await signHmacSha256Hex(secret, message);
  // SHA-256 output is 32 bytes = 64 hex characters
  assertEquals(hexSig.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(hexSig), true);

  // Deterministic
  const hexSig2 = await signHmacSha256Hex(secret, message);
  assertEquals(hexSig, hexSig2);

  // Different message produces different signature
  const hexSigDiffMsg = await signHmacSha256Hex(secret, "another message");
  assertEquals(hexSig === hexSigDiffMsg, false);

  // Different secret produces different signature
  const hexSigDiffSecret = await signHmacSha256Hex("another-secret-9999", message);
  assertEquals(hexSig === hexSigDiffSecret, false);
});

Deno.test("auth - verifyHmacSha256Hex accurately validates correct and tampered signatures", async () => {
  const secret = "shared-hmac-secret-abcdef";
  const data = "hello world payload";
  const validHex = await signHmacSha256Hex(secret, data);

  // Valid verification (including case-insensitivity)
  assertEquals(await verifyHmacSha256Hex(secret, data, validHex), true);
  assertEquals(await verifyHmacSha256Hex(secret, data, validHex.toUpperCase()), true);

  // Tampered data
  assertEquals(await verifyHmacSha256Hex(secret, "tampered payload", validHex), false);

  // Tampered secret
  assertEquals(await verifyHmacSha256Hex("wrong-secret", data, validHex), false);

  // Tampered hex signature (last char changed)
  const lastChar = validHex.slice(-1);
  const replacedChar = lastChar === "0" ? "1" : "0";
  const tamperedHex = validHex.slice(0, -1) + replacedChar;
  assertEquals(await verifyHmacSha256Hex(secret, data, tamperedHex), false);

  // Malformed hex signature does not throw
  assertEquals(await verifyHmacSha256Hex(secret, data, "not-a-hex"), false);
  assertEquals(await verifyHmacSha256Hex(secret, data, ""), false);
});

Deno.test("auth - requireBearerSecret validates bearer authorization header against env vars", () => {
  const envVar = "TEST_API_BEARER_SECRET";
  Deno.env.set(envVar, "token-secret-xyz-789");

  try {
    // Valid bearer token
    const validReq = new Request("https://example.com/api", {
      headers: { Authorization: "Bearer token-secret-xyz-789" },
    });
    assertEquals(requireBearerSecret(validReq, [envVar]), true);

    // Invalid bearer token
    const invalidReq = new Request("https://example.com/api", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    assertEquals(requireBearerSecret(invalidReq, [envVar]), false);

    // Missing authorization header
    const noAuthReq = new Request("https://example.com/api");
    assertEquals(requireBearerSecret(noAuthReq, [envVar]), false);

    // Malformed authorization header (not Bearer)
    const basicAuthReq = new Request("https://example.com/api", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    assertEquals(requireBearerSecret(basicAuthReq, [envVar]), false);
  } finally {
    Deno.env.delete(envVar);
  }
});

Deno.test("cors - resolves default dev origins when APP_URL and ALLOWED_ORIGINS are unset", () => {
  const origAppUrl = Deno.env.get("APP_URL");
  const origAllowed = Deno.env.get("ALLOWED_ORIGINS");

  try {
    Deno.env.delete("APP_URL");
    Deno.env.delete("ALLOWED_ORIGINS");

    // Request from localhost:3000
    const req1 = new Request("https://api.example.com", {
      headers: { Origin: "http://localhost:3000" },
    });
    const headers1 = getCorsHeaders(req1);
    assertEquals(headers1["Access-Control-Allow-Origin"], "http://localhost:3000");

    // Request from localhost:5173
    const req2 = new Request("https://api.example.com", {
      headers: { Origin: "http://localhost:5173" },
    });
    const headers2 = getCorsHeaders(req2);
    assertEquals(headers2["Access-Control-Allow-Origin"], "http://localhost:5173");

    // Untrusted origin fallback to first default (does not reflect attacker origin)
    const reqEvil = new Request("https://api.example.com", {
      headers: { Origin: "https://evil-attacker.com" },
    });
    const headersEvil = getCorsHeaders(reqEvil);
    assertEquals(headersEvil["Access-Control-Allow-Origin"], "http://localhost:3000");
  } finally {
    if (origAppUrl !== undefined) Deno.env.set("APP_URL", origAppUrl);
    if (origAllowed !== undefined) Deno.env.set("ALLOWED_ORIGINS", origAllowed);
  }
});

Deno.test("cors - respects APP_URL and strips trailing slashes", () => {
  const origAppUrl = Deno.env.get("APP_URL");
  const origAllowed = Deno.env.get("ALLOWED_ORIGINS");

  try {
    Deno.env.set("APP_URL", "https://consentiido.com/");
    Deno.env.delete("ALLOWED_ORIGINS");

    const reqApp = new Request("https://api.example.com", {
      headers: { Origin: "https://consentiido.com" },
    });
    const headers = getCorsHeaders(reqApp);
    assertEquals(headers["Access-Control-Allow-Origin"], "https://consentiido.com");
  } finally {
    if (origAppUrl !== undefined) Deno.env.set("APP_URL", origAppUrl);
    else Deno.env.delete("APP_URL");
    if (origAllowed !== undefined) Deno.env.set("ALLOWED_ORIGINS", origAllowed);
  }
});

Deno.test("cors - respects ALLOWED_ORIGINS comma-separated list", () => {
  const origAppUrl = Deno.env.get("APP_URL");
  const origAllowed = Deno.env.get("ALLOWED_ORIGINS");

  try {
    Deno.env.set(
      "ALLOWED_ORIGINS",
      "https://app.consentiido.com, https://admin.consentiido.com",
    );

    const req1 = new Request("https://api.example.com", {
      headers: { Origin: "https://admin.consentiido.com" },
    });
    assertEquals(getCorsHeaders(req1)["Access-Control-Allow-Origin"], "https://admin.consentiido.com");

    const req2 = new Request("https://api.example.com", {
      headers: { Origin: "https://app.consentiido.com" },
    });
    assertEquals(getCorsHeaders(req2)["Access-Control-Allow-Origin"], "https://app.consentiido.com");

    // Rejected origin gets first allowed origin as safe fallback
    const reqRejected = new Request("https://api.example.com", {
      headers: { Origin: "https://unauthorized.org" },
    });
    assertEquals(
      getCorsHeaders(reqRejected)["Access-Control-Allow-Origin"],
      "https://app.consentiido.com",
    );
  } finally {
    if (origAppUrl !== undefined) Deno.env.set("APP_URL", origAppUrl);
    if (origAllowed !== undefined) Deno.env.set("ALLOWED_ORIGINS", origAllowed);
    else Deno.env.delete("ALLOWED_ORIGINS");
  }
});

Deno.test("cors - handleCorsPreflight responds 204 to OPTIONS and null to others", () => {
  const reqOptions = new Request("https://api.example.com", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:3000" },
  });
  const res = handleCorsPreflight(reqOptions, { credentials: true });
  assertEquals(res !== null, true);
  assertEquals(res?.status, 204);
  assertEquals(res?.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");
  assertEquals(res?.headers.get("Access-Control-Allow-Credentials"), "true");

  const reqPost = new Request("https://api.example.com", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
  });
  const resPost = handleCorsPreflight(reqPost);
  assertEquals(resPost, null);
});
