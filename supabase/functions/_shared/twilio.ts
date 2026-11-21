export interface SendTwilioMessageParams {
  to: string;
  body: string;
  from?: string;
  statusCallbackUrl?: string;
}

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  error_code: number | null;
  error_message: string | null;
  [key: string]: unknown;
}

/**
 * Normalizes Colombian phone numbers to E.164 (+57...).
 * Handles variations like:
 * - "+57 300 123 4567" -> "+573001234567"
 * - "3001234567" -> "+573001234567"
 * - "573001234567" -> "+573001234567"
 * - whatsapp channel prefix if whatsappChannel=true: "whatsapp:+573001234567"
 */
export function normalizeColombianE164(phone: string, whatsappChannel = false): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Phone number is required");
  }

  // Strip leading 'whatsapp:' if present to normalize number part first
  let cleaned = phone.replace(/^whatsapp:/i, "").trim();

  // Remove whitespace, dashes, parentheses, dots
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, "");

  // If starts with +, strip to re-evaluate digits
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Standard Colombian mobile: 10 digits starting with 3 (e.g. 3001234567)
  if (/^3\d{9}$/.test(cleaned)) {
    cleaned = `57${cleaned}`;
  } else if (/^573\d{9}$/.test(cleaned)) {
    // Already has 57 country code + 10-digit mobile
  } else {
    throw new Error(`Invalid Colombian mobile phone format: ${phone}. Expected 10 digits starting with 3.`);
  }

  const e164 = `+${cleaned}`;
  return whatsappChannel ? `whatsapp:${e164}` : e164;
}

/**
 * Sends a message via Twilio API.
 * Reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER from Deno.env.
 */
export async function sendTwilioMessage(
  params: SendTwilioMessageParams,
): Promise<TwilioMessageResponse> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const defaultFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required in environment");
  }

  const fromNumber = params.from ?? defaultFrom;
  if (!fromNumber) {
    throw new Error(
      "Twilio 'from' number is required (set TWILIO_PHONE_NUMBER or pass from parameter)",
    );
  }

  const formData = new URLSearchParams();
  formData.append("To", params.to);
  formData.append("From", fromNumber);
  formData.append("Body", params.body);

  if (params.statusCallbackUrl) {
    formData.append("StatusCallback", params.statusCallbackUrl);
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const responseJson = await response.json();

  if (!response.ok) {
    const errorMsg = responseJson?.message || response.statusText || "Twilio request failed";
    const errorCode = responseJson?.code ? ` (code: ${responseJson.code})` : "";
    throw new Error(`Twilio error ${response.status}${errorCode}: ${errorMsg}`);
  }

  return responseJson as TwilioMessageResponse;
}
