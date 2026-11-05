import "server-only";
import { CONTACT } from "@/lib/nav";

/** Sends a message to the pharmacist's Telegram. Never throws: alerts must not break a reply. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) {
    console.error(`Telegram not configured: ${!token ? "TELEGRAM_BOT_TOKEN " : ""}${!chat ? "TELEGRAM_CHAT_ID" : ""}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`Telegram send failed: ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("Telegram send failed:", e instanceof Error ? e.name : "unknown");
    return false;
  }
}

export function cairoTime(d = new Date()) {
  return d.toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short", timeStyle: "short" });
}

export function whatsappLink(message: string): string | null {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}
