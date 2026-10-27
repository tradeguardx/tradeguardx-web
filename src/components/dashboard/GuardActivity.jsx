import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ruleExplainers } from '../../lib/guardActivity';
import { fmtMoney } from '../../lib/session';
import { symbolLabel } from '../../lib/labels';
import { getUserZone } from '../../lib/userZone';
import { sx } from './shell/sx';

/**
 * Live guard → Activity drawer: "What the guard did" (a timeline joining each
 * trade to what happened to it, with locks as their own entries) and "How your
 * rules work" (each enabled rule with a worked example in the account's own
 * numbers). Opened from the Activity button at the right of the page header;
 * data comes from useGuardActivity so the button's count and the list agree.
 */

/* Per status: node colour and icon. Lock entries use 'lock'. */
const KIND = {
  lock: { fg: '#fff', bg: 'var(--red)', ring: 'var(--red-tint)', icon: 'lock' },
  blocked: { fg: 'var(--red)', bg: 'var(--red-tint)', ring: 'var(--red-tint)', icon: 'ban' },
  kill: { fg: 'var(--red)', bg: 'var(--red-tint)', ring: 'var(--red-tint)', icon: 'power' },
  triggered: { fg: 'var(--red)', bg: 'var(--red-tint)', ring: 'var(--red-tint)', icon: 'down' },
  risk: { fg: 'var(--amber)', bg: 'var(--amber-tint)', ring: 'var(--amber-tint)', icon: 'gauge' },
  target: { fg: 'var(--mint)', bg: 'var(--mint-tint)', ring: 'var(--mint-tint)', icon: 'flag' },
  notEnforced: { fg: 'var(--amber)', bg: 'var(--amber-tint)', ring: 'var(--amber-tint)', icon: 'alert' },
  alert: { fg: 'var(--amber)', bg: 'var(--surface-3)', ring: 'var(--surface-3)', icon: 'bell' },
  clean: { fg: 'var(--ink-3)', bg: 'var(--surface-3)', ring: 'var(--surface-3)', icon: 'check' },
};
const CHIP = {
  red: { background: 'var(--red-tint)', color: 'var(--red)' },
  amber: { background: 'var(--amber-tint)', color: 'var(--amber)' },
  'amber-soft': { background: 'var(--surface-3)', color: 'var(--amber)' },
  mint: { background: 'var(--mint-tint)', color: 'var(--mint)' },
  neutral: { background: 'var(--surface-3)', color: 'var(--ink-3)' },
};

function Icon({ name, size = 13 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'lock': return <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case 'ban': return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></svg>;
    case 'power': return <svg {...p}><path d="M12 3v8" /><path d="M6.3 7.3a8 8 0 1011.4 0" /></svg>;
    case 'down': return <svg {...p}><path d="M4 7l6 6 4-4 6 6" /><path d="M20 11v4h-4" /></svg>;
    case 'gauge': return <svg {...p}><path d="M4 16a8 8 0 1116 0" /><path d="M12 16l4-5" /></svg>;
    case 'flag': return <svg {...p}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></svg>;
    case 'alert': return <svg {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></svg>;
    case 'bell': return <svg {...p}><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" /><path d="M10 21h4" /></svg>;
    default: return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
  }
}

const zone = () => getUserZone();
const clock = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone() });
const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: zone() });
function dayLabel(t, now) {
  const k = dayKey(t);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: zone() });
}

/** The drawer. Renders nothing while closed. */
export function ActivityDrawer({ open, onClose, items, counts, rules, currency = 'USD', equity = null, keyLive }) {
  const [tab, setTab] = useState('activity');
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div style={sx('position:fixed;inset:0;z-index:80')} role="dialog" aria-modal="true" aria-label="Guard activity">
      <button type="button" aria-label="Close activity" onClick={onClose} style={sx('position:absolute;inset:0;border:0;background:rgba(3,6,12,.45);backdrop-filter:blur(2px);cursor:default')} />
      <aside className="ga-drawer" style={sx('position:absolute;top:0;right:0;height:100%;width:min(520px,100vw);display:flex;flex-direction:column;background:var(--bg,var(--surface));border-left:1px solid var(--line);box-shadow:-24px 0 60px -20px rgba(0,0,0,.45);animation:gaIn .28s cubic-bezier(.2,.8,.2,1) both')}>
        <style>{'@keyframes gaIn{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}@keyframes gaRow{from{transform:translateY(6px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion:reduce){.ga-drawer,.ga-row{animation:none!important}}'}</style>
        <header style={sx('padding:18px 20px 14px;border-bottom:1px solid var(--line)')}>
          <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
            <h2 style={sx("margin:0;font:600 19px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{tab === 'activity' ? 'What the guard did' : 'How your rules work'}</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={sx('width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-2);cursor:pointer')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {tab === 'activity' && (
            <div style={sx('display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px')}>
              {[['Trades', counts.trades, 'var(--ink)'], ['Guard acted', counts.acted, counts.acted ? 'var(--amber)' : 'var(--ink)'], ['Locks', counts.locks, counts.locks ? 'var(--red)' : 'var(--ink)']].map(([k, v, fg]) => (
                <div key={k} style={sx('padding:9px 11px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2)')}>
                  <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)")}>{k}</div>
                  <div style={sx("margin-top:6px;font:600 20px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: fg })}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div role="tablist" style={sx('display:flex;gap:4px;margin-top:14px;padding:3px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);width:max-content')}>
            {[['activity', 'Last 24 hours'], ['rules', 'How rules work']].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={sx('padding:6px 12px;border-radius:8px;border:1px solid transparent;font-size:12.5px;font-weight:700;cursor:pointer', tab === id ? { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' } : { background: 'transparent', color: 'var(--ink-3)' })}>
                {label}
              </button>
            ))}
          </div>
        </header>
        <div style={sx('flex:1;overflow-y:auto;padding:6px 0 28px')}>
          {tab === 'activity' ? <Timeline items={items} currency={currency} keyLive={keyLive} onNavigate={onClose} /> : <RulesExplained rules={rules} currency={currency} equity={equity} />}
        </div>
      </aside>
    </div>
  );
}

function Timeline({ items, currency, keyLive, onNavigate }) {
  const navigate = useNavigate();
  // Read once per mount: only used to name the day groups ("Today", "Yesterday").
  const [now] = useState(() => Date.now());
  // Each item with its day label and whether it opens a new day group.
  const rows = useMemo(
    () => (items ?? []).map((it, i, all) => {
      const day = dayLabel(it.t, now);
      return { it, day, showDay: i === 0 || dayLabel(all[i - 1].t, now) !== day };
    }),
    [items, now],
  );
  if (items == null) {
    return [0, 1, 2, 3].map((i) => <div key={i} style={sx('height:64px;margin:12px 20px;border-radius:12px;background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite')} />);
  }
  if (items.length === 0) {
    return (
      <div style={sx('padding:40px 24px;text-align:center')}>
        <div style={sx('width:44px;height:44px;margin:0 auto;border-radius:12px;display:grid;place-items:center;background:var(--surface-2);color:var(--ink-3)')}><Icon name="check" size={18} /></div>
        <p style={sx('margin:12px auto 0;max-width:34ch;font-size:13px;line-height:1.55;color:var(--ink-3)')}>
          {keyLive === false ? 'No key is connected, so nothing on this account is being watched.' : 'No trades in the last 24 hours. Every trade and every lock lands here, with why.'}
        </p>
      </div>
    );
  }
  return (
    <ol style={sx('list-style:none;margin:0;padding:0 20px')}>
      {rows.map(({ it, day, showDay }, i) => {
        const k = it.kind === 'lock' ? KIND.lock : KIND[it.status.key] ?? KIND.clean;
        const last = i === items.length - 1;
        return (
          <li key={`${it.kind}${i}`} className="ga-row" style={{ animation: `gaRow .35s ease ${Math.min(i, 10) * 0.03}s both` }}>
            {showDay && <div style={sx("padding:16px 0 8px 52px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)")}>{day}</div>}
            <div style={sx('display:grid;grid-template-columns:40px 1fr;gap:12px')}>
              {/* rail + node */}
              <div style={sx('position:relative;display:flex;justify-content:center')}>
                {!last && <span style={sx('position:absolute;top:30px;bottom:-6px;width:2px;border-radius:2px;background:var(--line)')} />}
                <span style={sx('position:relative;margin-top:8px;width:28px;height:28px;border-radius:9px;display:grid;place-items:center', { background: k.bg, color: k.fg, boxShadow: `0 0 0 4px ${k.ring}` })}>
                  <Icon name={k.icon} />
                </span>
              </div>
              {it.kind === 'lock' ? (
                <div style={sx('margin:4px 0 10px;padding:11px 13px;border:1px solid var(--red-line,var(--line));border-radius:12px;background:var(--red-tint)')}>
                  <div style={sx('display:flex;justify-content:space-between;gap:10px;align-items:baseline')}>
                    <span style={sx('font-size:13px;font-weight:700;color:var(--red)')}>{it.title}</span>
                    <span style={sx('flex:none;font-size:11.5px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>{clock(it.t)}</span>
                  </div>
                  {it.detail && <p style={sx('margin:5px 0 0;font-size:12px;line-height:1.5;color:var(--ink-2)')}>{it.detail}</p>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (it.trade.tradeUid) { onNavigate?.(); navigate(`/dashboard/trades/${encodeURIComponent(it.trade.tradeUid)}`); } }}
                  className="ga-card"
                  style={sx('margin:4px 0 10px;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-align:left;color:var(--ink);cursor:pointer;width:100%')}
                >
                  <div style={sx('display:flex;justify-content:space-between;gap:10px;align-items:center')}>
                    <span style={sx('display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap')}>
                      <span style={sx('font-size:13.5px;font-weight:700')}>{symbolLabel(it.trade.symbol)}</span>
                      <span style={sx('font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase', { color: /^(buy|long)$/i.test(it.trade.side) ? 'var(--mint)' : 'var(--red)' })}>
                        {/^(buy|long)$/i.test(it.trade.side) ? 'Long' : 'Short'}
                      </span>
                    </span>
                    <span style={sx('display:flex;align-items:center;gap:10px;flex:none')}>
                      <Pnl trade={it.trade} currency={currency} />
                      <span style={sx('font-size:11.5px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>{clock(it.t)}</span>
                    </span>
                  </div>
                  <span style={sx('display:inline-block;margin-top:8px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px', CHIP[it.status.tone] ?? CHIP.neutral)}>{it.status.label}</span>
                  <p style={sx('margin:7px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-3)')}>{it.why}</p>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RulesExplained({ rules, currency, equity }) {
  const list = useMemo(() => ruleExplainers(rules, { currency, equity }), [rules, currency, equity]);
  if (list.length === 0) {
    return <p style={sx('padding:32px 24px;text-align:center;font-size:13px;color:var(--ink-3)')}>No rules are switched on yet. Turn one on and it is explained here with your own numbers.</p>;
  }
  return (
    <div style={sx('padding:8px 20px;display:grid;gap:12px')}>
      {list.map((e) => (
        <section key={e.slug} style={sx('padding:14px 15px;border:1px solid var(--line);border-radius:14px;background:var(--surface)')}>
          <h3 style={sx("margin:0;font:600 15px/1.25 'Space Grotesk',sans-serif")}>{e.name}</h3>
          <p style={sx('margin:6px 0 0;font-size:12.5px;line-height:1.6;color:var(--ink-2)')}>{e.how}</p>
          <div style={sx('margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px dashed var(--line-strong)')}>
            <div style={sx("font:700 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)")}>Example</div>
            <p style={sx('margin:6px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{e.example}</p>
          </div>
        </section>
      ))}
    </div>
  );
}

function Pnl({ trade, currency }) {
  const closed = String(trade?.status || '').toUpperCase() === 'CLOSED' || !!trade?.closedAt;
  const pnl = Number(trade?.realizedPnl ?? trade?.pnl ?? trade?.netPnl);
  return (
    <span style={sx("font:600 13px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: !closed ? 'var(--ink-3)' : pnl < 0 ? 'var(--red)' : pnl > 0 ? 'var(--mint)' : 'var(--ink)' })}>
      {/* A sub-cent result is shown in full, never as "$0.00": a −$0.0005 close
          can trigger a losing-streak lock, and rounding it away hides why. */}
      {closed && Number.isFinite(pnl) ? fmtMoney(pnl, currency, { sign: true, decimals: pnl !== 0 && Math.abs(pnl) < 0.01 ? 4 : 2 }) : 'open'}
    </span>
  );
}

/** The header button: opens the drawer, shows how much the guard did today. */
export function ActivityButton({ counts, onClick }) {
  const n = (counts?.acted ?? 0) + (counts?.locks ?? 0);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open activity${n ? `, ${n} guard events in the last 24 hours` : ''}`}
      style={sx('flex:none;display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border:1px solid var(--line-strong);border-radius:11px;background:var(--surface);color:var(--ink);font-size:13px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-card)')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
      Activity
      {n > 0 && <span style={sx('min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:grid;place-items:center;font-size:11px;font-weight:800;background:var(--red);color:#fff')}>{n}</span>}
    </button>
  );
}
