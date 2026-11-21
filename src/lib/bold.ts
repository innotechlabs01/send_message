// Bold Colombia payment helpers
import { supabase } from "@/integrations/supabase/client";
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

export function buildCartSignature(items: BoldPaymentItem[]): string {
  return items
    .map(
      (item) => `${item.categoryId}-${item.recipientName}-${item.recipientPhone}-${item.sendDate}`,
    )
    .join("|");
}

export async function createPaymentIntent(data: BoldPaymentIntent) {
  const idempotencyKey = data.idempotencyKey ?? generateIdempotencyKey();
  const expectedAmount = computeExpectedTotalCop(data.items.length);

  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "create-payment-intent",
      ...data,
      idempotencyKey,
      amount: expectedAmount,
    },
  });

  if (error) throw error;
  return result;
}

export async function checkExistingPayment(
  cartSignature: string,
): Promise<ExistingPaymentSummary | null> {
  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "check-existing-payment",
      cartSignature,
    },
  });

  if (error) throw error;
  return (result?.existingPayment as ExistingPaymentSummary | null) ?? null;
}

export async function getPaymentStatus(referenceId: string) {
  const { data: result, error } = await supabase.functions.invoke("confirm-payment", {
    body: {
      referenceId,
    },
  });

  if (error) throw error;
  return result;
}
