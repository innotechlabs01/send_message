import { describe, expect, it } from "vitest";
import { cleanPhoneDigits, formatPhone } from "./phone";

describe("phone utility unit tests", () => {
  describe("cleanPhoneDigits", () => {
    it("extracts 10 clean digits from standard Colombian mobile number", () => {
      expect(cleanPhoneDigits("3001234567")).toBe("3001234567");
      expect(cleanPhoneDigits("3159998877")).toBe("3159998877");
    });

    it("strips spaces, dashes, parentheses and special characters", () => {
      expect(cleanPhoneDigits("300 123 4567")).toBe("3001234567");
      expect(cleanPhoneDigits("(300) 123-4567")).toBe("3001234567");
      expect(cleanPhoneDigits("300.123.4567")).toBe("3001234567");
      expect(cleanPhoneDigits(" 310 - 555 / 6677 ")).toBe("3105556677");
    });

    it("handles pasted numbers starting with +57 or 57 country code", () => {
      expect(cleanPhoneDigits("+573001234567")).toBe("3001234567");
      expect(cleanPhoneDigits("573001234567")).toBe("3001234567");
      expect(cleanPhoneDigits("+57 300 123 4567")).toBe("3001234567");
      expect(cleanPhoneDigits("+57 (315) 999-8877")).toBe("3159998877");
      expect(cleanPhoneDigits("57 320 111 2233")).toBe("3201112233");
    });

    it("limits output to at most 10 digits", () => {
      expect(cleanPhoneDigits("30012345678999")).toBe("3001234567");
    });

    it("returns partial or empty digits as appropriate", () => {
      expect(cleanPhoneDigits("")).toBe("");
      expect(cleanPhoneDigits("300")).toBe("300");
      expect(cleanPhoneDigits("abc")).toBe("");
    });
  });

  describe("formatPhone", () => {
    it("formats 10 digits as 3-3-2-2 format", () => {
      expect(formatPhone("3001234567")).toBe("300-123-45-67");
      expect(formatPhone("3159998877")).toBe("315-999-88-77");
    });

    it("formats numbers pasted with +57 or 57 country prefix", () => {
      expect(formatPhone("+573001234567")).toBe("300-123-45-67");
      expect(formatPhone("573001234567")).toBe("300-123-45-67");
      expect(formatPhone("+57 310 555 1234")).toBe("310-555-12-34");
    });

    it("formats progressively as user types partial numbers", () => {
      expect(formatPhone("")).toBe("");
      expect(formatPhone("3")).toBe("3");
      expect(formatPhone("300")).toBe("300");
      expect(formatPhone("3001")).toBe("300-1");
      expect(formatPhone("300123")).toBe("300-123");
      expect(formatPhone("3001234")).toBe("300-123-4");
      expect(formatPhone("30012345")).toBe("300-123-45");
      expect(formatPhone("300123456")).toBe("300-123-45-6");
      expect(formatPhone("3001234567")).toBe("300-123-45-67");
    });
  });
});
