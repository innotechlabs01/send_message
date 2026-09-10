// Bold Colombia payment helpers
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface BoldPaymentIntent {
  referenceId: string;
  amount: number;
  description?: string;
  callbackUrl: string;
  categoryId: string;
  messageText: string;
  recipientName: string;
  recipientPhone: string;
  senderName: string;
  senderPhone?: string;
  sendDate: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface BoldPaymentMethod {
  name: "CREDIT_CARD" | "DEBIT_CARD" | "PSE" | "NEQUI" | "BOTON_BANCOLOMBIA" | "QR";
  // Card fields
  cardNumber?: string;
  cardholderName?: string;
  expirationMonth?: string;
  expirationYear?: string;
  cvc?: string;
  installments?: number;
  // PSE fields
  bankCode?: string;
  bankName?: string;
}

export interface BoldPayer {
  personType: "NATURAL_PERSON" | "LEGAL_PERSON";
  name: string;
  phone: string;
  email: string;
  documentType: string;
  documentNumber: string;
}

export async function createPaymentIntent(data: BoldPaymentIntent) {
  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "create-payment-intent",
      ...data,
    },
  });

  if (error) throw error;
  return result;
}

export async function processPayment(params: {
  referenceId: string;
  payer: BoldPayer;
  paymentMethod: BoldPaymentMethod;
  deviceFingerprint?: Record<string, unknown>;
}) {
  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "process-payment",
      ...params,
    },
  });

  if (error) throw error;
  return result;
}

export async function confirmPayment(params: {
  referenceId: string;
  status: string;
  transactionId?: string;
}) {
  const { data: result, error } = await supabase.functions.invoke("confirm-payment", {
    body: params,
  });

  if (error) throw error;
  return result;
}

export async function getPaymentStatus(referenceId: string) {
  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "get-payment-status",
      referenceId,
    },
  });

  if (error) throw error;
  return result;
}

export async function getPseBanks() {
  const { data: result, error } = await supabase.functions.invoke("bold-payment", {
    body: {
      action: "get-pse-banks",
    },
  });

  if (error) throw error;
  return result;
}
