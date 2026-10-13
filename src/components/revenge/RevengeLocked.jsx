import { Link } from 'react-router-dom';
import { sx } from '../dashboard/shell/sx';
import { DEMO_REPORT, PERIODS } from './revengeFormat';
import RevengeReportView from './RevengeReportView';

/**
 * Before the first unlock: the report's shape, blurred and out of reach,
 * with one card on top that says what is behind it.
 *
 * The blurred report is made-up (DEMO_REPORT) and never legible — it shows
 * what kind of thing is coming, not a guess at their numbers.
 */
export default function RevengeLocked({ months, onMonths, onUnlock, keyState, accountName, exchangeName }) {
  const noKey = keyState === 'none' || keyState === 'failed';
  return (
    <div style={sx('position:relative;margin-top:20px')}>
      <div inert aria-hidden="true" style={sx('filter:blur(9px);opacity:.75;pointer-events:none;user-select:none;max-height:640px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)')}>
        <RevengeReportView report={DEMO_REPORT} periodLabel="1 month" />
      </div>

      <div style={sx('position:absolute;inset:0;display:grid;place-items:start center;padding:56px 16px 0')}>
        <div role="dialog" aria-modal="false" aria-labelledby="rv-lock-title" className="rv-in" style={sx('width:100%;max-width:440px;padding:28px 26px;border-radius:22px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-pop, var(--shadow-card));text-align:center')}>
          <span style={sx('margin:0 auto;display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:var(--mint-tint);border:1px solid var(--mint-line);color:var(--mint);box-shadow:var(--glow-mint)')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0110 0v3" /><path d="M5 11h14v9H5z" /><path d="M12 15v2" /></svg>
          </span>
          <h2 id="rv-lock-title" style={sx("margin:16px 0 0;font:600 21px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Unlock your revenge report</h2>
          <p style={sx('margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--ink-2)')}>
            How you trade after a loss — your score, the patterns that cost you, and the rule that fixes each one. Built from your own trades on {accountName ? <b>{accountName}</b> : 'this account'}.
          </p>

          {noKey ? (
            <>
              <p style={sx('margin:16px 0 0;font-size:12.5px;color:var(--ink-3)')}>
                {keyState === 'failed' ? 'This account’s key is disconnected, so we can’t read its trades.' : `Connect the ${exchangeName || 'exchange'} key for this account first — we read its trades from there.`}
              </p>
              <Link to="/dashboard/connect" style={sx('display:inline-block;margin-top:14px;min-height:44px;padding:12px 20px;border-radius:12px;background:var(--mint-solid);color:#02241d;font-size:14px;font-weight:800;text-decoration:none')}>
                {keyState === 'failed' ? 'Reconnect key' : 'Connect key'}
              </Link>
            </>
          ) : (
            <>
              <div role="radiogroup" aria-label="How far back" style={sx('margin:18px auto 0;display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
                {PERIODS.map((x) => (
                  <button
                    key={x.months}
                    type="button"
                    role="radio"
                    aria-checked={x.months === months}
                    onClick={() => onMonths(x.months)}
                    style={sx('padding:7px 12px;border:0;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer', x.months === months ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--ink-3)' })}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  onClick={onUnlock}
                  className="rv-motion"
                  style={sx('margin-top:16px;min-height:46px;padding:12px 24px;border:0;border-radius:12px;color:#02241d;font-size:14.5px;font-weight:800;cursor:pointer;background-size:200% 100%;animation:rvShine 2.8s linear infinite', { backgroundImage: 'linear-gradient(110deg,var(--mint-solid) 40%,#7cf5dc 50%,var(--mint-solid) 60%)' })}
                >
                  Unlock my report
                </button>
              </div>
              <p style={sx('margin:12px 0 0;font-size:11.5px;color:var(--ink-faint)')}>Read-only. Takes a few seconds.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
