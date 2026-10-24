/**
 * GET /api/fx → { base: "INR", rates: { USD: 0.0115, ... }, updated }
 *
 * Daily reference rates for showing our rupee prices in a visitor's currency.
 * The upstream is free and asks callers not to hammer it, so the CDN holds the
 * answer for 12 hours and serves a stale copy for a day while it refreshes —
 * one upstream call per region per half-day, however many visitors there are.
 * Display only: checkout always charges INR.
 */
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://open.er-api.com/v6/latest/INR';

export default async function handler() {
  try {
    const res = await fetch(UPSTREAM);
    const body = await res.json();
    if (!res.ok || body?.result !== 'success' || typeof body?.rates?.USD !== 'number') throw new Error('bad upstream');
    return new Response(
      JSON.stringify({ base: 'INR', rates: body.rates, updated: body.time_last_update_utc ?? null }),
      {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400',
        },
      },
    );
  } catch {
    // The page has built-in fallback rates; a short negative cache stops a
    // flapping upstream from being retried on every visit.
    return new Response(JSON.stringify({ error: 'FX_UNAVAILABLE' }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=300' },
    });
  }
}
