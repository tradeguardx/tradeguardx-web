import { useEffect, useMemo, useState } from 'react';
import { fetchJournalTrades } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { STRIP_LOCKED } from '../lib/shareCards';
import { savedFrom, tradePaths } from '../lib/counterfactual';
import { achievements, buildShareCards, materialFloor, pickTrade } from '../lib/shareBuild';
import { buildStories } from '../lib/reelBuild';
import { closedTrades, dailyLossLimit, dailyTargetAmount, guardClosures, istDayKey, ruleChips, ruleLabels, ruleShort, rulesOnCount } from '../lib/shareData';

/**
 * Everything the share system needs for one account, from real data.
 *
 * Two passes, deliberately:
 *
 *   1. Trades and breaches land, and the cards render immediately with the
 *      real figures the ledger knows — P&L, trade counts, which rule fired.
 *   2. The counterfactual ("it kept falling to …") is priced from Binance
 *      candles, which is slower and can fail, and the cards re-render with
 *      the saving where one could be priced.
 *
 * It is two passes because pass 1 is always true and pass 2 sometimes is not.
 * Blocking the modal on a third-party price API would mean a user with a
 * perfectly good trade staring at a spinner because Binance does not list
 * their perp.
 */

// Enough to cover a month of activity without pulling a year. The month card
// only ever reads the current month and the week card the last five trading
// days, so a bigger page buys nothing.
const TRADE_LIMIT = 150;
const BREACH_LIMIT = 100;
// Each pricing is a Binance round-trip. The trade card needs one; the week
// needs one per guarded day. Beyond this the modal is slower than it is
// useful, and the extra days are off the end of the five bars anyway.
const MAX_PRICINGS = 6;

export function useShareData({ accessToken, tradingAccountId, currency = 'USD', rules, handle, referral = null, tradeUid = null, venue = null } = {}) {
  const [raw, setRaw] = useState({ trades: [], breaches: [], loading: true, error: null, key: null });
  // Counterfactuals already priced, keyed by tradeUid. A Map rather than one
  // value because the share modal can be opened from any row of the trades
  // table, and re-pricing a trade the user flicks back to would be a second
  // round-trip for an answer we already have.
  const [priced, setPriced] = useState(() => new Map());
  const [ghosts, setGhosts] = useState({});

  /*
   * Switching account resets during render, not in an effect. An effect that
   * clears the previous account's state paints one frame of the OLD account's
   * saving under the NEW account's heading — which on a card someone is about
   * to post is the worst frame this component could ever show.
   */
  const key = `${accessToken ? 'a' : ''}:${tradingAccountId ?? ''}`;
  if (raw.key !== key) {
    setRaw({ trades: [], breaches: [], loading: Boolean(accessToken && tradingAccountId), error: null, key });
    setPriced(new Map());
    setGhosts({});
  }

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    const ctrl = new AbortController();

    /*
     * Deferred to idle. This provider sits in the dashboard layout, so it
     * fires on every page — including trade detail, whose own narrative call
     * has a 29s Lambda budget and does not need two more requests racing it
     * for the browser's connection pool. Nothing here is above the fold: the
     * share surfaces are at the bottom of Overview and behind a button
     * everywhere else.
     */
    const run = () => {
      if (ctrl.signal.aborted) return;
      Promise.all([
        fetchJournalTrades({ accessToken, tradingAccountId, limit: TRADE_LIMIT, signal: ctrl.signal }).catch(() => []),
        fetchBreaches({ accessToken, tradingAccountId, limit: BREACH_LIMIT, signal: ctrl.signal }).catch(() => []),
      ]).then(([trades, breaches]) => {
        if (ctrl.signal.aborted) return;
        setRaw({ trades: trades ?? [], breaches: breaches ?? [], loading: false, error: null, key });
      });
    };

    const idle = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(run, { timeout: 2500 })
      : setTimeout(run, 600);

    return () => {
      ctrl.abort();
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
    // `key` is derived from exactly these two.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tradingAccountId]);

  // The trade the card is about: the row the user asked for, or the newest
  // closed one when nothing was named.
  // The same rule the card uses, so the trade we PRICE is the trade we SHOW.
  // This used to be "the one asked for, or the newest closed", which on an
  // account whose last fill made nothing pinned the card to that fill and made
  // it disappear.
  const activeUid = useMemo(() => {
    const t = pickTrade({
      trades: raw.trades,
      breaches: raw.breaches,
      tradeUid,
      floor: materialFloor({ dailyLoss: dailyLossLimit(rules), dailyTarget: dailyTargetAmount(rules) }),
    });
    return t ? t.tradeUid ?? t.id : null;
  }, [raw.trades, raw.breaches, tradeUid, rules]);

  /*
   * Pass 2: the price path.
   *
   * Prices the trade on screen, plus one guard-closed trade per day for the
   * week's ghosts.
   *
   * It used to price ONLY guard-closed trades, on the reasoning that a trade
   * the user closed themselves can never earn a "saved" figure. True — but the
   * path is not only there for the saving. It is the trade's own P&L curve,
   * and without it an ordinary trade's card had a large empty panel with one
   * grey line of text in the middle of it. Most trades are ordinary, so most
   * cards were empty.
   */
  useEffect(() => {
    if (raw.loading || !raw.trades.length) return undefined;
    const ctrl = new AbortController();
    const guards = guardClosures(raw.trades, raw.breaches);

    const list = closedTrades(raw.trades).filter((t) => guards.has(t.tradeUid ?? t.id));

    // One per day, newest first — pricing four closes from the same flatten
    // would spend four calls to answer one question.
    const perDay = new Map();
    for (const t of list) {
      const k = istDayKey(t.closedAt);
      if (k && !perDay.has(k)) perDay.set(k, t);
    }
    const picks = [...perDay.entries()].slice(0, MAX_PRICINGS);

    // Whichever trade is on screen, guard-closed or not — it needs its chart.
    const active = activeUid
      ? closedTrades(raw.trades).find((t) => (t.tradeUid ?? t.id) === activeUid)
      : null;
    if (active && !picks.some(([, t]) => (t.tradeUid ?? t.id) === activeUid)) {
      picks.unshift([istDayKey(active.closedAt), active]);
    }

    const todo = picks.filter(([, t]) => !priced.has(t.tradeUid ?? t.id));
    if (!todo.length) return undefined;

    (async () => {
      const got = new Map();
      const found = {};
      for (const [day, t] of todo) {
        if (ctrl.signal.aborted) return;
        const paths = await tradePaths(t, { signal: ctrl.signal });
        const s = savedFrom(paths);
        /*
         * Keep the paths even when there is no saving.
         *
         * `savedFrom` returns null whenever the price went the other way after
         * the close, or no rule fired at all — and storing null then threw the
         * trade's own P&L curve away with it. That is the chart on every
         * ordinary card, which is why most of them were empty.
         */
        const key = t.tradeUid ?? t.id;
        got.set(key, paths ? { ...(s ?? {}), paths, tradeUid: key } : null);
        if (s) found[day] = s.saved;
      }
      if (ctrl.signal.aborted || got.size === 0) return;
      setPriced((m) => new Map([...m, ...got]));
      setGhosts((g) => ({ ...g, ...found }));
    })();

    return () => ctrl.abort();
    // `priced` is read, not tracked: adding it would re-run this effect with
    // every result it stores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, activeUid]);

  const counter = useMemo(() => (activeUid ? priced.get(activeUid) ?? null : null), [priced, activeUid]);

  // Two shapes, deliberately — see ruleLabels() in shareData.js. `labels` are
  // the card's chips; `blocks` are the reel's rail.
  const labels = useMemo(() => ruleLabels(rules, currency), [rules, currency]);
  const blocks = useMemo(() => ruleChips(rules, currency), [rules, currency]);

  const cards = useMemo(
    () => buildShareCards({
      trades: raw.trades,
      breaches: raw.breaches,
      currency,
      tradeUid,
      counter,
      ghosts,
      savedToday: ghosts[istDayKey(new Date())] ?? null,
      dailyLoss: dailyLossLimit(rules),
      dailyTarget: dailyTargetAmount(rules),
      // Every enabled rule, not the four the chip row has space for — the
      // "Rules kept" tile is a count, and a capped count is a wrong one.
      rulesKept: rulesOnCount(rules),
      venue,
    }),
    [raw.trades, raw.breaches, currency, tradeUid, counter, ghosts, rules, venue],
  );

  const kinds = useMemo(() => ['trade', 'day', 'week', 'month'].filter((k) => cards[k]?.available), [cards]);

  // Only the stories this account can tell truthfully — see reelBuild.js.
  const stories = useMemo(() => {
    const guards = guardClosures(raw.trades, raw.breaches);
    // The same trade the card is about — not the newest guard-closed one.
    // A reel animating a different trade from the card beside it is the
    // mismatch this hook exists to prevent.
    const t = closedTrades(raw.trades).find((x) => (x.tradeUid ?? x.id) === activeUid) ?? null;
    const breach = t ? guards.get(t.tradeUid ?? t.id) : null;
    /*
     * The paths go through whether or not a rule fired.
     *
     * They used to be gated on the breach, on the reasoning that the reel is
     * the story of a guard stepping in. It is — when one did. For every other
     * trade the same curve tells the account's own story, and withholding it
     * meant the Reel tab was greyed out for nearly everyone who opened the
     * modal. reelBuild decides which story the paths support; this just stops
     * pre-emptively throwing them away.
     */
    return buildStories({
      cards,
      trade: t,
      paths: counter?.paths ?? null,
      rule: breach ? ruleShort(breach) : null,
      currency,
      rulesKept: rulesOnCount(rules),
    });
  }, [cards, counter, activeUid, raw.trades, raw.breaches, currency, rules]);

  const awards = useMemo(
    () => achievements({ cards, trades: raw.trades, breaches: raw.breaches, locked: STRIP_LOCKED }),
    [cards, raw.trades, raw.breaches],
  );

  return {
    cards,
    stories,
    awards,
    kinds,
    rules: labels,
    ruleBlocks: blocks,
    handle,
    referral,
    counter,
    loading: raw.loading,
    /** Nothing real to share yet — the UI hides its entry points rather than
        showing the design's demo trade under this user's name. */
    empty: !raw.loading && kinds.length === 0,
  };
}

/** "@name" from whatever the account actually knows about the user. */
export function handleFrom(user) {
  const base = user?.name || user?.email?.split('@')[0] || '';
  const slug = String(base).trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  return slug ? `@${slug}` : null;
}
