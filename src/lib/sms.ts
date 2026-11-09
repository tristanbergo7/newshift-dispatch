import twilio from "twilio";
import type { SmsResult } from "./types";

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}

export async function sendSms(toRaw: string, body: string): Promise<SmsResult> {
  const to = normalizePhone(toRaw);
  const {
    TWILIO_ACCOUNT_SID: sid,
    TWILIO_AUTH_TOKEN: token,
    TWILIO_API_KEY_SID: keySid,
    TWILIO_API_KEY_SECRET: keySecret,
    TWILIO_FROM_NUMBER: from,
  } = process.env;
  // Prefer a revocable API key (SK...) over the account's main auth token.
  const client =
    sid && keySid && keySecret ? twilio(keySid, keySecret, { accountSid: sid })
    : sid && token ? twilio(sid, token)
    : null;
  if (!client || !from) {
    return { status: "preview", to, body, error: "Twilio not configured" };
  }
  try {
    const msg = await client.messages.create({ to, from, body });
    return { status: "sent", to, body, sid: msg.sid };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn("[sms] Twilio failed:", error);
    // Demo-safe: board shows the message as a preview instead.
    return { status: "preview", to, body, error };
  }
}
