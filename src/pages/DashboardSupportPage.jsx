import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { openSupportChat } from '../components/support/supportBus';
import { founderTelegramUrl, founderWhatsAppUrl } from '../lib/founderContact';
import { trackCtaClick } from '../lib/analytics';
import { sx } from '../components/dashboard/shell/sx';

const CHAT_PATH = 'M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9l-5 4v-4a1 1 0 01-1-1V5a1 1 0 011-1z';
const TELEGRAM_PATH = 'M20.6 4.2L2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.8-1.4-1.4z';
const WHATSAPP_PATH = 'M12 2.2a9.8 9.8 0 00-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1012 2.2zm0 17.9a8.1 8.1 0 01-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1112 20.1zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-.9-1.1-1.2-1.7-.1-.2 0-.4.1-.5l.4-.4.3-.5c.1-.2 0-.3 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.4-.9 2.2 0 .9.4 1.8.9 2.5 1 1.5 2.3 2.7 3.9 3.4.6.2 1.1.4 1.6.5.6.1 1.2.1 1.7 0 .5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2-.1-.1-.3-.2-.5-.3z';

const CARD = 'display:flex;flex-direction:column;gap:12px;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface)';
const ICON_WRAP = 'display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--surface-2);color:var(--ink)';
const TITLE = 'margin:0;font-size:15px;font-weight:700;color:var(--ink)';
const BODY = 'margin:0;flex:1;font-size:13px;line-height:1.5;color:var(--ink-3)';
const BUTTON = 'display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 16px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:13.5px;font-weight:700;text-decoration:none';

function Icon({ d }) {
  return (
    <span aria-hidden style={sx(ICON_WRAP)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
    </span>
  );
}

/**
 * The three ways to reach us. The AI opens the chat panel the dashboard already
 * mounts. Telegram and WhatsApp arrive with who is asking already typed, so the
 * first reply can be the answer rather than "which account?". No reply time is
 * promised, because nothing here could keep that promise.
 */
export default function DashboardSupportPage() {
  const { user } = useAuth();
  const { selectedAccount } = useTradingAccounts();

  const prefill = [
    'Hi! I need help with TradeGuardX.',
    user?.email ? `Email: ${user.email}` : null,
    selectedAccount?.name ? `Account: ${selectedAccount.name}` : null,
    '',
    'My question: ',
  ].filter((line) => line !== null).join('\n');

  const people = [
    { id: 'telegram', title: 'Telegram', cta: 'Open Telegram', href: founderTelegramUrl(prefill), d: TELEGRAM_PATH },
    { id: 'whatsapp', title: 'WhatsApp', cta: 'Open WhatsApp', href: founderWhatsAppUrl(prefill), d: WHATSAPP_PATH },
  ];

  return (
    <div style={sx('max-width:980px')}>
      <div style={sx('margin-bottom:20px;max-width:76ch')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Support</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Three ways to reach us. Use whichever is easiest for you.</p>
      </div>

      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:14px')}>
        <section style={sx(CARD)}>
          <Icon d={CHAT_PATH} />
          <h2 style={sx(TITLE)}>Chat with AI</h2>
          <p style={sx(BODY)}>
            {selectedAccount
              ? 'Instant answers, day or night. It can see this account’s rules and what the kill switch has done. It explains things, but it can’t change your rules, locks or keys.'
              : 'Instant answers, day or night. Add a trading account first, so it has your rules and activity to answer from.'}
          </p>
          <button
            type="button"
            disabled={!selectedAccount}
            onClick={() => { trackCtaClick('support_page_ai'); openSupportChat(); }}
            style={sx(BUTTON, selectedAccount ? { cursor: 'pointer' } : { opacity: 0.45, cursor: 'not-allowed' })}
          >
            Start chat
          </button>
        </section>

        {people.map((p) => (
          <section key={p.id} style={sx(CARD)}>
            <Icon d={p.d} />
            <h2 style={sx(TITLE)}>{p.title}</h2>
            <p style={sx(BODY)}>Talk to a person on our team. Best when the AI can’t solve it, or you’d rather speak to someone.</p>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick(`support_page_${p.id}`)}
              style={sx(BUTTON)}
            >
              {p.cta}
            </a>
          </section>
        ))}
      </div>

      <p style={sx('margin:18px 0 0;font-size:12.5px;color:var(--ink-3)')}>
        Prefer email? <a href="mailto:support@tradeguardx.com" style={sx('color:var(--ink);font-weight:600')}>support@tradeguardx.com</a>
      </p>
    </div>
  );
}
