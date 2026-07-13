import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchJournalTrades, fetchJournalEvents } from '../../api/tradesApi';
import { fetchBreaches } from '../../api/breachesApi';

const POLL_MS = 20000;

function pick(o, ...keys) {
  for (const k of keys) if (o && o[k] != null) return o[k];
  return null;
}
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
function fmtMoney(v, cur = 'USD') {
  if (v == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 4 }).format(v);
  } catch {
    return String(v);
  }
}
function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function tsMs(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

// eventType → { icon, label, tint }
const EVENT_META = {
  OPEN: { label: 'Opened', tint: '#34d399' },
  CLOSE: { label: 'Closed', tint: '#94a3b8' },
  SIZE_UPDATE: { label: 'Size increased', tint: '#38bdf8' },
  PARTIAL_CLOSE: { label: 'Partial close', tint: '#fbbf24' },
  SL_UPDATE: { label: 'Stop-loss updated', tint: '#f59e0b' },
  TP_UPDATE: { label: 'Take-profit updated', tint: '#a78bfa' },
};
function eventMeta(t) {
  return EVENT_META[t] || { label: (t || 'Event').replace(/_/g, ' '), tint: '#94a3b8' };
}
function sevColor(sev) {
  if (sev === 'critical') return '#ef4444';
  if (sev === 'warning') return '#f59e0b';
  return '#38bdf8';
}
// breach_type → short human rule name shown on the trade.
const RULE_LABELS = {
  missing_stop_loss: 'No stop-loss',
  risk_per_trade_exceeded: 'Risk per trade',
  daily_loss: 'Daily loss limit',
  daily_target: 'Daily target',
  consecutive_losses: 'Consecutive losses',
  max_trades_day: 'Max trades / day',
  max_total_loss: 'Max total loss',
  kill_switch_incomplete: 'Kill-switch incomplete',
};
function ruleLabel(type) {
  return RULE_LABELS[type] || (type || 'Rule').replace(/_/g, ' ');
}
// trade_opened / trade_closed are informational lifecycle markers, not rules —
// they must not count toward "N rules triggered".
const LIFECYCLE_BREACHES = new Set(['trade_opened', 'trade_closed']);
function isRuleBreach(type) {
  return !LIFECYCLE_BREACHES.has(type);
}

/**
 * Live activity log, grouped by trade. Account-level alerts (daily-loss,
 * cooldown, max-trades lockout — breaches with no tradeUid) sit at the top;
 * each trade is a collapsible group whose lifecycle events load on expand.
 */
export default function ActivityFeed({ accessToken, tradingAccountId }) {
  const [trades, setTrades] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [eventsByUid, setEventsByUid] = useState({});
  const [eventsLoading, setEventsLoading] = useState(() => new Set());

  const load = useCallback(
    async (signal) => {
      if (!accessToken || !tradingAccountId) return;
      try {
        const [t, b] = await Promise.all([
          fetchJournalTrades({ accessToken, tradingAccountId, limit: 100, signal }),
          fetchBreaches({ accessToken, tradingAccountId, limit: 100, signal }),
        ]);
        setTrades(Array.isArray(t) ? t : []);
        setBreaches(Array.isArray(b) ? b : []);
      } catch {
        /* keep last known */
      } finally {
        setLoading(false);
      }
    },
    [accessToken, tradingAccountId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [load]);

  // Only TODAY's activity — resets naturally at local midnight.
  const todaysTrades = useMemo(() => {
    const t0 = startOfTodayMs();
    return trades.filter((t) => {
      const opened = tsMs(pick(t, 'openedAt', 'opened_at'));
      const closed = tsMs(pick(t, 'closedAt', 'closed_at'));
      return Math.max(opened, closed) >= t0;
    });
  }, [trades]);

  // Split today's breaches: account-level (no trade) vs per-trade. Per-trade
  // breaches are matched to a trade by SYMBOL + TIME window, NOT exact tradeUid —
  // the engine's evaluator and journal ingester can mint slightly different uids
  // for the same position (they drift by a few ms), so exact-uid matching misses
  // the alerts.
  const { accountAlerts, perTradeBreaches } = useMemo(() => {
    const t0 = startOfTodayMs();
    const acct = [];
    const perTrade = [];
    for (const br of breaches) {
      const ts = tsMs(pick(br, 'createdAt', 'created_at'));
      if (ts < t0) continue;
      const type = pick(br, 'breachType', 'breach_type');
      // Skip lifecycle markers (trade_opened/trade_closed) — they duplicate the
      // Opened/Closed timeline events and are not rules.
      if (!isRuleBreach(type)) continue;
      const uid = pick(br, 'tradeUid', 'trade_uid');
      if (!uid) {
        acct.push(br);
      } else {
        const ctx = br.context || br.context_json || {};
        const symbol = (typeof uid === 'string' && uid.split(':')[2]) || ctx.symbol || null;
        perTrade.push({ br, symbol, ts });
      }
    }
    return { accountAlerts: acct, perTradeBreaches: perTrade };
  }, [breaches]);

  const toggle = async (uid) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
    if (!eventsByUid[uid] && !eventsLoading.has(uid)) {
      setEventsLoading((s) => new Set(s).add(uid));
      try {
        const ev = await fetchJournalEvents({ accessToken, tradingAccountId, tradeUid: uid });
        setEventsByUid((m) => ({ ...m, [uid]: Array.isArray(ev) ? ev : [] }));
      } catch {
        setEventsByUid((m) => ({ ...m, [uid]: [] }));
      } finally {
        setEventsLoading((s) => {
          const next = new Set(s);
          next.delete(uid);
          return next;
        });
      }
    }
  };

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--dash-text-muted)' }}>Loading activity…</p>;
  }
  if (todaysTrades.length === 0 && accountAlerts.length === 0) {
    return (
      <div className="rounded-2xl border px-5 py-8 text-center" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>No activity today</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
          Today&rsquo;s trades, stop-loss changes, and rule alerts will stream in here as they happen. Resets tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
          Today · {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>resets at midnight</span>
      </div>
      {accountAlerts.length > 0 && (
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
            Account alerts
          </p>
          <ul className="space-y-1.5">
            {accountAlerts.map((br) => (
              <li key={br.id} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sevColor(br.severity) }} />
                <span className="flex-1" style={{ color: 'var(--dash-text-secondary)' }}>{br.message}</span>
                <span className="shrink-0 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{fmtTime(pick(br, 'createdAt', 'created_at'))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {todaysTrades.map((t) => {
        const uid = pick(t, 'tradeUid', 'trade_uid');
        const symbol = pick(t, 'symbol') || '—';
        const side = (pick(t, 'side') || '').toUpperCase();
        const status = (pick(t, 'status') || '').toUpperCase();
        const pnl = n(pick(t, 'pnl', 'realizedPnl', 'realized_pnl'));
        const cur = pick(t, 'currency') || 'USD';
        const openedAt = pick(t, 'openedAt', 'opened_at');
        const closedAt = pick(t, 'closedAt', 'closed_at');
        const isOpen = status === 'OPEN';
        const sideBuy = side === 'BUY';
        // Trade the engine force-closed because the account was in cooldown —
        // it doesn't count toward limits/streak; shown but visually demoted.
        const blocked = Boolean((t.metadata || t.metadata_json || {}).blocked);
        // Match alerts to this trade by symbol + time window (see perTradeBreaches).
        const oMs = tsMs(openedAt);
        const cMs = closedAt ? tsMs(closedAt) : Infinity;
        const tradeBreaches = perTradeBreaches
          .filter((x) => x.symbol === symbol && x.ts >= oMs - 5000 && x.ts <= cMs + 60000)
          .sort((a, b) => a.ts - b.ts)
          .map((x) => x.br);
        const isExp = expanded.has(uid);
        const evs = eventsByUid[uid];
        // Timeline events oldest → newest.
        const sortedEvs = evs
          ? [...evs].sort((a, b) => tsMs(pick(a, 'eventAt', 'event_at')) - tsMs(pick(b, 'eventAt', 'event_at')))
          : evs;

        return (
          <div key={uid || t.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', opacity: blocked ? 0.72 : 1 }}>
            <button
              type="button"
              onClick={() => toggle(uid)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: blocked ? '#94a3b8' : sideBuy ? '#34d399' : '#ef4444' }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{symbol}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: sideBuy ? '#34d399' : '#ef4444' }}>{side}</span>
                  {blocked ? (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: 'rgba(148,163,184,0.18)', color: 'var(--dash-text-secondary)' }}>
                      Blocked · cooldown
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: isOpen ? 'rgba(56,189,248,0.15)' : 'rgba(148,163,184,0.15)', color: isOpen ? '#38bdf8' : 'var(--dash-text-secondary)' }}
                    >
                      {status || '—'}
                    </span>
                  )}
                  {!blocked && tradeBreaches.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      {tradeBreaches.length} rule{tradeBreaches.length > 1 ? 's' : ''} triggered
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>{blocked ? 'Not counted — opened while locked' : fmtTime(openedAt)}</p>
              </div>
              {blocked ? (
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--dash-text-faint)' }}>—</span>
              ) : pnl != null ? (
                <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: pnl >= 0 ? '#34d399' : '#ef4444' }}>
                  {pnl >= 0 ? '+' : '-'}{fmtMoney(Math.abs(pnl), cur)}
                </span>
              ) : null}
              <svg className="h-4 w-4 shrink-0 transition-transform" style={{ color: 'var(--dash-text-muted)', transform: isExp ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExp && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--dash-border)' }}>
                {eventsLoading.has(uid) && !evs ? (
                  <p className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>Loading events…</p>
                ) : (
                  <div className="space-y-4">
                    {/* Section 1 — trade lifecycle */}
                    <section>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--dash-text-faint)' }}>Timeline</p>
                      <ol className="space-y-2.5">
                        {(sortedEvs || []).map((e, i) => {
                          const m = eventMeta(pick(e, 'eventType', 'event_type'));
                          const at = pick(e, 'eventAt', 'event_at');
                          const price = n(pick(e, 'exitPrice', 'exit_price')) ?? n(pick(e, 'entryPrice', 'entry_price')) ?? n(pick(e, 'currentPrice', 'current_price'));
                          const slA = n(pick(e, 'slAfter', 'sl_after'));
                          const evPnl = n(pick(e, 'pnl'));
                          return (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.tint }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="text-xs font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{m.label}</span>
                                  {price ? <span className="text-[11px] tabular-nums" style={{ color: 'var(--dash-text-secondary)' }}>@ {price}</span> : null}
                                  {slA ? <span className="text-[11px] tabular-nums" style={{ color: '#f59e0b' }}>SL {slA}</span> : null}
                                  {evPnl ? <span className="text-[11px] font-semibold tabular-nums" style={{ color: evPnl >= 0 ? '#34d399' : '#ef4444' }}>{evPnl >= 0 ? '+' : ''}{evPnl}</span> : null}
                                </div>
                                <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{fmtTime(at)}</p>
                              </div>
                            </li>
                          );
                        })}
                        {(sortedEvs || []).length === 0 && (
                          <li className="text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>No detailed events captured for this trade.</li>
                        )}
                      </ol>
                    </section>

                    {/* Blocked trades weren't real trades — explain instead of listing rules. */}
                    {blocked && (
                      <section className="border-t pt-3" style={{ borderColor: 'var(--dash-border)' }}>
                        <p className="text-[11px]" style={{ color: 'var(--dash-text-secondary)' }}>
                          Opened while the account was locked, so the engine closed it immediately. It does <span className="font-semibold">not</span> count toward your trade limit, loss streak, or P&amp;L.
                        </p>
                      </section>
                    )}

                    {/* Section 2 — rules that fired on this trade */}
                    {!blocked && tradeBreaches.length > 0 && (
                      <section className="border-t pt-3" style={{ borderColor: 'var(--dash-border)' }}>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                          Rules triggered · {tradeBreaches.length}
                        </p>
                        <ol className="space-y-2.5">
                          {tradeBreaches.map((br) => (
                            <li key={br.id} className="flex items-start gap-2.5">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sevColor(br.severity) }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="text-xs font-semibold" style={{ color: sevColor(br.severity) }}>{ruleLabel(pick(br, 'breachType', 'breach_type'))}</span>
                                  <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: sevColor(br.severity) }}>Triggered</span>
                                </div>
                                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--dash-text-secondary)' }}>{br.message}</p>
                                <p className="text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{fmtTime(pick(br, 'createdAt', 'created_at'))}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
