import { founderTelegramUrl, founderWhatsAppUrl } from '../../lib/founderContact';
import { trackCtaClick } from '../../lib/analytics';
import { sx } from './shell/sx';

/**
 * "WhatsApp us" — during setup only: under every setup step and the free-trial step.
 *
 * Setup is where people stall: a key that will not verify, a question about
 * what the trial does, a doubt about giving an app access to their exchange.
 * One tap opens a WhatsApp chat with the founder (Telegram until the number is
 * configured), with a first line already typed that says where they are, so
 * the reply can start with the answer instead of "which step are you on?".
 */
export default function FounderHelp({ step }) {
  const prefill = `Hi! I'm setting up TradeGuardX${step ? ` (step: ${step})` : ''} and I have a question: `;
  const wa = founderWhatsAppUrl(prefill);
  const href = wa ?? founderTelegramUrl(prefill);

  return (
    <aside className="founder-help" style={sx('margin-top:26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface-2)')}>
      <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--mint-tint);color:var(--mint)')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8.5 8.5 0 01-12.5 7.5L3 21l1.5-5.2A8.5 8.5 0 1121 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>
      </span>
      <span style={sx('flex:1;min-width:min(230px,100%)')}>
        <span style={sx('display:block;font-size:13.5px;font-weight:700;color:var(--ink)')}>Stuck, or want to understand the product?</span>
        <span style={sx('display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--ink-3)')}>
          {wa ? 'WhatsApp us' : 'Message us'} — for setup issues, how TradeGuardX works, or anything you want to know before your trial.
        </span>
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCtaClick(wa ? 'setup_founder_whatsapp' : 'setup_founder_telegram')}
        style={sx('flex:none;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:10px 16px;border-radius:12px;font-size:13.5px;font-weight:800;text-decoration:none;white-space:nowrap', wa ? { background: '#25D366', color: '#fff' } : { background: '#229ED9', color: '#fff' })}
      >
        {wa ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 00-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1012 2.2zm0 17.9a8.1 8.1 0 01-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1112 20.1zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-.9-1.1-1.2-1.7-.1-.2 0-.4.1-.5l.4-.4.3-.5c.1-.2 0-.3 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.4-.9 2.2 0 .9.4 1.8.9 2.5 1 1.5 2.3 2.7 3.9 3.4.6.2 1.1.4 1.6.5.6.1 1.2.1 1.7 0 .5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.6 4.2L2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.8-1.4-1.4z" /></svg>
        )}
        {wa ? 'WhatsApp us' : 'Message us on Telegram'}
      </a>
    </aside>
  );
}
