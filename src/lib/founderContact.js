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
 * Founder's WhatsApp — the "talk to a human" channel during setup.
 *
 * THE NUMBER IS NOT IN THE SITE. In production the button links to our own
 * /whatsapp, which Vercel redirects to the chat (vercel.json → wa.me); the
 * query (the pre-typed message) passes through. So the number appears in no
 * page, no bundle and no hover. On localhost there is no Vercel, so a dev build
 * links straight to WhatsApp — that branch is removed from production builds.
 */
export const FOUNDER_WHATSAPP_CONFIGURED = true;

/** Opens WhatsApp (app on a phone, WhatsApp Web on a computer) with the message typed in. */
export function founderWhatsAppUrl(prefill) {
  const q = prefill ? `?text=${encodeURIComponent(prefill)}` : '';
  if (import.meta.env.DEV) return `https://wa.me/918770144119${q}`;
  return `/whatsapp${q}`;
}
