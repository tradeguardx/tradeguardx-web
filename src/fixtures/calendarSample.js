/**
 * Sample GET /calendar payload, built relative to `now` so the countdown and
 * "IN xH" cells exercise. Used by the smoke test and, in local dev only, as a
 * clearly-labelled fallback when the calendar endpoint is not reachable.
 */
function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function label(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
function hhmm(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export function calendarSample(now = new Date()) {
  const at = (dayOffset, h, m) => { const d = new Date(now); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d; };
  const ev = (d, over) => ({
    id: `${over.country}:${over.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${d.toISOString()}`,
    time: hhmm(d), time_status: 'exact', event_time_utc: d.toISOString(),
    actual: null, forecast: null, previous: null, surprise: null,
    is_past: d < now, minutes_until: Math.round((d - now) / 60000), ...over,
  });
  const soon = new Date(now.getTime() + 187 * 60000);
  const days = [
    { d: at(-1, 0, 0), events: [
      ev(at(-1, 18, 0), { title: 'Retail Sales m/m', country: 'USD', impact: 3, actual: '0.6%', forecast: '0.2%', previous: '0.1%', surprise: 'beat' }),
      ev(at(-1, 18, 0), { title: 'Core Retail Sales m/m', country: 'USD', impact: 2, actual: '0.1%', forecast: '0.3%', previous: '0.4%', surprise: 'miss' }),
      ev(at(-1, 13, 30), { title: 'CPI y/y', country: 'GBP', impact: 3, actual: '3.1%', forecast: '3.1%', previous: '3.2%', surprise: 'inline' }),
    ] },
    { d: at(0, 0, 0), events: [
      ev(at(0, 6, 30), { title: 'Trade Balance', country: 'AUD', impact: 1, actual: '5.2B', forecast: '4.9B', previous: '4.1B', surprise: 'beat' }),
      ev(soon, { title: 'Core CPI m/m', country: 'USD', impact: 3, forecast: '0.3%', previous: '0.2%' }),
      ev(soon, { title: 'CPI y/y', country: 'USD', impact: 3, forecast: '2.9%', previous: '2.8%' }),
      ev(at(0, 23, 30), { title: 'Crude Oil Inventories', country: 'USD', impact: 1, forecast: '−1.2M', previous: '2.4M' }),
      { ...ev(at(0, 12, 0), { title: 'BoJ Gov Ueda Speaks', country: 'JPY', impact: 2 }), time: '', time_status: 'tentative' },
    ] },
    { d: at(1, 0, 0), events: [
      { ...ev(at(1, 12, 0), { title: 'Bank Holiday', country: 'CNY', impact: 0 }), time: '', time_status: 'all_day' },
      ev(at(1, 17, 30), { title: 'ECB Press Conference', country: 'EUR', impact: 3, previous: '4.25%' }),
      ev(at(1, 23, 30), { title: 'FOMC Statement', country: 'USD', impact: 3, forecast: '4.50%', previous: '4.50%' }),
      { ...ev(at(1, 9, 0), { title: 'OPEC-JMMC Meetings', country: 'OIL', impact: 2 }), time: '', time_status: 'day_n', day_n: 1 },
    ] },
    { d: at(2, 0, 0), events: [] },
    { d: at(3, 0, 0), events: [
      ev(at(3, 18, 0), { title: 'Non-Farm Employment Change', country: 'USD', impact: 3, forecast: '165K', previous: '142K' }),
      ev(at(3, 18, 0), { title: 'Unemployment Rate', country: 'USD', impact: 3, forecast: '4.2%', previous: '4.2%' }),
      ev(at(3, 12, 30), { title: 'Employment Change', country: 'CAD', impact: 2, forecast: '25.0K', previous: '−2.8K' }),
    ] },
  ];
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    days: days.map(({ d, events }) => ({
      date: iso(d), label: label(d), is_today: iso(d) === iso(now),
      high_impact_count: events.filter((e) => e.impact === 3).length, events,
    })),
  };
}
