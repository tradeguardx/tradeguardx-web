import { useEffect, useMemo, useState } from 'react';
import { fetchJournalTrades } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { buildTimeline } from '../lib/guardActivity';

const POLL_MS = 30_000;

/**
 * Trades + breach log for one account, joined into the guard timeline
 * (lib/guardActivity). Shared by the Live guard header button (for its count)
 * and the Activity drawer, so both read the same list.
 */
export function useGuardActivity({ accessToken, tradingAccountId, currency = 'USD' }) {
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
  const counts = useMemo(() => {
    const tr = (items ?? []).filter((i) => i.kind === 'trade');
    return { trades: tr.length, acted: tr.filter((i) => i.status.key !== 'clean').length, locks: (items ?? []).filter((i) => i.kind === 'lock').length };
  }, [items]);

  return { items, counts };
}
