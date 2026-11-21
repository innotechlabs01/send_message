// Bold Colombia payment helpers
import { invokeEdgeFunction } from "@/lib/supabase-functions";
import { PRICE_PER_MESSAGE, type CartItem } from "@/lib/wizard-store";

export interface BoldPaymentItem {
  id?: string;
  categoryId: string;
  messageText: string;
  recipientName: string;
  recipientPhone: string;
  senderName: string;
  senderPhone?: string;
  sendDate: string;
}

export interface BoldPaymentIntent {
  referenceId: string;
  idempotencyKey?: string;
  amount?: number;
  description?: string;
  callbackUrl: string;
  items: BoldPaymentItem[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface ExistingPaymentSummary {
  reference_id: string;
  state: string;
  bold_status: string;
  gateway_reason?: string;
  created_at: string;
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function computeExpectedTotalCop(itemCount: number): number {
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error("El carrito debe tener al menos 1 mensaje");
  }
  return itemCount * PRICE_PER_MESSAGE;
}

export function mapCartItemsForPayment(
  items: CartItem[],
  fallbackSenderName: string,
  fallbackSenderPhone?: string,
): BoldPaymentItem[] {
  return items.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    messageText: item.message,
    recipientName: item.recipient,
    recipientPhone: item.phoneTo,
    senderName: item.sender || fallbackSenderName,
    senderPhone: item.phoneFrom || fallbackSenderPhone || undefined,
    sendDate: item.sendDate,
  }));
}

function fnv1a32(input: string, seed = 0x811c9dc5): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function djb2_32(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildCartSignature(
  items: Array<BoldPaymentItem & { occasion?: string; scheduledAt?: string }>,
): string {
  const canonical = items.map((item) => ({
    occasion: (item.occasion ?? item.categoryId ?? "").trim(),
    messageText: (item.messageText ?? "").trim(),
    recipientName: (item.recipientName ?? "").trim(),
    recipientPhone: (item.recipientPhone ?? "").trim(),
    senderName: (item.senderName ?? "").trim(),
    senderPhone: (item.senderPhone ?? "").trim(),
    scheduledAt: (item.scheduledAt ?? item.sendDate ?? "").trim(),
  }));
  const serialized = JSON.stringify(canonical);
  return `v2_${fnv1a32(serialized)}${djb2_32(serialized)}`;
}

export async function createPaymentIntent(data: BoldPaymentIntent) {
  const idempotencyKey = data.idempotencyKey ?? generateIdempotencyKey();
  const expectedAmount = computeExpectedTotalCop(data.items.length);

  return invokeEdgeFunction<{
    referenceId?: string;
    idempotencyKey?: string;
    amount?: number;
    currency?: string;
    idempotentReplay?: boolean;
    error?: string;
    payload?: {
      next_actions?: {
        redirect_url?: string | null;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>("bold-payment", {
    action: "create-payment-intent",
    ...data,
    idempotencyKey,
    amount: expectedAmount,
  });
}

export async function checkExistingPayment(
  cartSignature: string,
): Promise<ExistingPaymentSummary | null> {
  const result = await invokeEdgeFunction<{ existingPayment?: ExistingPaymentSummary | null }>(
    "bold-payment",
    {
      action: "check-existing-payment",
      cartSignature,
    },
  );
  return result?.existingPayment ?? null;
}

export async function getPaymentStatus(referenceId: string) {
  return invokeEdgeFunction<Record<string, unknown>>("confirm-payment", {
    referenceId,
  });
}
