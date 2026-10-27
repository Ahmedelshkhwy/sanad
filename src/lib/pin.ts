import "server-only";
import { createHmac } from "node:crypto";

export const PIN_LENGTH = 5;

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Eastern Arabic digits → 0-9, so "١٢٣" and "123" are the same. */
export function westernDigits(s: string) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(ARABIC_DIGITS.indexOf(d) >= 0 ? ARABIC_DIGITS.indexOf(d) : PERSIAN_DIGITS.indexOf(d)));
}

/** Any 5 letters or digits, case-insensitive. No other rules, by design. */
export function normalizePin(raw: string): string | null {
  const pin = westernDigits(raw).normalize("NFKC").toLowerCase().replace(/\s/g, "");
  return [...pin].length === PIN_LENGTH && /^[\p{L}\p{N}]+$/u.test(pin) ? pin : null;
}

/** "+20 010 1234 5678" or "01012345678" → "201012345678" (Egypt when no country code). */
export function normalizePhone(raw: string, countryCode = "20"): string | null {
  let digits = westernDigits(raw).replace(/\D/g, "");
  const cc = countryCode.replace(/\D/g, "");
  if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) digits = digits.replace(/^00/, "");
  else digits = cc + digits.replace(/^0+/, "");
  return /^[0-9]{8,15}$/.test(digits) ? digits : null;
}

/** Phone accounts live in Supabase Auth under an address nobody receives mail at. */
export function phoneEmail(phone: string) {
  return `${phone}@phone.sanad.invalid`;
}

/**
 * The account password is derived from the PIN with a server-only key. Without the key a
 * 5-character PIN can't be tried against Supabase directly, only through our sign-in, which locks.
 */
export function pinPassword(phone: string, pin: string) {
  const pepper = process.env.PIN_PEPPER?.trim();
  if (!pepper) throw new Error("PIN_PEPPER is not set");
  return createHmac("sha256", pepper).update(`${phone}:${pin}`).digest("base64url");
}
