/**
 * Founder's DIRECT Telegram — the "talk to a human" channel, distinct from the
 * notification bot (TELEGRAM_BOT_USERNAME). This is a personal 1:1 chat.
 *
 * Set the handle once here, or override at build time with
 * VITE_FOUNDER_TELEGRAM (e.g. "tradeguardx" — no @, no URL). Update the fallback
 * below to the real handle before this goes out.
 */
const RAW = (import.meta.env.VITE_FOUNDER_TELEGRAM ?? 'tradeguardx').trim();

// Accept "@handle", "handle", or a full t.me URL and normalise to a bare handle.
const HANDLE = RAW.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/^@/, '').replace(/\/$/, '');

/** True once a real handle is configured (lets callers hide the CTA if not). */
export const FOUNDER_TELEGRAM_CONFIGURED = HANDLE.length > 0;

/**
 * Deep link that opens a chat with the founder. Optional pre-filled message
 * appears in the compose box (mobile app + desktop).
 */
export function founderTelegramUrl(prefill) {
  const base = `https://t.me/${HANDLE}`;
  return prefill ? `${base}?text=${encodeURIComponent(prefill)}` : base;
}

export const FOUNDER_TELEGRAM_HANDLE = HANDLE;

/**
 * Founder's WhatsApp — the same 1:1 "talk to a human" channel, for people who
 * live in WhatsApp rather than Telegram. Set VITE_FOUNDER_WHATSAPP at build time
 * to the number in international form, digits only (e.g. 919876543210). The
 * number is never shown on the page; the button opens the chat directly.
 * Unset → callers fall back to Telegram.
 */
const WA_DIGITS = String(import.meta.env.VITE_FOUNDER_WHATSAPP ?? '').replace(/\D/g, '');

export const FOUNDER_WHATSAPP_CONFIGURED = WA_DIGITS.length >= 10;

/** Opens WhatsApp (app on a phone, WhatsApp Web on a computer) with the message typed in. */
export function founderWhatsAppUrl(prefill) {
  if (!FOUNDER_WHATSAPP_CONFIGURED) return null;
  const base = `https://wa.me/${WA_DIGITS}`;
  return prefill ? `${base}?text=${encodeURIComponent(prefill)}` : base;
}
