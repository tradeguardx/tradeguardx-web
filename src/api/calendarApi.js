import { apiGet, apiPost } from './httpClient';
import { TRADE_API_BASE_URL } from './config';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * GET /calendar?from=&to=&impact=&countries=
 * Returns { timezone, days: [{ date, label, is_today, high_impact_count, events: [...] }] }.
 * Times in `events[].time` are already in the user's timezone; countdowns
 * must still be computed client-side from `event_time_utc`.
 */
export async function fetchCalendar({ accessToken, from, to, impact, countries, tz, tradingAccountId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (impact) q.set('impact', String(impact));
  if (countries?.length) q.set('countries', countries.join(','));
  if (tz) q.set('tz', tz);
  if (tradingAccountId) q.set('tradingAccountId', tradingAccountId);
  const payload = await apiGet(`/calendar?${q.toString()}`, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return { timezone: data?.timezone ?? null, days: Array.isArray(data?.days) ? data.days : [], source: data?.source ?? null };
}

/**
 * POST /calendar/locks — schedule a killswitch lock around one event.
 * Body: { tradingAccountId, eventId, lockFrom, lockUntil } (ISO timestamps).
 */
export async function scheduleCalendarLock({ accessToken, tradingAccountId, eventId, lockFrom, lockUntil, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiPost('/calendar/locks', { tradingAccountId, eventId, lockFrom, lockUntil }, {
    signal,
    baseUrl: TRADE_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}
