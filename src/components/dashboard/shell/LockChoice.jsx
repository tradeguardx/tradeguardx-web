import { useState } from 'react';
import { LOCKOUT_HOUR_OPTIONS } from '../../../api/userApi';
import { sx } from './sx';
import { formatResumes } from './format';

/**
 * The manual kill switch with a trade open (owner, 26 Oct 2026).
 *
 * The lock used to refuse while a position was open ("flatten first"). Now the
 * user picks how it starts:
 *
 *  - after_close (default): the trade keeps its stop and target; the lock
 *    starts the moment the account is flat. Any OTHER trade opened meanwhile
 *    is closed, so "always hold one" cannot keep the lock away.
 *  - close_now: close everything at market and lock now.
 *
 * "Lock when it closes" is the highlighted option because a market close
 * cannot be undone; "close now" stays one tap away for the tilted moment.
 * Both the Live guard panel and the top-bar modal render this, so the two
 * entry points cannot disagree.
 */

const HOUR_ON = "flex:1;padding:11px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--ink);background:var(--ink);color:var(--surface)";
const HOUR_OFF = "flex:1;padding:11px;border-radius:11px;font:600 13px/1 'Space Grotesk',sans-serif;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)";

const CHOICES = [
  {
    key: 'after_close',
    title: 'Lock when this trade closes',
    tag: 'Recommended',
    body: (h) => `Your stop-loss and target stay. The ${h}h lock starts the moment you're flat. Any new trade before then is closed straight away.`,
  },
  {
    key: 'close_now',
    title: 'Close everything now',
    tag: null,
    body: (h, list) => `We close ${list} at market and the ${h}h lock starts now. Whatever the trade made or lost is booked as normal.`,
  },
];

function listSymbols(symbols) {
  const s = (symbols ?? []).filter(Boolean);
  if (s.length === 0) return 'your open positions';
  if (s.length === 1) return s[0];
  if (s.length === 2) return `${s[0]} and ${s[1]}`;
  return `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`;
}

export function OpenTradeLockChoice({ symbols, hours, setHours, busy, onArm, firstRef }) {
  const [choice, setChoice] = useState('after_close');
  const [confirming, setConfirming] = useState(false);
  const list = listSymbols(symbols);
  const n = symbols?.length ?? 0;

  return (
    <div>
      <div style={sx('padding:12px 13px;margin-bottom:13px;border:1px solid var(--amber-line);border-radius:11px;background:var(--amber-tint)')}>
        <div style={sx('font-size:12.5px;font-weight:700;color:var(--amber)')}>You have a trade open</div>
        <p style={sx('margin:4px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>{list} {n === 1 ? 'is' : 'are'} open. Choose when the lock starts.</p>
      </div>

      <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px")}>Lock duration</div>
      <div style={sx('display:flex;gap:8px;margin-bottom:13px')} role="radiogroup" aria-label="Lock duration">
        {LOCKOUT_HOUR_OPTIONS.map((h, i) => (
          <button key={h} ref={i === 0 ? firstRef : undefined} type="button" role="radio" aria-checked={hours === h} disabled={confirming} onClick={() => setHours(h)} style={sx(hours === h ? HOUR_ON : HOUR_OFF)}>{h}h</button>
        ))}
      </div>

      <div role="radiogroup" aria-label="When the lock starts" style={sx('display:grid;gap:8px;margin-bottom:13px')}>
        {CHOICES.map((c) => {
          const on = choice === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={confirming}
              onClick={() => setChoice(c.key)}
              style={sx('display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;padding:12px 13px;border-radius:11px', {
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                background: on ? 'var(--surface)' : 'var(--surface-2)',
              })}
            >
              <span aria-hidden style={sx('flex:none;width:16px;height:16px;margin-top:1px;border-radius:50%;display:grid;place-items:center', { border: `1.5px solid ${on ? 'var(--ink)' : 'var(--line-strong)'}` })}>
                {on && <span style={sx('width:8px;height:8px;border-radius:50%;background:var(--ink)')} />}
              </span>
              <span style={sx('flex:1;min-width:0')}>
                <span style={sx('display:flex;align-items:center;gap:7px;flex-wrap:wrap')}>
                  <span style={sx('font-size:13px;font-weight:700;color:var(--ink)')}>{c.title}</span>
                  {c.tag && <span style={sx("font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:5px;background:var(--mint-tint);color:var(--mint)")}>{c.tag}</span>}
                </span>
                <span style={sx('display:block;margin-top:4px;font-size:12px;line-height:1.5;color:var(--ink-2)')}>{c.body(hours, list)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!confirming && (
        <button type="button" className="ks-arm" onClick={() => setConfirming(true)} style={sx('width:100%;padding:12px;border:1px solid var(--red-line);border-radius:10px;background:var(--red-tint);color:var(--red);font-size:13px;font-weight:700')}>Arm the lockout</button>
      )}
      {confirming && (
        <div style={sx('padding:13px 14px;border:1px solid var(--red-line);border-radius:11px;background:var(--red-tint)')}>
          <div style={sx('font-size:12.5px;font-weight:700;color:var(--red)')}>Read this before you confirm</div>
          <p style={sx('margin:5px 0 11px;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
            {choice === 'close_now'
              ? `${list} will be closed at market now, and you won't be able to trade this account for ${hours} hours. There is no cancel.`
              : `When ${list} closes, you won't be able to trade this account for ${hours} hours. Until then, any new trade is closed on sight. There is no cancel.`}
          </p>
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
            <button type="button" disabled={busy} onClick={() => onArm(choice)} style={sx('flex:1 1 180px;padding:10px;border:1px solid var(--red-solid);border-radius:9px;background:var(--red-solid);color:#fff;font-size:12.5px;font-weight:700')}>
              {busy ? 'Arming…' : choice === 'close_now' ? `Close ${n === 1 ? 'it' : 'all'} and lock ${hours}h` : `Lock me out after this trade`}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} style={sx('padding:10px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The lock is armed but waiting for the open trade to close. */
export function PendingLockPanel({ pending }) {
  if (!pending) return null;
  const list = listSymbols(pending.symbols);
  return (
    <div style={sx('padding:16px 17px;border:1px solid var(--red-line);border-radius:12px;background:var(--red-tint)')}>
      <div style={sx('display:flex;align-items:center;gap:8px')}>
        <span style={sx('width:7px;height:7px;border-radius:50%;background:var(--amber);animation:tgxPulse 2s ease-in-out infinite')} />
        <span style={sx('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--red);font-weight:700')}>Lock waiting · {pending.hours}h</span>
      </div>
      <div style={sx("margin-top:10px;font:600 17px/1.3 'Space Grotesk',sans-serif;color:var(--ink)")}>Starts when {list} {(pending.symbols?.length ?? 0) > 1 ? 'close' : 'closes'}</div>
      <p style={sx('margin:8px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
        Your stop-loss and target still work. Any new trade on this account is closed straight away until the lock has run. If the trade is still open {formatResumes(pending.startsBy)}, the lock starts anyway.
      </p>
      <p style={sx('margin:8px 0 0;font-size:11.5px;color:var(--ink-3)')}>Armed by you · no cancel</p>
    </div>
  );
}
