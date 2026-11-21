export function cleanPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("57")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

export function formatPhone(raw: string): string {
  const digits = cleanPhoneDigits(raw);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join("-");
}
