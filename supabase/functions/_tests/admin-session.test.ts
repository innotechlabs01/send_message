import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import {
  encodeBase64Url,
  decodeBase64Url,
  signAdminSession,
  verifySessionTokenPayload,
  verifyAdminSession,
  buildSessionCookie,
  extractRawSessionToken,
  ADMIN_SESSION_COOKIE,
} from "../_shared/admin-session.ts";

const TEST_SECRET = "super-secret-key-at-least-16-chars-long";

function createMockSupabase(adminUser: Record<string, unknown> | null, error: unknown = null) {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          single: async () => ({ data: adminUser, error }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof verifyAdminSession>[1];
}

Deno.test("admin-session - encodeBase64Url and decodeBase64Url roundtrip with UTF-8 characters", () => {
  const utf8Strings = [
    "José Peña",
    "María Inés Ñandú 🌟",
    "¡Hola! ¿Cómo estás? — Carácter especial #123",
    "Álvaro Gómez Núñez ☕️🎉",
    '{"id":"usr_1","name":"José Peña","role":"administrador"}',
  ];

  for (const original of utf8Strings) {
    const encoded = encodeBase64Url(original);
    // Base64url should not have +, /, or =
    assertEquals(encoded.includes("+"), false);
    assertEquals(encoded.includes("/"), false);
    assertEquals(encoded.includes("="), false);

    const decoded = decodeBase64Url(encoded);
    assertEquals(decoded, original);
  }
});

Deno.test("admin-session - signAdminSession and verifySessionTokenPayload preserves UTF-8 names", async () => {
  const user = {
    id: "admin-uuid-1234",
    email: "jose.pena@example.com",
    name: "José Peña",
  };

  const token = await signAdminSession(user, { secret: TEST_SECRET, ttlSeconds: 3600 });
  const parts = token.split(".");
  assertEquals(parts.length, 2);

  const payload = await verifySessionTokenPayload(token, TEST_SECRET);
  assertNotEquals(payload, null);
  assertEquals(payload?.id, user.id);
  assertEquals(payload?.email, user.email);
  assertEquals(payload?.name, "José Peña");
  assertEquals(typeof payload?.exp, "number");
  assertEquals(typeof payload?.iat, "number");
});

Deno.test("admin-session - rejects tampered signature", async () => {
  const user = {
    id: "admin-uuid-5678",
    email: "admin@example.com",
    name: "Admin Tester",
  };

  const token = await signAdminSession(user, { secret: TEST_SECRET });
  const [payloadPart, sig] = token.split(".");

  // Tamper signature with wrong characters
  const tamperedSig = sig.slice(0, -4) + "abcd";
  const tamperedToken = `${payloadPart}.${tamperedSig}`;

  const result = await verifySessionTokenPayload(tamperedToken, TEST_SECRET);
  assertEquals(result, null);
});

Deno.test("admin-session - rejects tampered payload with valid original signature", async () => {
  const user = {
    id: "admin-uuid-9999",
    email: "original@example.com",
    name: "Original",
  };

  const token = await signAdminSession(user, { secret: TEST_SECRET });
  const [, sig] = token.split(".");

  const tamperedPayloadObj = {
    id: "admin-uuid-0000",
    email: "attacker@example.com",
    name: "Attacker",
    iat: Date.now(),
    exp: Date.now() + 3600000,
  };
  const tamperedPayloadB64 = encodeBase64Url(JSON.stringify(tamperedPayloadObj));
  const tamperedToken = `${tamperedPayloadB64}.${sig}`;

  const result = await verifySessionTokenPayload(tamperedToken, TEST_SECRET);
  assertEquals(result, null);
});

Deno.test("admin-session - rejects expired token", async () => {
  const user = {
    id: "admin-uuid-expired",
    email: "expired@example.com",
    name: "Expired User",
  };

  // Negative TTL -> expired in the past
  const token = await signAdminSession(user, { secret: TEST_SECRET, ttlSeconds: -10 });
  const result = await verifySessionTokenPayload(token, TEST_SECRET);
  assertEquals(result, null);
});

Deno.test("admin-session - verifyAdminSession invalidates tokens when password_changed_at is newer", async () => {
  const user = {
    id: "admin-pw-test-1",
    email: "admin.pw@example.com",
    name: "José Peña",
  };

  // Token issued now
  const token = await signAdminSession(user, { secret: TEST_SECRET, ttlSeconds: 3600 });

  // 1. Password changed AFTER token issuance -> token should be invalidated
  const futurePasswordChange = new Date(Date.now() + 60000).toISOString();
  const mockDbAfter = createMockSupabase({
    id: user.id,
    email: user.email,
    name: user.name,
    password_changed_at: futurePasswordChange,
  });

  const verifiedAfter = await verifyAdminSession(token, mockDbAfter, TEST_SECRET);
  assertEquals(verifiedAfter, null);

  // 2. Password changed BEFORE token issuance -> token should remain valid
  const pastPasswordChange = new Date(Date.now() - 60000).toISOString();
  const mockDbBefore = createMockSupabase({
    id: user.id,
    email: user.email,
    name: user.name,
    password_changed_at: pastPasswordChange,
  });

  const verifiedBefore = await verifyAdminSession(token, mockDbBefore, TEST_SECRET);
  assertNotEquals(verifiedBefore, null);
  assertEquals(verifiedBefore?.id, user.id);
  assertEquals(verifiedBefore?.name, "José Peña");
  assertEquals(verifiedBefore?.password_changed_at, pastPasswordChange);

  // 3. No password_changed_at recorded -> token is valid
  const mockDbNoChange = createMockSupabase({
    id: user.id,
    email: user.email,
    name: user.name,
    password_changed_at: null,
  });

  const verifiedNoChange = await verifyAdminSession(token, mockDbNoChange, TEST_SECRET);
  assertNotEquals(verifiedNoChange, null);
  assertEquals(verifiedNoChange?.id, user.id);
});

Deno.test("admin-session - extractRawSessionToken parses headers and cookies", () => {
  // From x-admin-token header
  const reqHeader = new Request("https://example.com/api", {
    headers: { "x-admin-token": "token-from-header" },
  });
  assertEquals(extractRawSessionToken(reqHeader), "token-from-header");

  // From Cookie
  const reqCookie = new Request("https://example.com/api", {
    headers: { Cookie: `foo=bar; ${ADMIN_SESSION_COOKIE}=token-from-cookie; other=1` },
  });
  assertEquals(extractRawSessionToken(reqCookie), "token-from-cookie");

  // From Bearer token
  const reqBearer = new Request("https://example.com/api", {
    headers: { Authorization: "Bearer token.withdot" },
  });
  assertEquals(extractRawSessionToken(reqBearer), "token.withdot");

  // Missing
  const reqNone = new Request("https://example.com/api");
  assertEquals(extractRawSessionToken(reqNone), null);
});

Deno.test("admin-session - buildSessionCookie sets HttpOnly Secure Lax cookie", () => {
  const cookie = buildSessionCookie("my-test-token", 3600);
  assertEquals(cookie.includes(`${ADMIN_SESSION_COOKIE}=my-test-token`), true);
  assertEquals(cookie.includes("HttpOnly"), true);
  assertEquals(cookie.includes("Secure"), true);
  assertEquals(cookie.includes("SameSite=Lax"), true);
  assertEquals(cookie.includes("Max-Age=3600"), true);
});
