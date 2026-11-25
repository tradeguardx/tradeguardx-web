import { useCallback, useMemo, useState } from 'react';
import { fetchJournalTrades } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { buildTimeline, tradingDayOf } from '../lib/guardActivity';
import { nextResetAt } from '../lib/dailyReset';
import { useLiveDrivenRefresh } from './useLiveDrivenRefresh';

/* 15 s is the open-positions cadence this hook took over (it used to be a
   separate /trades poll on the Live page); 60 s when live changes drive it. */
const POLL_MS = 15_000;
const BACKSTOP_MS = 60_000;

/**
 * Trades + breach log for one account, joined into the guard timeline
 * (lib/guardActivity). Shared by the Live guard header button (for its count)
 * and the Activity drawer, so both read the same list.
 */
export function useGuardActivity({ accessToken, tradingAccountId, currency = 'USD', account = null, liveRow = null, alertKey = '' }) {
  /* Kept with its account id: after a switch the previous account's trades
     and breaches must not render under the new one while its fetch runs. */
  const [dataS, setData] = useState({ id: null, trades: null, breaches: [] });
  const data = useMemo(
    () => (dataS.id === tradingAccountId ? dataS : { id: tradingAccountId, trades: null, breaches: [] }),
    [dataS, tradingAccountId],
  );
  const [now, setNow] = useState(() => Date.now());

  /* Re-read the moment the live row shows a trade or lock change, or a new
     alert lands in the unread list (alertKey); otherwise on the backstop
     clock (see useLiveDrivenRefresh). The same trades feed the Live page's
     open positions, so one /trades call serves both. */
  const load = useCallback(
    (signal) => {
      if (!accessToken || !tradingAccountId) return;
      Promise.all([
        fetchJournalTrades({ accessToken, tradingAccountId, limit: 100, signal }).catch(() => null),
        fetchBreaches({ accessToken, tradingAccountId, limit: 200, signal }).catch(() => null),
      ]).then(([t, b]) => {
        if (signal.aborted) return;
        setNow(Date.now());
        // A failed refresh keeps what we had rather than emptying the list.
        setData((prev) => {
          const mine = prev.id === tradingAccountId ? prev : { trades: null, fetchedTrades: null, breaches: [] };
          return {
            id: tradingAccountId,
            trades: Array.isArray(t) ? t : mine.trades ?? [],
            // Positions read this: null until a fetch for this account has
            // succeeded, so a failed first fetch is "unknown", never "flat".
            fetchedTrades: Array.isArray(t) ? t : mine.fetchedTrades ?? null,
            breaches: Array.isArray(b) ? b : mine.breaches,
          };
        });
      });
    },
    [accessToken, tradingAccountId],
  );
  const refresh = useLiveDrivenRefresh({
    load,
    enabled: Boolean(accessToken && tradingAccountId),
    resetKey: load,
    row: liveRow,
    extraKey: alertKey,
    fastMs: POLL_MS,
    slowMs: BACKSTOP_MS,
  });

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

  return { items, counts, dayStart, trades: data.fetchedTrades ?? null, refresh };
}
