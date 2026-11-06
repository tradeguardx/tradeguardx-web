import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { openSupportChat } from '../components/support/supportBus';
import { founderTelegramUrl, founderWhatsAppUrl } from '../lib/founderContact';
import { trackCtaClick } from '../lib/analytics';
import { sx } from '../components/dashboard/shell/sx';

const CHAT_PATH = 'M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9l-5 4v-4a1 1 0 01-1-1V5a1 1 0 011-1z';
const TELEGRAM_PATH = 'M20.6 4.2L2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.8-1.4-1.4z';
const WHATSAPP_PATH = 'M12 2.2a9.8 9.8 0 00-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1012 2.2zm0 17.9a8.1 8.1 0 01-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1112 20.1zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-.9-1.1-1.2-1.7-.1-.2 0-.4.1-.5l.4-.4.3-.5c.1-.2 0-.3 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.4-.9 2.2 0 .9.4 1.8.9 2.5 1 1.5 2.3 2.7 3.9 3.4.6.2 1.1.4 1.6.5.6.1 1.2.1 1.7 0 .5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2-.1-.1-.3-.2-.5-.3z';

const QUESTIONS = ['Why was my last trade closed?', 'Why is my account locked?', 'How do I connect my API key?'];

const LIFT = 'transition duration-150 hover:-translate-y-0.5';

function Glyph({ d, size = 22 }) {
  return <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flex: 'none' }}><path d={d} /></svg>;
}

function Arrow() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The ways to reach us. The AI opens the chat panel the dashboard already
 * mounts, and leads because it can answer now. Telegram and WhatsApp arrive with
 * who is asking already typed, so the first reply can be the answer rather than
 * "which account?". No reply time is promised, because nothing here could keep
 * that promise.
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
    { id: 'telegram', title: 'Telegram', label: 'Open Telegram', href: founderTelegramUrl(prefill), d: TELEGRAM_PATH, color: '#2AABEE', pad: 3 },
    { id: 'whatsapp', title: 'WhatsApp', label: 'Open WhatsApp', href: founderWhatsAppUrl(prefill), d: WHATSAPP_PATH, color: '#25D366', pad: 0 },
  ];

  const ask = (question) => {
    trackCtaClick('support_page_ai');
    openSupportChat(question);
  };

  return (
    <div style={sx('max-width:880px')}>
      <header style={sx('margin-bottom:22px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>How can we help?</h1>
        <p style={sx('margin:7px 0 0;font-size:14px;color:var(--ink-3)')}>Get an answer now, or talk to someone on our team.</p>
      </header>

      <section style={sx('padding:clamp(20px,4vw,30px);border:1px solid var(--mint-line);border-radius:20px;background-image:radial-gradient(120% 140% at 0% 0%,var(--mint-tint),transparent 62%);background-color:var(--surface)')}>
        <div style={sx('display:flex;align-items:center;gap:18px;flex-wrap:wrap')}>
          <span style={sx('flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:15px;background:var(--mint-solid);color:var(--on-mint)')}>
            <Glyph d={CHAT_PATH} size={25} />
          </span>
          <div style={sx('flex:1;min-width:min(260px,100%)')}>
            <h2 style={sx("margin:0;font:600 20px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink)")}>Chat with AI</h2>
            <p style={sx('margin:5px 0 0;max-width:58ch;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>
              {selectedAccount
                ? 'Available day or night. It can see this account’s rules and what the kill switch has done. It explains things, but it can’t change your rules, locks or keys.'
                : 'Available day or night. Add a trading account first, so it has your rules and activity to answer from.'}
            </p>
          </div>
          <button
            type="button"
            disabled={!selectedAccount}
            onClick={() => ask()}
            className={selectedAccount ? LIFT : undefined}
            style={sx('flex:none;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;padding:11px 20px;border:0;border-radius:12px;background:var(--mint-solid);color:var(--on-mint);font-size:14px;font-weight:700', selectedAccount ? { cursor: 'pointer' } : { opacity: 0.45, cursor: 'not-allowed' })}
          >
            Start chat <Arrow />
          </button>
        </div>

        {selectedAccount && (
          <div style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line)')}>
            {QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className={LIFT}
                style={sx('padding:8px 13px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface-2);color:var(--ink-2);font-size:12.5px;font-weight:500;text-align:left;cursor:pointer')}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </section>

      <h2 style={sx("margin:28px 0 12px;font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)")}>Talk to a person</h2>

      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px')}>
        {people.map((p) => (
          <a
            key={p.id}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.label}
            onClick={() => trackCtaClick(`support_page_${p.id}`)}
            className={LIFT}
            style={sx('display:flex;align-items:center;gap:14px;padding:17px 18px;border:1px solid var(--line-strong);border-radius:16px;background:var(--surface);color:var(--ink);text-decoration:none')}
          >
            <span style={sx('flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;color:#fff', { background: p.color, paddingRight: p.pad })}>
              <Glyph d={p.d} />
            </span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:14.5px;font-weight:700')}>{p.title}</span>
              <span style={sx('display:block;margin-top:2px;font-size:12.5px;line-height:1.4;color:var(--ink-3)')}>Message our team directly</span>
            </span>
            <span style={sx('color:var(--ink-3);display:flex')}><Arrow /></span>
          </a>
        ))}
      </div>

      <footer style={sx('display:flex;align-items:center;justify-content:space-between;gap:8px 18px;flex-wrap:wrap;margin-top:22px;padding-top:16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)')}>
        <span>Prefer email? <a href="mailto:support@tradeguardx.com" style={sx('color:var(--ink);font-weight:600')}>support@tradeguardx.com</a></span>
        <span>We will never ask for your API secret or password.</span>
      </footer>
    </div>
  );
}
