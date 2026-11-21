import { describe, expect, it } from "vitest";
import { getStartOfToday, messageDetailsSchema } from "./MessageFormFields";

describe("MessageFormFields unit tests", () => {
  describe("getStartOfToday", () => {
    it("returns a Date at midnight 00:00:00.000 for America/Bogota current day", () => {
      const startOfToday = getStartOfToday();
      expect(startOfToday).toBeInstanceOf(Date);
      expect(isNaN(startOfToday.getTime())).toBe(false);
      expect(startOfToday.getHours()).toBe(0);
      expect(startOfToday.getMinutes()).toBe(0);
      expect(startOfToday.getSeconds()).toBe(0);
      expect(startOfToday.getMilliseconds()).toBe(0);
    });
  });

  describe("messageDetailsSchema", () => {
    const today = getStartOfToday();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    // A date safely in the future
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 7);
    const futureStr = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;

    // A date in the past (yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const validBase = {
      recipient: "María Gómez",
      sender: "Juan Pérez",
      phoneFrom: "3001234567",
      phoneTo: "3001234567",
      sendDate: todayStr,
    };

    it("accepts valid data with 10-digit mobile starting with 3 (e.g. 3001234567)", () => {
      const result = messageDetailsSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneTo).toBe("3001234567");
        expect(result.data.phoneFrom).toBe("3001234567");
      }
    });

    it("accepts phone numbers with Colombian formatting or +57 country code", () => {
      const formattedInput = {
        ...validBase,
        phoneTo: "+57 (300) 123-4567",
        phoneFrom: "57 315 999 8877",
        sendDate: futureStr,
      };
      const result = messageDetailsSchema.safeParse(formattedInput);
      expect(result.success).toBe(true);
    });

    it("rejects invalid phone numbers like 1234567890 (not starting with 3)", () => {
      // phoneTo starting with 1
      const invalidTo = messageDetailsSchema.safeParse({
        ...validBase,
        phoneTo: "1234567890",
      });
      expect(invalidTo.success).toBe(false);
      if (!invalidTo.success) {
        const toError = invalidTo.error.errors.find((e) => e.path.includes("phoneTo"));
        expect(toError).toBeDefined();
        expect(toError?.message).toContain("comenzar por 3");
      }

      // phoneFrom starting with 1
      const invalidFrom = messageDetailsSchema.safeParse({
        ...validBase,
        phoneFrom: "1234567890",
      });
      expect(invalidFrom.success).toBe(false);
      if (!invalidFrom.success) {
        const fromError = invalidFrom.error.errors.find((e) => e.path.includes("phoneFrom"));
        expect(fromError).toBeDefined();
      }

      // Landline or non-3 prefix
      const landline = messageDetailsSchema.safeParse({
        ...validBase,
        phoneTo: "6012345678",
      });
      expect(landline.success).toBe(false);

      // Too short
      const shortPhone = messageDetailsSchema.safeParse({
        ...validBase,
        phoneTo: "300123",
      });
      expect(shortPhone.success).toBe(false);
    });

    it("rejects past dates and accepts today or future dates", () => {
      // Past date: yesterday
      const pastResult = messageDetailsSchema.safeParse({
        ...validBase,
        sendDate: yesterdayStr,
      });
      expect(pastResult.success).toBe(false);
      if (!pastResult.success) {
        const dateError = pastResult.error.errors.find((e) => e.path.includes("sendDate"));
        expect(dateError).toBeDefined();
        expect(dateError?.message).toContain("hoy o posterior");
      }

      // Old past date: 2020-01-01
      const oldPast = messageDetailsSchema.safeParse({
        ...validBase,
        sendDate: "2020-01-01",
      });
      expect(oldPast.success).toBe(false);

      // Today is accepted
      const todayResult = messageDetailsSchema.safeParse({
        ...validBase,
        sendDate: todayStr,
      });
      expect(todayResult.success).toBe(true);

      // Future date is accepted
      const futureResult = messageDetailsSchema.safeParse({
        ...validBase,
        sendDate: futureStr,
      });
      expect(futureResult.success).toBe(true);
    });

    it("validates recipient and sender string limits", () => {
      // Empty recipient
      const emptyRecipient = messageDetailsSchema.safeParse({
        ...validBase,
        recipient: "   ",
      });
      expect(emptyRecipient.success).toBe(false);

      // Empty sender
      const emptySender = messageDetailsSchema.safeParse({
        ...validBase,
        sender: "",
      });
      expect(emptySender.success).toBe(false);

      // Over 80 chars
      const longName = "A".repeat(81);
      const tooLong = messageDetailsSchema.safeParse({
        ...validBase,
        recipient: longName,
      });
      expect(tooLong.success).toBe(false);
    });
  });
});
