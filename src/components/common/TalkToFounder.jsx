import { founderTelegramUrl, FOUNDER_TELEGRAM_CONFIGURED } from '../../lib/founderContact';
import { trackCtaClick } from '../../lib/analytics';

/** Telegram glyph. */
function TelegramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/**
 * "Talk With Founder" CTA — a full-width dark banner with a Telegram-blue button.
 * Opens a real 1:1 Telegram chat with the founder (see lib/founderContact), NOT
 * the notification bot. Renders nothing until a handle is configured, so it never
 * ships a dead link. Width is controlled by the parent container.
 */
export default function TalkToFounder({
  title = 'Questions about your TradeGuardX?',
  subtitle = 'Message the founder directly on Telegram for help or guidance.',
  buttonLabel = 'Talk With Founder',
  prefill = 'Hi — I have a question about TradeGuardX.',
  source = 'talk_to_founder',
}) {
  if (!FOUNDER_TELEGRAM_CONFIGURED) return null;

  const href = founderTelegramUrl(prefill);
  const onClick = () => {
    try {
      trackCtaClick(source);
    } catch {
      /* analytics is best-effort */
    }
  };

  return (
    <div
      className="flex w-full flex-col items-start gap-4 rounded-2xl border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-7"
      style={{
        borderColor: 'rgba(42,171,238,0.22)',
        background: 'linear-gradient(180deg, rgba(42,171,238,0.06), rgba(42,171,238,0.015))',
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex"
          style={{ background: 'rgba(42,171,238,0.14)', color: '#2AABEE' }}
        >
          <TelegramIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-display text-lg font-bold text-white sm:text-xl">{title}</p>
          <p className="mt-1 text-sm text-slate-400 sm:text-[15px]">{subtitle}</p>
        </div>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-[15px] font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
          boxShadow: '0 10px 26px -10px rgba(42,171,238,0.6)',
        }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
          <TelegramIcon className="h-3.5 w-3.5" />
        </span>
        {buttonLabel}
      </a>
    </div>
  );
}
