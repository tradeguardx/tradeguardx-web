import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJournalTrades } from '../../api/tradesApi';
import { fetchBreaches } from '../../api/breachesApi';
import { buildTimeline, ruleExplainers } from '../../lib/guardActivity';
import { fmtMoney } from '../../lib/session';
import { symbolLabel } from '../../lib/labels';
import { getUserZone } from '../../lib/userZone';
import { sx } from './shell/sx';

/**
 * Live guard → "What the guard did today" and "How your rules work".
 *
 * The first tab joins each trade to what happened to it (lib/tradeStatus) and
 * says why in one sentence; locks are rows of their own. The second explains
 * every rule that is switched on, with a worked example in the account's own
 * numbers (lib/guardActivity). Overview keeps its short Activity card; this is
 * the full story for the screen people keep open while trading.
 */
const POLL_MS = 30_000;
const TONE = {
  red: { background: 'var(--red-tint)', color: 'var(--red)' },
  amber: { background: 'var(--amber-tint)', color: 'var(--amber)' },
  'amber-soft': { background: 'var(--surface-3)', color: 'var(--amber)' },
  mint: { background: 'var(--mint-tint)', color: 'var(--mint)' },
  neutral: { background: 'var(--surface-3)', color: 'var(--ink-3)' },
};
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';

const clock = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: getUserZone() });

export default function GuardActivity({ accessToken, tradingAccountId, rules, currency = 'USD', equity = null, resetLabel = 'your daily reset', keyLive }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('activity');
  const [data, setData] = useState({ trades: null, breaches: [] });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    const ctrl = new AbortController();
    const load = () =>
      Promise.all([
        fetchJournalTrades({ accessToken, tradingAccountId, limit: 100, signal: ctrl.signal }).catch(() => null),
        fetchBreaches({ accessToken, tradingAccountId, limit: 200, signal: ctrl.signal }).catch(() => null),
      ]).then(([t, b]) => {
        if (ctrl.signal.aborted) return;
        setNow(Date.now());
        setData((prev) => ({
          // A failed refresh keeps what we had rather than emptying the list.
          trades: Array.isArray(t) ? t : prev.trades ?? [],
          breaches: Array.isArray(b) ? b : prev.breaches,
        }));
      });
    load();
    const id = setInterval(load, POLL_MS);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [accessToken, tradingAccountId]);

  const items = useMemo(
    () => (data.trades ? buildTimeline(data.trades, data.breaches, { now, currency }) : null),
    [data, now, currency],
  );
  const explainers = useMemo(() => ruleExplainers(rules, { currency, equity, resetLabel }), [rules, currency, equity, resetLabel]);
  const counts = useMemo(() => {
    const tr = (items ?? []).filter((i) => i.kind === 'trade');
    return { trades: tr.length, acted: tr.filter((i) => i.status.key !== 'clean').length, locks: (items ?? []).filter((i) => i.kind === 'lock').length };
  }, [items]);

  const tabBtn = (id, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      style={sx('padding:7px 12px;border-radius:9px;border:1px solid transparent;font-size:12.5px;font-weight:700;cursor:pointer', tab === id ? { background: 'var(--surface-3)', color: 'var(--ink)', borderColor: 'var(--line)' } : { background: 'transparent', color: 'var(--ink-3)' })}
    >
      {label}
    </button>
  );

  return (
    <section style={sx(CARD, 'margin-top:18px')} aria-label="What the guard did">
      <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line)')}>
        <div>
          <h3 style={sx("margin:0;font:600 16px/1.2 'Space Grotesk',sans-serif")}>{tab === 'activity' ? 'What the guard did — last 24h' : 'How your rules work'}</h3>
          <p style={sx('margin:4px 0 0;font-size:12px;color:var(--ink-3)')}>
            {tab === 'activity'
              ? items == null
                ? 'Loading…'
                : `${counts.trades} trade${counts.trades === 1 ? '' : 's'} · ${counts.acted} the guard acted on · ${counts.locks} lock${counts.locks === 1 ? '' : 's'}`
              : `${explainers.length} rule${explainers.length === 1 ? '' : 's'} switched on, explained with your own numbers`}
          </p>
        </div>
        <div role="tablist" style={sx('display:flex;gap:4px;padding:3px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
          {tabBtn('activity', 'Activity')}
          {tabBtn('rules', 'How rules work')}
        </div>
      </div>

      {tab === 'activity' ? (
        items == null ? (
          [0, 1, 2].map((i) => <div key={i} style={sx('height:58px;border-bottom:1px solid var(--line);background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite')} />)
        ) : items.length === 0 ? (
          <div style={sx('padding:22px 18px;font-size:13px;color:var(--ink-3)')}>
            {keyLive === false ? 'No key is connected, so nothing is being watched on this account.' : 'No trades in the last 24 hours. Every trade and every lock shows up here, with why.'}
          </div>
        ) : (
          <ol style={sx('list-style:none;margin:0;padding:0')}>
            {items.map((it, i) =>
              it.kind === 'lock' ? (
                <li key={`l${i}`} style={sx('display:flex;gap:12px;padding:12px 18px;border-bottom:1px solid var(--line);background:var(--red-tint)')}>
                  <span style={sx('flex:none;width:58px;font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums;padding-top:2px')}>{clock(it.t)}</span>
                  <span style={sx('flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:var(--red);color:#fff')} aria-hidden>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                  </span>
                  <span style={sx('flex:1;min-width:0')}>
                    <span style={sx('display:block;font-size:13px;font-weight:700;color:var(--red)')}>{it.title}</span>
                    {it.detail && <span style={sx('display:block;margin-top:3px;font-size:12px;line-height:1.5;color:var(--ink-2)')}>{it.detail}</span>}
                  </span>
                </li>
              ) : (
                <li key={`t${i}`}>
                  <button
                    type="button"
                    onClick={() => it.trade.tradeUid && navigate(`/dashboard/trades/${encodeURIComponent(it.trade.tradeUid)}`)}
                    style={sx('width:100%;display:flex;gap:12px;padding:12px 18px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;color:var(--ink);cursor:pointer')}
                  >
                    <span style={sx('flex:none;width:58px;font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums;padding-top:2px')}>{clock(it.t)}</span>
                    <span style={sx('flex:1;min-width:0')}>
                      <span style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                        <span style={sx('font-size:13px;font-weight:600')}>{symbolLabel(it.trade.symbol)}</span>
                        <span style={sx('font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase', { color: /^(buy|long)$/i.test(it.trade.side) ? 'var(--mint)' : 'var(--red)' })}>
                          {/^(buy|long)$/i.test(it.trade.side) ? 'Long' : 'Short'}
                        </span>
                        <span style={sx('font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap', TONE[it.status.tone] ?? TONE.neutral)}>{it.status.label}</span>
                      </span>
                      <span style={sx('display:block;margin-top:4px;font-size:12px;line-height:1.5;color:var(--ink-3)')}>{it.why}</span>
                    </span>
                    <PnlCell trade={it.trade} currency={currency} />
                  </button>
                </li>
              ),
            )}
          </ol>
        )
      ) : explainers.length === 0 ? (
        <div style={sx('padding:22px 18px;font-size:13px;color:var(--ink-3)')}>No rules are switched on yet. Turn one on and it is explained here with your own numbers.</div>
      ) : (
        <div style={sx('display:grid;gap:0')}>
          {explainers.map((e) => (
            <div key={e.slug} style={sx('padding:15px 18px;border-bottom:1px solid var(--line)')}>
              <div style={sx('font-size:13.5px;font-weight:700')}>{e.name}</div>
              <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.6;color:var(--ink-2)')}>{e.how}</p>
              <div style={sx('margin-top:8px;padding:9px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
                <span style={sx("font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin-right:8px")}>Example</span>
                {e.example}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PnlCell({ trade, currency }) {
  const closed = String(trade?.status || '').toUpperCase() === 'CLOSED' || !!trade?.closedAt;
  const pnl = Number(trade?.realizedPnl ?? trade?.pnl ?? trade?.netPnl);
  return (
    <span style={sx("flex:none;font:600 13px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;padding-top:2px", { color: !closed ? 'var(--ink-3)' : pnl < 0 ? 'var(--red)' : pnl > 0 ? 'var(--mint)' : 'var(--ink)' })}>
      {/* A sub-cent result is shown in full, never as "$0.00": a −$0.0005 close
          can trigger a losing-streak lock, and rounding it away hides why. */}
      {closed && Number.isFinite(pnl) ? fmtMoney(pnl, currency, { sign: true, decimals: pnl !== 0 && Math.abs(pnl) < 0.01 ? 4 : 2 }) : 'open'}
    </span>
  );
}
