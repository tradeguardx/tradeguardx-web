import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { fetchCalendar } from '../api/calendarApi';
import { isoDate } from '../lib/calendar';

/**
 * The global upcoming dataset — today through the API's maximum window —
 * shared by the sidebar badge and the calendar's hero strip so both answer
 * "what is the next high-impact release?" from the same rows, regardless of
 * which range the user is browsing. One in-flight request per token; cached
 * for ten minutes.
 */
const TTL_MS = 10 * 60 * 1000;
const WINDOW_DAYS = 62;
let cache = { key: '', at: 0, promise: null, data: null };

export function loadUpcoming({ accessToken, tradingAccountId, tz }) {
  const key = `${accessToken}:${tradingAccountId ?? ''}:${tz}`;
  const fresh = cache.key === key && Date.now() - cache.at < TTL_MS;
  if (fresh && cache.promise) return cache.promise;
  const today = new Date();
  const to = new Date(today.getTime() + WINDOW_DAYS * 86400000);
  const promise = fetchCalendar({ accessToken, from: isoDate(today), to: isoDate(to), tz, tradingAccountId })
    .then((r) => { cache.data = r; return r; })
    .catch((e) => { if (cache.key === key) cache = { key: '', at: 0, promise: null, data: null }; throw e; });
  cache = { key, at: Date.now(), promise, data: cache.key === key ? cache.data : null };
  return promise;
}

export function invalidateUpcoming() { cache = { key: '', at: 0, promise: null, data: null }; }

export function useUpcomingCalendar() {
  const { session } = useAuth();
  const { selectedTradingAccountId } = useTradingAccounts();
  const accessToken = session?.access_token;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [data, setData] = useState(() => cache.data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessToken) return undefined;
    let alive = true;
    loadUpcoming({ accessToken, tradingAccountId: selectedTradingAccountId, tz })
      .then((r) => { if (alive) { setData(r); setError(null); } })
      .catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [accessToken, selectedTradingAccountId, tz]);

  return { data, error };
}
