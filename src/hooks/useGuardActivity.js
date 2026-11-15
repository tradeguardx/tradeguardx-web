import { useEffect, useMemo, useState } from 'react';
import { fetchJournalTrades } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { buildTimeline, tradingDayOf } from '../lib/guardActivity';
import { nextResetAt } from '../lib/dailyReset';

const POLL_MS = 30_000;

/**
 * Trades + breach log for one account, joined into the guard timeline
 * (lib/guardActivity). Shared by the Live guard header button (for its count)
 * and the Activity drawer, so both read the same list.
 */
export function useGuardActivity({ accessToken, tradingAccountId, currency = 'USD', account = null }) {
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
        // A failed refresh keeps what we had rather than emptying the list.
        setData((prev) => ({ trades: Array.isArray(t) ? t : prev.trades ?? [], breaches: Array.isArray(b) ? b : prev.breaches }));
      });
    load();
    const id = setInterval(load, POLL_MS);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [accessToken, tradingAccountId]);

  const items = useMemo(() => (data.trades ? buildTimeline(data.trades, data.breaches, { now, currency }) : null), [data, now, currency]);
  /*
   * Counts are for the TRADING day — since the account's last daily reset
   * (05:30 IST for India) — the same day the trade limit and loss limit count.
   * A rolling 24 hours showed "Trades 3" beside a "Trades today 2/3" card
   * (14 Nov 2026): last night's trade was in the window but not in the limit,
   * and a trader read it as the limit being wrong.
   */
  const next = account ? nextResetAt(account, now) : null;
  const dayStart = next ? next - 86_400_000 : null;
  const counts = useMemo(() => {
    const today = (items ?? []).filter((i) => tradingDayOf(i, dayStart) === 'today');
    const tr = today.filter((i) => i.kind === 'trade');
    return { trades: tr.length, acted: tr.filter((i) => i.status.key !== 'clean').length, locks: today.filter((i) => i.kind === 'lock').length };
  }, [items, dayStart]);

  return { items, counts, dayStart };
}
