import { describe, expect, it } from "vitest";
import {
  computeExpectedTotalCop,
  mapCartItemsForPayment,
  buildCartSignature,
  generateIdempotencyKey,
} from "./bold";
import type { CartItem } from "./wizard-store";

describe("bold payment helper unit tests", () => {
  it("computes expected total COP accurately based on item count", () => {
    expect(computeExpectedTotalCop(1)).toBe(4990);
    expect(computeExpectedTotalCop(2)).toBe(9980);
    expect(computeExpectedTotalCop(5)).toBe(24950);
  });

  it("throws error for non-positive or non-integer item counts", () => {
    expect(() => computeExpectedTotalCop(0)).toThrow();
    expect(() => computeExpectedTotalCop(-1)).toThrow();
  });

  it("maps cart items preserving all fields and applying sender fallbacks", () => {
    const cartItems: CartItem[] = [
      {
        id: "item-1",
        categoryId: "cumpleanos",
        message: "Feliz cumple",
        recipient: "Maria",
        sender: "",
        phoneFrom: "",
        phoneTo: "3001234567",
        sendDate: "2026-12-01",
      },
      {
        id: "item-2",
        categoryId: "aniversario",
        message: "Feliz aniversario",
        recipient: "Carlos",
        sender: "Juan",
        phoneFrom: "3009876543",
        phoneTo: "3105556677",
        sendDate: "2026-12-05",
      },
    ];

    const mapped = mapCartItemsForPayment(cartItems, "Fallback Sender", "3000000000");
    expect(mapped).toHaveLength(2);

    expect(mapped[0].senderName).toBe("Fallback Sender");
    expect(mapped[0].senderPhone).toBe("3000000000");
    expect(mapped[0].recipientName).toBe("Maria");
    expect(mapped[0].messageText).toBe("Feliz cumple");

    expect(mapped[1].senderName).toBe("Juan");
    expect(mapped[1].senderPhone).toBe("3009876543");
    expect(mapped[1].recipientName).toBe("Carlos");
  });

  it("generates deterministic cart signature string from all canonical fields", () => {
    const items = [
      {
        categoryId: "cumpleanos",
        messageText: "Test",
        recipientName: "Ana",
        recipientPhone: "3001112233",
        senderName: "Luis",
        senderPhone: "3009998877",
        sendDate: "2026-12-25",
      },
    ];
    const signature = buildCartSignature(items);
    expect(signature).toMatch(/^v2_[0-9a-f]{16}$/);
    expect(buildCartSignature([...items])).toBe(signature);

    // Changing messageText, senderName, or senderPhone changes signature
    expect(buildCartSignature([{ ...items[0], messageText: "Otro mensaje" }])).not.toBe(signature);
    expect(buildCartSignature([{ ...items[0], senderName: "Pedro" }])).not.toBe(signature);
    expect(buildCartSignature([{ ...items[0], senderPhone: "3001230000" }])).not.toBe(signature);
  });

  it("generates valid UUID formatted idempotency keys", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
