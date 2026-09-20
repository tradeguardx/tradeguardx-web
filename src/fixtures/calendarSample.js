/**
 * Seed GET /calendar payloads, built relative to `now` so every branch of the
 * screen is reviewable on the default view (High + Medium on, Low off):
 * a released beat / miss / inline (all past, so the 0.52 dimming shows), one
 * print inside six hours (IN xH yyM), one beyond (em dash), tentative /
 * all-day / day 1 / day 2, a holiday, a future high-impact event for the
 * hero, and an empty day. Three distinct ranges so the segmented nav
 * demonstrably changes the data.
 *
 * Used by the smoke test, and in local dev only (?demo=1, or when the feed
 * is unreachable) behind a labelled banner.
 */
function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function label(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
function hhmm(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function build(now, spec) {
  const ev = (d, over) => ({
    id: `${over.country}:${over.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${d.toISOString()}`,
    time: hhmm(d), time_status: 'exact', event_time_utc: d.toISOString(),
    actual: null, forecast: null, previous: null, surprise: null,
    is_past: d < now, minutes_until: Math.round((d - now) / 60000), ...over,
  });
  const today = iso(now);
  return spec.map(({ d, events }) => {
    const rows = events.map((e) => (typeof e === 'function' ? e(ev) : e));
    return { date: iso(d), label: label(d), is_today: iso(d) === today, high_impact_count: rows.filter((r) => r.impact === 3).length, events: rows };
  });
}

function at(now, dayOffset, h, m) { const d = new Date(now); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d; }
function startOfWeek(now) { const x = new Date(now.getFullYear(), now.getMonth(), now.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }

/** Days for the week that starts at `start` (Sunday). `week` 0 = this week, 1 = next. */
function weekDays(now, week) {
  const s = startOfWeek(now); s.setDate(s.getDate() + week * 7);
  const day = (i, h, m) => { const d = new Date(s); d.setDate(d.getDate() + i); d.setHours(h, m, 0, 0); return d; };
  const soon = new Date(now.getTime() + 187 * 60000);
  const earlier = new Date(now.getTime() - 5 * 3600000);
  const todayIdx = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - s) / 86400000);
  if (week === 0) {
    // Content is placed by offset from *today* and clamped into the week, so
    // every branch is on the default view whatever weekday it is; collisions merge.
    const slots = new Map();
    const put = (offset, ...evs) => { const i = Math.min(6, Math.max(0, todayIdx + offset)); slots.set(i, [...(slots.get(i) ?? []), ...evs]); };
    const ago = (h) => new Date(now.getTime() - h * 3600000);
    const yday = (h, m) => (todayIdx > 0 ? at(now, -1, h, m) : ago(6));
    put(-1,
      (ev) => ev(yday(13, 30), { title: 'CPI y/y', country: 'GBP', impact: 3, actual: '3.1%', forecast: '3.1%', previous: '3.2%', surprise: 'inline' }),
      (ev) => ev(yday(18, 0), { title: 'Retail Sales m/m', country: 'USD', impact: 3, actual: '0.6%', forecast: '0.2%', previous: '0.1%', surprise: 'beat' }),
      (ev) => ev(yday(18, 0), { title: 'Core Retail Sales m/m', country: 'USD', impact: 2, actual: '0.1%', forecast: '0.3%', previous: '0.4%', surprise: 'miss' }),
    );
    put(0,
      (ev) => ev(earlier, { title: 'Trade Balance', country: 'AUD', impact: 2, actual: '5.2B', forecast: '4.9B', previous: '4.1B', surprise: 'beat' }),
      (ev) => ev(soon, { title: 'Core CPI m/m', country: 'USD', impact: 3, forecast: '0.3%', previous: '0.2%' }),
      (ev) => ev(soon, { title: 'CPI y/y', country: 'USD', impact: 3, forecast: '2.9%', previous: '2.8%' }),
      (ev) => ({ ...ev(at(now, 0, 12, 0), { title: 'BoJ Gov Ueda Speaks', country: 'JPY', impact: 2 }), time: '', time_status: 'tentative' }),
      (ev) => ev(at(now, 0, 23, 30), { title: 'Crude Oil Inventories', country: 'USD', impact: 1, forecast: '−1.2M', previous: '2.4M' }),
    );
    put(1,
      (ev) => ({ ...ev(at(now, 1, 12, 0), { title: 'Bank Holiday', country: 'CNY', impact: 0 }), time: '', time_status: 'all_day' }),
      (ev) => ({ ...ev(at(now, 1, 9, 0), { title: 'OPEC-JMMC Meetings', country: 'EUR', impact: 2 }), time: '', time_status: 'day_n', day_n: 1 }),
      (ev) => ev(at(now, 1, 17, 30), { title: 'ECB Press Conference', country: 'EUR', impact: 3, previous: '4.25%' }),
      (ev) => ev(at(now, 1, 23, 30), { title: 'FOMC Statement', country: 'USD', impact: 3, forecast: '4.50%', previous: '4.50%' }),
    );
    put(2,
      (ev) => ({ ...ev(at(now, 2, 9, 0), { title: 'OPEC-JMMC Meetings', country: 'EUR', impact: 2 }), time: '', time_status: 'day_n', day_n: 2 }),
      (ev) => ev(at(now, 2, 12, 30), { title: 'Employment Change', country: 'CAD', impact: 2, forecast: '25.0K', previous: '−2.8K' }),
    );
    put(4,
      (ev) => ev(at(now, 4, 18, 0), { title: 'Non-Farm Employment Change', country: 'USD', impact: 3, forecast: '165K', previous: '142K' }),
      (ev) => ev(at(now, 4, 18, 0), { title: 'Unemployment Rate', country: 'USD', impact: 3, forecast: '4.2%', previous: '4.2%' }),
    );
    // offset +3 is deliberately left empty (and stays empty unless the week end forces a merge)
    return [0, 1, 2, 3, 4, 5, 6].map((i) => ({ d: day(i, 0, 0), events: slots.get(i) ?? [] }));
  }
  // next week: a different, sparser set
  return [
    { d: day(0, 0, 0), events: [] },
    { d: day(1, 0, 0), events: [(ev) => ev(day(1, 6, 30), { title: 'Cash Rate', country: 'AUD', impact: 3, forecast: '3.60%', previous: '3.60%' })] },
    { d: day(2, 0, 0), events: [(ev) => ev(day(2, 12, 30), { title: 'GDP q/q', country: 'CAD', impact: 2, forecast: '0.4%', previous: '0.5%' })] },
    { d: day(3, 0, 0), events: [
      (ev) => ev(day(3, 12, 0), { title: 'Official Bank Rate', country: 'GBP', impact: 3, forecast: '4.00%', previous: '4.00%' }),
      (ev) => ({ ...ev(day(3, 10, 0), { title: 'German Bank Holiday', country: 'EUR', impact: 0 }), time: '', time_status: 'all_day' }),
    ] },
    { d: day(4, 0, 0), events: [(ev) => ev(day(4, 18, 0), { title: 'Core PCE Price Index m/m', country: 'USD', impact: 3, forecast: '0.2%', previous: '0.3%' })] },
    { d: day(5, 0, 0), events: [(ev) => ev(day(5, 23, 30), { title: 'Caixin Manufacturing PMI', country: 'CNY', impact: 2, forecast: '50.4', previous: '50.1' })] },
    { d: day(6, 0, 0), events: [] },
  ];
}

/** `range`: 'this' | 'next' | 'month' (month = both weeks, plus a few later days). */
export function calendarSample(now = new Date(), range = 'this') {
  const days = range === 'this' ? weekDays(now, 0) : range === 'next' ? weekDays(now, 1) : [
    ...weekDays(now, 0), ...weekDays(now, 1),
    { d: at(now, 15, 0, 0), events: [(ev) => ev(at(now, 15, 18, 0), { title: 'Non-Farm Employment Change', country: 'USD', impact: 3, forecast: '170K', previous: '165K' })] },
  ];
  return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, days: build(now, days), source: { name: 'sample', last_success_at: now.toISOString(), stale: false } };
}
