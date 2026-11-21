import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { normalizeColombianE164 } from "../_shared/twilio.ts";

Deno.test("twilio - normalizeColombianE164 with valid 10-digit 3xxxxxxxxx", () => {
  assertEquals(normalizeColombianE164("3001234567"), "+573001234567");
  assertEquals(normalizeColombianE164("3159998877"), "+573159998877");
  assertEquals(normalizeColombianE164("320 123 4567"), "+573201234567");
  assertEquals(normalizeColombianE164("(301) 456-7890"), "+573014567890");
  assertEquals(normalizeColombianE164("311.234.5678"), "+573112345678");
  assertEquals(normalizeColombianE164("  310 555 1234  "), "+573105551234");
});

Deno.test("twilio - normalizeColombianE164 with +57 / 57 prefix", () => {
  assertEquals(normalizeColombianE164("+573001234567"), "+573001234567");
  assertEquals(normalizeColombianE164("+57 300 123 4567"), "+573001234567");
  assertEquals(normalizeColombianE164("+57 (310) 987-6543"), "+573109876543");
  assertEquals(normalizeColombianE164("573001234567"), "+573001234567");
  assertEquals(normalizeColombianE164("57 320 111 2233"), "+573201112233");
});

Deno.test("twilio - normalizeColombianE164 handles whatsapp channel prefix", () => {
  // whatsappChannel flag = true produces whatsapp:+57...
  assertEquals(normalizeColombianE164("3001234567", true), "whatsapp:+573001234567");
  assertEquals(normalizeColombianE164("+573001234567", true), "whatsapp:+573001234567");
  assertEquals(normalizeColombianE164("573001234567", true), "whatsapp:+573001234567");

  // Input already has 'whatsapp:' prefix, with whatsappChannel = false -> strips prefix, returns standard E.164
  assertEquals(normalizeColombianE164("whatsapp:+573001234567", false), "+573001234567");
  assertEquals(normalizeColombianE164("whatsapp:3001234567", false), "+573001234567");
  assertEquals(normalizeColombianE164("whatsapp:+57 300 123 4567", false), "+573001234567");

  // Input already has 'whatsapp:' prefix, with whatsappChannel = true -> returns normalized whatsapp:+57...
  assertEquals(normalizeColombianE164("whatsapp:+573001234567", true), "whatsapp:+573001234567");
  assertEquals(normalizeColombianE164("whatsapp:3001234567", true), "whatsapp:+573001234567");
});

Deno.test("twilio - normalizeColombianE164 rejects invalid numbers", () => {
  // Non-Colombian mobile starting digit (does not start with 3)
  assertThrows(() => normalizeColombianE164("1234567890"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("6012345678"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("+12025550123"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("+571234567890"), Error, "Expected 10 digits starting with 3");

  // Too short
  assertThrows(() => normalizeColombianE164("30012345"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("300"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("123"), Error, "Expected 10 digits starting with 3");

  // Too long
  assertThrows(() => normalizeColombianE164("300123456789"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("57300123456789"), Error, "Expected 10 digits starting with 3");

  // Empty or non-string
  assertThrows(() => normalizeColombianE164(""), Error, "Phone number is required");
  assertThrows(() => normalizeColombianE164(null as unknown as string), Error, "Phone number is required");
  assertThrows(() => normalizeColombianE164("   "), Error, "Expected 10 digits starting with 3");

  // Non-digit input
  assertThrows(() => normalizeColombianE164("abcdefghij"), Error, "Expected 10 digits starting with 3");
  assertThrows(() => normalizeColombianE164("300abc4567"), Error, "Expected 10 digits starting with 3");
});
