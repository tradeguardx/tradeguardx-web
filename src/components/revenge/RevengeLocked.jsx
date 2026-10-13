import { Link } from 'react-router-dom';
import { sx } from '../dashboard/shell/sx';
import { CARD, PERIODS } from './revengeFormat';

/**
 * Before the first unlock: not a blurred picture of someone else's report,
 * but the questions every trader wants answered about themselves — each one
 * locked, around a score that is still a question mark.
 *
 * A blurred report reads as "there is something here"; a question about YOU
 * ("which hour costs you the most?") reads as "I need to know". The answers
 * are masked, never invented: the shapes (●● min, ₹●●,●●●) say what kind of
 * answer is waiting, not what it is.
 */
const TEASERS = [
  { q: 'How fast you trade again after a loss', a: '●● min', icon: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { q: 'Your worst time to trade', a: '●●:00 – ●●:00', icon: 'M4 19h16M7 16V9m5 7V5m5 11v-4' },
  { q: 'The coin you lose most on', a: '●●●●USDT', icon: 'M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3' },
  { q: 'Money lost to revenge trades', a: '₹●●,●●●', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
];

function Lock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0110 0v3" /><path d="M5 11h14v9H5z" />
    </svg>
  );
}

export default function RevengeLocked({ months, onMonths, onUnlock, keyState, accountName, exchangeName }) {
  // 'noAccount': nothing set up yet — same teaser, the action is to finish setup.
  const noAccount = keyState === 'noAccount';
  const noKey = noAccount || keyState === 'none' || keyState === 'failed';

  return (
    <section className="rv-in" style={sx(`margin-top:20px;padding:30px 24px 28px;${CARD};position:relative;overflow:hidden`)}>
      <div style={sx('position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 55% at 50% 0%,var(--mint-tint),transparent 70%)')} />

      <div style={sx('position:relative;display:flex;flex-direction:column;align-items:center;text-align:center')}>
        {/* The score, still a question. */}
        <div style={sx('position:relative;width:132px;height:132px')}>
          <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r="52" fill="none" stroke="var(--surface-3)" strokeWidth="11" />
            {/* A full ring that breathes — a question waiting, not a spinner loading. */}
            <circle className="rv-motion" cx="66" cy="66" r="52" fill="none" stroke="var(--mint)" strokeWidth="11" style={{ animation: 'rvPulse 2.4s ease-in-out infinite' }} />
          </svg>
          <div style={sx('position:absolute;inset:0;display:grid;place-items:center')}>
            <div>
              <div style={sx("font:700 48px/1 'Space Grotesk',sans-serif;color:var(--mint)")}>?</div>
              <div style={sx("margin-top:4px;font:500 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:var(--ink-faint)")}>OF 100</div>
            </div>
          </div>
        </div>

        <h2 style={sx("margin:18px 0 0;font:600 23px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Know your revenge score</h2>
        <p style={sx('margin:8px 0 0;max-width:52ch;font-size:14px;line-height:1.6;color:var(--ink-2)')}>
          We look at your own trades {noAccount ? 'on your exchange' : <>on {accountName ? <b>{accountName}</b> : 'this account'}</>} and show you what you do after a loss.
        </p>
      </div>

      {/* The questions, answers masked. */}
      <ul style={sx('position:relative;margin:22px auto 0;padding:0;list-style:none;max-width:720px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:10px')}>
        {TEASERS.map((t, i) => (
          <li key={t.q} className="rv-in" style={sx('display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2);text-align:left', { animationDelay: `${0.15 + i * 0.1}s` })}>
            <span style={sx('flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
            </span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:13px;line-height:1.4;font-weight:600;color:var(--ink)')}>{t.q}</span>
              <span style={sx("display:inline-flex;align-items:center;gap:6px;margin-top:5px;font:600 13px/1 'JetBrains Mono',monospace;color:var(--mint);letter-spacing:.04em")}>
                <Lock size={12} /> <span aria-label="Locked">{t.a}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div style={sx('position:relative;margin-top:24px;display:flex;flex-direction:column;align-items:center;text-align:center')}>
        {noKey ? (
          <>
            <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>
              {noAccount
                ? 'Add your trading account and connect its key — then we can show your score.'
                : keyState === 'failed' ? 'Your key is disconnected, so we can’t see your trades.' : `Connect your ${exchangeName || 'exchange'} key first, so we can see your trades.`}
            </p>
            <Link to={noAccount ? '/dashboard/setup' : '/dashboard/connect'} style={sx('margin-top:14px;min-height:46px;padding:12px 22px;border-radius:12px;background:var(--mint-solid);color:#02241d;font-size:14.5px;font-weight:800;text-decoration:none')}>
              {noAccount ? 'Get my revenge score' : keyState === 'failed' ? 'Reconnect key' : 'Connect key'}
            </Link>
            {noAccount && <p style={sx('margin:11px 0 0;font-size:11.5px;color:var(--ink-faint)')}>About three minutes. Your score is ready the moment your key connects.</p>}
          </>
        ) : (
          <>
            <div role="radiogroup" aria-label="How far back" style={sx('display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
              {PERIODS.map((x) => (
                <button
                  key={x.months}
                  type="button"
                  role="radio"
                  aria-checked={x.months === months}
                  onClick={() => onMonths(x.months)}
                  style={sx('padding:7px 12px;border:0;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer', x.months === months ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--ink-3)' })}
                >
                  Last {x.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onUnlock}
              className="rv-motion"
              style={sx('margin-top:14px;display:inline-flex;align-items:center;gap:9px;min-height:48px;padding:12px 26px;border:0;border-radius:13px;color:#02241d;font-size:15px;font-weight:800;cursor:pointer;background-size:200% 100%;animation:rvShine 2.8s linear infinite;box-shadow:var(--glow-mint)', { backgroundImage: 'linear-gradient(110deg,var(--mint-solid) 40%,#7cf5dc 50%,var(--mint-solid) 60%)' })}
            >
              <Lock size={16} /> Show my revenge score
            </button>
            <p style={sx('margin:11px 0 0;font-size:11.5px;color:var(--ink-faint)')}>Takes a few seconds. We only read your trades.</p>
          </>
        )}
      </div>
    </section>
  );
}
