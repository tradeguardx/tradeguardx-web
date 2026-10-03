import { venueMark } from './shareCards';
import {
  closedTrades,
  dayBuckets,
  fmtDay,
  fmtDayShort,
  guardClosures,
  istDayKey,
  istMonthKey,
  lastTradingDays,
  moneyFns,
  pnlOf,
  ruleShort,
  weekdayShort,
} from './shareData';

/**
 * The four cards, built from one account's real trades.
 *
 * Shape-compatible with SHARE_CARDS in shareCards.js, so the modal, the strip
 * and the PNG export are unchanged — they render whatever this returns.
 *
 * Every card carries `available`. False means there is not enough real
 * activity to make the claim, and the UI hides that tab rather than falling
 * back to the demo figures. Posting a stranger's SOL trade under your own
 * handle is the failure mode this flag exists to prevent.
 *
 * `saved` is set only where counterfactual.js could price it from the price
 * history. Where it could not, the card keeps the real outcome and drops the
 * comparison — see the long note at the top of shareData.js.
 */

const RARE = 'RARE';
const EPIC = 'EPIC';
const LEGENDARY = 'LEGENDARY';

const EMPTY = { available: false };

/**
 * A card has to be worth posting.
 *
 * A trade that made nothing is not an achievement, and offering it as one
 * cheapens every card that is. The strip showed "Green trade — ₹0.00 banked"
 * with a RARE badge on it, which is the feature arguing against itself.
 *
 * Two ways past this gate: the guard did something (a story regardless of the
 * figure), or the trade actually moved the account. "Moved" is relative to the
 * position's own notional rather than an absolute rupee figure, so it means
 * the same thing on a ₹5,000 account and a ₹5,00,000 one.
 */
const MATERIAL_FRACTION = 0.001;

/**
 * The smallest figure worth putting on a card, in the account's own currency.
 *
 * Measured against the user's OWN rule sizes, because those are the only
 * numbers on the account that are definitely denominated in the settling
 * currency. A position's notional is not: entryPrice is quoted in the QUOTE
 * asset, so on Shark comparing a rupee P&L against it is the same
 * currency-mixing that reported a trade as +209.55%.
 *
 * Two per cent of a day's risk. If you set ₹35,000 as a day's worth of loss,
 * then ₹700 is the point where something is worth telling people about and
 * ₹17 plainly is not.
 */
export function materialFloor({ dailyLoss = null, dailyTarget = null } = {}) {
  const base = dailyLoss ?? dailyTarget ?? null;
  return base > 0 ? base * 0.02 : null;
}

/**
 * A card has to be worth posting.
 *
 * A trade that made nothing is not an achievement, and offering it as one
 * cheapens every card that is. The strip showed "Green trade — ₹0.00 banked"
 * with a RARE badge on it, which is the feature arguing against itself.
 *
 * With a floor from the user's rules we use that — it is in the right
 * currency. Without one we fall back to the position's own notional, which is
 * correct wherever the quote asset and the settling asset are the same thing
 * (Delta, CoinDCX) and is the best available answer where they are not.
 */
export function isMaterial(trade, realized, floor = null) {
  if (realized == null) return false;
  const v = Math.abs(realized);
  if (floor != null) return v >= floor;
  const notional = Math.abs(Number(trade?.entryPrice) * Number(trade?.quantity));
  if (!Number.isFinite(notional) || notional <= 0) return v > 0;
  return v / notional >= MATERIAL_FRACTION;
}

/**
 * The badge, earned rather than assigned.
 *
 * Every trade card was RARE, which makes the badge decoration. Then it was
 * RARE for any green close, which is the same problem one step down: closing a
 * trade in profit is not rare, and a rarity chip on it devalues the chip on a
 * card where a rule actually did something.
 *
 * So there is no tier unless the guard acted. A trade the user closed
 * themselves gets "Closed green" and nothing else — which is the honest
 * version of that card, and it also makes the chip mean something when it
 * does appear.
 */
export function tierFor({ guarded, saved }) {
  if (!guarded) return null;
  return saved > 0 ? EPIC : RARE;
}

function heroParts(money) {
  const i = money.lastIndexOf('.');
  return i < 0 ? [money, ''] : [money.slice(0, i), money.slice(i)];
}

function holdText(t) {
  const ms = Date.parse(t.closedAt) - Date.parse(t.openedAt);
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

/**
 * The three tiles under the chart when nothing was saved.
 *
 * The pair of tiles ("Mine" / "If I'd held") only makes sense against an
 * after-path. Without one the row simply vanished, and the card lost the two
 * facts a reader actually wants from it — how long the position was open, and
 * how many rules were standing while it was.
 */
function outcomeTiles({ green, money, realized, held, rulesKept }) {
  return [
    { k: green ? 'Banked' : 'Taken', v: money(realized), c: 'tone', dot: 'tone' },
    { k: 'Held for', v: held || '\u2014' },
    rulesKept > 0 ? { k: 'Rules kept', v: String(rulesKept) } : null,
  ].filter(Boolean);
}

/**
 * Which trade a card is about.
 *
 * Exported because the hook needs the same answer to decide which trade to
 * PRICE. It was computing "the one asked for, or the newest closed" and
 * passing that down as an explicit request — which overrode this rule and
 * pinned the card to the newest closed trade even when that trade was worth
 * nothing. On an account whose last fill made ₹0.00, the trade card vanished
 * entirely and the strip showed one card where it should have shown two.
 */
export function pickTrade({ trades, breaches, tradeUid = null, floor = null }) {
  const list = closedTrades(trades);
  const guards = guardClosures(trades, breaches);
  if (tradeUid) return list.find((x) => x.tradeUid === tradeUid) ?? null;
  const worth = (x) => guards.has(x.tradeUid ?? x.id) || isMaterial(x, pnlOf(x), floor);
  return list.find(worth) ?? null;
}

/**
 * This trade — the newest closed one, or a named one.
 *
 * `counter` is the priced counterfactual for that trade, or null. The card
 * reads very differently with and without it, which is the point: with it the
 * headline is what the rule was worth, without it the headline is simply what
 * the trade did.
 */
export function buildTradeCard({ trades, breaches, currency = 'USD', tradeUid, counter = null, dailyLoss = null, dailyTarget = null, venue = null, rulesKept = 0 }) {
  const list = closedTrades(trades);
  const guards = guardClosures(trades, breaches);
  const floor = materialFloor({ dailyLoss, dailyTarget });

  /*
   * Which trade this card is about.
   *
   * When the user named one, that one — they clicked its row, and quietly
   * showing them a different trade would be worse than showing them a poor
   * card. When nothing was named, the newest trade WORTH showing, not simply
   * the newest: an account whose last fill made nothing still has a good trade
   * behind it, and "Last trade" meaning "last trade worth sharing" is the
   * reading that serves the user.
   */
  const t = pickTrade({ trades, breaches, tradeUid, floor });
  // 'none' means the account has not closed a trade yet; 'immaterial' means it
  // has, and not one of them is worth a card. Different sentences for the UI.
  if (!t) return { ...EMPTY, reason: list.length ? 'immaterial' : 'none' };

  const { money, plain } = moneyFns(currency);
  const key = t.tradeUid ?? t.id;
  const breach = guards.get(key) ?? null;
  const realized = pnlOf(t);

  // The counterfactual is priced for one specific trade. The newest closed
  // trade and the newest GUARD-closed trade are frequently different rows, so
  // without this check the card for one prints the saving computed for the
  // other — a real figure, attached to the wrong trade, under a headline
  // claiming it was this one.
  const priced = counter?.tradeUid && counter.tradeUid === key ? counter : null;

  /*
   * THE AFTER-PATH IS A CLAIM, NOT A DECORATION.
   *
   * The red dashed tail and the red area under it say one thing: "the price
   * kept going and I was not in it". That is only true where something CLOSED
   * the trade for the user. On a trade they closed themselves in profit, the
   * same drawing says they were saved from a move they chose to walk away
   * from — and it sat next to an "If I'd held" tile quoting a figure the card
   * had no business quoting.
   *
   * So the after-path is drawn on exactly one kind of card: the one whose
   * headline is the saving. Everywhere else the chart is the trade's own
   * curve, which also lets it use the full height of the panel rather than
   * sharing the y-axis with a path that is not being shown.
   */
  const ownPath = (p) => chartGeometry(p ? { ...p, A: null } : null);

  // Nothing happened and no rule acted — there is no card here.
  if (!breach && !isMaterial(t, realized, floor)) {
    return { ...EMPTY, reason: 'immaterial', sym: t.symbol };
  }

  const long = !/^(short|sell)/i.test(String(t.side ?? 'long'));
  const lev = t.metadata?.leverage ?? t.leverage;
  const meta = [long ? 'Long' : 'Short', lev ? `${lev}x` : null].filter(Boolean).join(' · ');
  const green = realized >= 0;

  const fmtPx = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—';
  };

  const base = {
    tab: 'This trade',
    // Where the trade actually happened. Never assumed.
    venue: venueMark(venue ?? t.source ?? null),
    // What the panel shows when there is no path to draw.
    facts: [
      { k: 'Entry', v: fmtPx(t.entryPrice) },
      { k: 'Exit', v: fmtPx(t.exitPrice) },
      { k: 'Held', v: holdText(t) || '—' },
    ],
    freshMs: Date.parse(t.closedAt),
    sym: t.symbol || 'Trade',
    meta,
    date: fmtDay(t.closedAt),
    reelStory: 'trade',
    pill: money(realized),
    pillRed: realized < 0,
    available: true,
    tradeUid: t.tradeUid,
  };

  /*
   * THE HEADLINE IS NOT ALWAYS THE SAVING.
   *
   * The handoff's card leads with "saved by my rule", and on its demo trade —
   * a $218 loss against a $1,140 one — that is the right story. On a ₹5.97
   * loss it produced "SAVED BY MY LOSS LIMIT · ₹17.03" as a large mint figure
   * on a trade the user had just LOST money on. Two things wrong at once: the
   * number they recognise as what happened was not the headline, and a losing
   * trade was dressed entirely in green.
   *
   * So the saving leads only when it is worth leading with. Otherwise the
   * headline is the trade's own result, and the colour follows it.
   */
  if (breach && priced?.saved > 0 && isMaterial(t, priced.saved, floor)) {
    /*
     * THE BIG NUMBER IS WHAT THE TRADE MADE. ALWAYS.
     *
     * It used to be the saving, because that is the handoff's concept — "my
     * rule was worth this much". But the saving is a MODELLED figure: it is
     * the realised P&L minus the worst point the price reached afterwards,
     * and nobody can check it against anything. On a trade that banked
     * ₹61,496.54 the card led with ₹72,716.96, and the only possible reaction
     * to that is "where did 72 come from?" — which was the reaction, twice.
     *
     * The one number the user can verify is the one the ledger paid them. It
     * leads. The saving is still here, as a line under it and as the tile
     * beside it, where it reads as context for a figure the reader already
     * trusts rather than as a claim replacing it.
     */
    const [hero, dec] = heroParts(plain(Math.abs(realized)));
    const rule = ruleShort(breach);
    return {
      ...base,
      badge: 'Guard closed',
      label: `Saved by my ${rule.toLowerCase()}`,
      hero,
      dec,
      tone: green ? 'mint' : 'red',
      pillText: `instead of ${money(priced.low)} at the day’s low`,
      headline: green
        ? `My ${rule.toLowerCase()} banked it before the move gave it back.`
        : `My ${rule.toLowerCase()} closed it. The move kept going without me.`,
      heroNote: green ? 'banked' : 'taken',
      // The saving, in the one place it cannot be mistaken for the P&L.
      heroSub: `${plain(priced.saved)} avoided · it ${long ? 'fell' : 'ran'} to ${money(priced.low)}`,
      heldLabel: money(priced.low),
      ach: 'Saved by the guard',
      ruleName: rule,
      tier: tierFor({ guarded: true, saved: priced.saved, green }),
      cap: `My ${rule.toLowerCase()} closed ${t.symbol} at ${money(realized)}. It kept ${long ? 'falling' : 'running'} to ${money(priced.low)}. Saved ${plain(priced.saved)} by a rule I set while calm.`,
      saved: priced.saved,
      // The trade's own path, so the chart draws THIS trade.
      chart: chartGeometry(priced.paths),
      type: 'saved',
      tiles: [
        { k: 'Mine', v: money(realized), c: 'tone', dot: 'tone' },
        { k: 'If I\u2019d held', v: money(priced.low), c: '#ff9b93', dot: '#ff7a70' },
      ],
      savedLabel: plain(priced.saved),
    };
  }

  if (breach) {
    // The guard acted, and either the price did not go on to prove the point
    // or the saving was too small to be the story. The story is the rule
    // holding — and on a loss that is not a green card.
    const rule = ruleShort(breach);
    const [hero, dec] = heroParts(plain(Math.abs(realized)));
    return {
      ...base,
      badge: 'Guard closed',
      label: green ? `Locked in by my ${rule.toLowerCase()}` : `Stopped by my ${rule.toLowerCase()}`,
      hero,
      dec,
      tone: green ? 'mint' : 'red',
      pillText: `${rule} · held ${holdText(t)}`,
      headline: green
        ? `My ${rule.toLowerCase()} locked this one in.`
        : `My ${rule.toLowerCase()} stopped it here.`,
      heroNote: green ? 'banked' : 'taken',
      ach: green ? 'Rule held' : 'Stopped at the limit',
      tier: tierFor({ guarded: true, saved: 0, green }),
      cap: green
        ? `My ${rule.toLowerCase()} locked ${t.symbol} in at ${money(realized)}. I wrote that rule while calm, and it did its job.`
        : `My ${rule.toLowerCase()} closed ${t.symbol} at ${money(realized)} and stopped there. That is the whole point of writing it while calm.`,
      saved: null,
      chart: ownPath(priced?.paths),
      type: 'guard',
      tiles: outcomeTiles({ green, money, realized, held: holdText(t), rulesKept }),
    };
  }

  const [hero, dec] = heroParts(plain(Math.abs(realized)));
  return {
    ...base,
    badge: green ? 'Closed green' : 'Closed',
    label: green ? 'Banked on this trade' : 'Taken on this trade',
    hero,
    dec,
    tone: green ? 'mint' : 'red',
    pillText: `${long ? 'Long' : 'Short'} · held ${holdText(t)}`,
    headline: green
      ? `${t.symbol} closed green, inside my rules.`
      : `${t.symbol} closed red, inside my rules.`,
    heroNote: green ? 'banked' : 'taken',
    ach: green ? 'Green trade' : 'Logged and reviewed',
    tier: tierFor({ guarded: false, saved: 0, green }),
    cap: green
      ? `${t.symbol} closed at ${money(realized)}, inside the rules I set before I opened it.`
      : `${t.symbol} closed at ${money(realized)}. Inside my rules, logged, and reviewed — that is the job.`,
    saved: null,
    chart: ownPath(priced?.paths),
    type: 'plain',
    tiles: outcomeTiles({ green, money, realized, held: holdText(t), rulesKept }),
  };
}

/** Today, in IST. */
export function buildDayCard({ trades, breaches, currency = 'USD', now = Date.now(), savedToday = null , venue = null }) {
  const key = istDayKey(new Date(now));
  const bucket = dayBuckets(trades).find((d) => d.day === key);
  if (!bucket || bucket.count === 0) return EMPTY;

  const { money, plain } = moneyFns(currency);
  const guards = guardClosures(trades, breaches);
  const guarded = bucket.trades.some((t) => guards.has(t.tradeUid ?? t.id));
  const green = bucket.pnl >= 0;
  // The day's own P&L, never the modelled saving. See the note in the trade
  // card: a figure nobody can check does not get to be the big one.
  const [hero, dec] = heroParts(plain(Math.abs(bucket.pnl)));

  return {
    tab: 'Today',
    venue: venueMark(venue),
    sym: 'Daily recap',
    meta: `${bucket.count} ${bucket.count === 1 ? 'trade' : 'trades'} · ${fmtDayShort(bucket.trades[0].closedAt)}`,
    badge: guarded ? 'Guard stepped in' : green ? 'Green day' : 'Day logged',
    label: savedToday > 0 ? 'Kept by my rules' : green ? 'Banked today' : 'Taken today',
    hero,
    dec,
    tone: green ? 'mint' : 'red',
    heroNote: green ? 'banked' : 'taken',
    heroSub: savedToday > 0 ? `${plain(savedToday)} avoided by my rules` : null,
    pill: money(bucket.pnl),
    pillRed: !green,
    pillText: savedToday > 0
      ? `instead of ${money(bucket.pnl - savedToday)} without the guard`
      : guarded
        ? 'your rule closed the day'
        : `${bucket.count} ${bucket.count === 1 ? 'trade' : 'trades'}, all inside the rules`,
    ach: guarded ? 'Quit while ahead' : green ? 'Green day' : 'Day logged',
    tier: guarded ? EPIC : RARE,
    date: fmtDay(bucket.trades[0].closedAt),
    reelStory: 'day',
    cap: savedToday > 0
      ? `My rules closed the day at ${money(bucket.pnl)}. Without them it was heading to ${money(bucket.pnl - savedToday)}.`
      : `${bucket.count} ${bucket.count === 1 ? 'trade' : 'trades'} today, ${money(bucket.pnl)}, every one inside the rules I set while calm.`,
    available: true,
    saved: savedToday > 0 ? savedToday : null,
    days: null,
  };
}

/** The last five trading days that had closed trades. */
export function buildWeekCard({ trades, breaches, currency = 'USD', ghosts = {}, dailyLoss = null , venue = null }) {
  const bucket = lastTradingDays(trades, 5);
  if (bucket.length < 2) return EMPTY;

  const { money, plain } = moneyFns(currency);
  const guards = guardClosures(trades, breaches);

  const days = bucket.map((b) => {
    const guarded = b.trades.some((t) => guards.has(t.tradeUid ?? t.id));
    const ghost = guarded && ghosts[b.day] > 0 ? b.pnl - ghosts[b.day] : null;
    return { d: weekdayShort(b.day), key: b.day, v: b.pnl, ...(ghost != null ? { ghost } : {}) };
  });

  const total = days.reduce((a, d) => a + d.v, 0);
  const noGuard = days.reduce((a, d) => a + (d.ghost ?? d.v), 0);
  const saved = noGuard < total ? total - noGuard : null;
  const up = days.filter((d) => d.v >= 0).length;
  const down = days.length - up;
  // Days the guard actually acted on. Not the same as `down`: a losing day
  // that stayed inside your limit was never stopped by anything, and saying
  // it was is a claim about your rules that did not happen.
  const guarded = days.filter((d) => d.ghost != null).length;
  const green = total >= 0;
  // What the week actually did. The saving goes under it, not over it.
  const [hero, dec] = heroParts(plain(Math.abs(total)));
  const span = `${fmtDayShort(`${bucket[0].day}T12:00:00Z`)} – ${fmtDayShort(`${bucket[bucket.length - 1].day}T12:00:00Z`)}`;

  return {
    tab: 'This week',
    venue: venueMark(venue),
    sym: 'Weekly recap',
    meta: span,
    badge: green ? 'Green week' : 'Week logged',
    label: saved ? 'Kept by my rules' : green ? 'Banked this week' : 'Taken this week',
    hero,
    dec,
    tone: green ? 'mint' : 'red',
    pill: money(total),
    pillRed: !green,
    pillText: saved ? `instead of ${money(noGuard)} without it` : `${up} up · ${down} down`,
    ach: green ? 'Green week' : 'Week logged',
    ruleName: 'rules',
    upDays: up,
    tier: green ? EPIC : RARE,
    date: span,
    reelStory: 'week',
    cap: saved
      ? `${up} green ${up === 1 ? 'day' : 'days'}, ${guarded} ${guarded === 1 ? 'day' : 'days'} the guard stepped in. Week closed ${money(total)} instead of ${money(noGuard)}.`
      : `${up} up, ${down} down, ${money(total)} on the week — every day inside the rules I locked at the start of it.`,
    available: true,
    saved,
    days,
    /*
     * The week as a calendar. See weekCalendar() for why not a chart.
     */
    calendar: weekCalendar(days, currency),
    heldLabel: money(noGuard),
    heroNote: green ? 'banked' : 'taken',
    heroSub: saved ? `${plain(saved)} avoided · ${money(noGuard)} without the guard` : null,
    headline: saved
      ? `${guarded} ${guarded === 1 ? 'day' : 'days'} the guard stepped in. The week still closed ${money(total)}.`
      : `${up} up, ${down} down. Every day inside the rules I locked.`,
    guarded,
    // The reel's limit line. Null draws no line at all, which is correct for
    // an account with no daily-loss rule — there was no limit to stop at.
    dailyLoss,
  };
}

/** The current IST month. */
export function buildMonthCard({ trades, breaches, currency = 'USD', now = Date.now(), ghosts = {} , venue = null }) {
  const key = istMonthKey(new Date(now));
  const bucket = dayBuckets(trades).filter((d) => d.day.startsWith(key));
  if (bucket.length < 3) return EMPTY;

  const { money, plain } = moneyFns(currency);
  const guards = guardClosures(trades, breaches);
  const total = bucket.reduce((a, b) => a + b.pnl, 0);
  const closes = bucket.filter((b) => b.trades.some((t) => guards.has(t.tradeUid ?? t.id))).length;
  const noGuard = bucket.reduce((a, b) => a + (ghosts[b.day] > 0 ? b.pnl - ghosts[b.day] : b.pnl), 0);
  const saved = noGuard < total ? total - noGuard : null;
  const green = total >= 0;
  const [hero, dec] = heroParts(plain(Math.abs(total)));
  const label = new Date(`${key}-15T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });

  return {
    tab: label,
    venue: venueMark(venue),
    sym: 'Monthly recap',
    meta: `${label} · ${bucket.length} ${bucket.length === 1 ? 'day' : 'days'}`,
    badge: green ? 'Green month' : 'Month logged',
    label: saved ? 'Kept by my rules' : green ? 'Banked this month' : 'Taken this month',
    hero,
    dec,
    tone: green ? 'mint' : 'red',
    heroNote: green ? 'banked' : 'taken',
    heroSub: saved ? `${plain(saved)} avoided · ${money(noGuard)} without the guard` : null,
    pill: money(total),
    pillRed: !green,
    pillText: saved
      ? `instead of ${money(noGuard)} without it`
      : `${bucket.length} trading days · ${closes} guard ${closes === 1 ? 'close' : 'closes'}`,
    ach: green ? 'Rule-proof month' : 'Month logged, rules held',
    tier: green ? LEGENDARY : EPIC,
    date: `${label} ${key.slice(0, 4)}`,
    reelStory: 'month',
    cap: saved
      ? `${label}: ${money(total)} with my rules locked. Without them, ${money(noGuard)}.`
      : `${label}: ${money(total)} across ${bucket.length} trading days, ${closes} of them ended by a rule I set while calm.`,
    available: true,
    saved,
    days: null,
  };
}

/** All four, in the order the modal's tabs run. */
export function buildShareCards(input) {
  return {
    trade: buildTradeCard(input),
    day: buildDayCard(input),
    week: buildWeekCard(input),
    month: buildMonthCard(input),
  };
}

/**
 * The Overview strip's four cards.
 *
 * The visual half — the gradient frame, Guardy's colours, the glyph — is the
 * handoff's and is per-kind, so it comes from STRIP_ITEMS. The content half is
 * this account's. Kinds with nothing real behind them are dropped rather than
 * filled in, which is why the strip can show fewer than four.
 */
export function stripItems(cards, { currency = 'USD', visuals, now = Date.now() } = {}) {
  const { plain } = moneyFns(currency);
  const out = [];

  for (const v of visuals ?? []) {
    const c = cards?.[v.kind];
    if (!c?.available) continue;

    const saved = c.saved > 0;
    const green = !c.pillRed;
    const fresh = v.kind === 'trade' && c.freshMs != null && now - c.freshMs < 86_400_000;

    out.push({
      ...v,
      /*
       * "LAST TRADE" was a lie.
       *
       * The card shows the newest trade WORTH showing, which is not the same
       * as the newest trade — so on an account whose last fill was break-even
       * it sat under that heading showing a different day's result. Someone
       * reading it reasonably concluded their flat trade had made ₹67,000.
       * The heading now says what the card is, and carries the date.
       */
      k: v.kind === 'trade'
        ? [saved ? 'Rule save' : c.badge === 'Guard closed' ? 'Rule held' : 'Recent trade', c.date].filter(Boolean).join(' · ')
        : v.kind === 'month' ? c.tab : v.k,
      ach: c.ach,
      tier: c.tier,
      /*
       * And the headline is the P&L, not the saving.
       *
       * "₹67,106.75 saved" at 26px, with "saved" in 9px grey beside it, reads
       * as "I made ₹67,106.75" to anyone moving at normal speed. The number a
       * trader recognises is what their account did; the counterfactual is the
       * interesting extra, and it belongs in the sentence underneath where
       * there is room to say what it means.
       */
      /*
       * The week counts days; everything else shows money.
       *
       * This is the handoff's own framing and it is the right one. A week's
       * story is how many days held, not a rupee total — and a total is what
       * made "₹67,123.78 saved" read as profit on a week whose actual net was
       * something else entirely. "3 green days of 5" cannot be misread.
       */
      ...(v.kind === 'week'
        ? {
          v: String(c.upDays ?? ''),
          vLabel: `green ${c.upDays === 1 ? 'day' : 'days'} of ${c.days?.length ?? 0}`,
          note: c.guarded > 0
            ? `${c.guarded === 1 ? 'One day' : `${c.guarded} days`} stopped by your rules · ${c.pill} on the week`
            : `${c.pill} on the week, every day inside the rules`,
        }
        : {
          v: c.pill,
          vLabel: v.kind === 'trade' ? (green ? 'banked' : 'taken') : 'net',
          note: saved
            ? `${v.kind === 'trade' ? `${c.sym} · ` : ''}your ${String(c.ruleName ?? 'rule').toLowerCase()} saved ${plain(c.saved)} more`
            : v.kind === 'trade' ? `${c.sym} · ${c.pillText}` : c.pillText,
        }),
      fresh,
      // Only the trade and week cards have a real series to draw. The rest
      // render an empty well rather than the handoff's demo shape, which
      // would be a picture of someone else's month.
      // The same day tiles the full card draws. Bars were tried twice and
      // failed the same way both times: with one ₹61k day beside three of a
      // few rupees, every other day is a single pixel whatever the scale.
      series: v.kind === 'week' ? c.calendar : null,
      accent: green ? v.accent : '#ff8a80',
      pill: c.pill,
    });
  }
  return out;
}


/**
 * The "Next to unlock" row, from real activity.
 *
 * Both of these shipped as fixed strings from the handoff — "6 of 10 days",
 * "38 of 90 days, no breaks" — which meant every user saw the same two
 * fictional part-finished achievements forever, under a heading promising to
 * track their progress. They are computable from data the dashboard already
 * has, so they are computed.
 */
export const GREEN_STREAK_TARGET = 10;
export const DISCIPLINE_TARGET = 90;

/** Consecutive most-recent trading days that did not lose money. */
export function greenStreak(trades) {
  const days = dayBuckets(trades);
  let n = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].pnl < 0) break;
    n += 1;
  }
  return n;
}

/**
 * Days since the last rule breach.
 *
 * With no breach on record it counts from the first day we have activity for,
 * because "no breaks" can only be claimed over a period we were watching. An
 * account that connected yesterday has one clean day, not ninety.
 */
export function disciplineDays(trades, breaches, now = Date.now()) {
  const days = dayBuckets(trades);
  if (!days.length) return 0;

  const last = (breaches ?? [])
    .map((b) => Date.parse(b.createdAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  const from = last ?? Date.parse(`${days[0].day}T00:00:00Z`);
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.floor((now - from) / 86_400_000));
}

export function achievements({ cards, trades, breaches, now = Date.now(), locked }) {
  const streak = greenStreak(trades);
  const clean = disciplineDays(trades, breaches, now);

  const rows = (locked ?? []).map((a, i) => {
    const [n, target] = i === 0 ? [streak, GREEN_STREAK_TARGET] : [clean, DISCIPLINE_TARGET];
    const done = n >= target;
    return {
      ...a,
      note: i === 0
        ? `${Math.min(n, target)} of ${target} days`
        : `${Math.min(n, target)} of ${target} days, no breaks`,
      pct: `${Math.min(100, Math.round((n / target) * 100))}%`,
      locked: !done,
      // A finished one is no longer grey.
      gem: done ? 'rgba(240,180,41,.25)' : a.gem,
    };
  });

  // A card you can make is an achievement you have earned; the two below are
  // the ones still running. Six total, which is where the handoff's "4 of 6"
  // came from — it just was not counting anything.
  const earned = Object.values(cards ?? {}).filter((c) => c?.available).length
    + rows.filter((r) => !r.locked).length;

  return { rows, earned, total: 4 + rows.length };
}

/*
 * THE CHART IS 3:1, ALWAYS.
 *
 * It used to be a flexible panel that took whatever height the card had left
 * over, with the path stretched into it. On a 9:16 Story that left over a
 * great deal: the same fourteen points were smeared across a panel twice as
 * tall as it was composed for, which turns a 2% drawdown into a cliff. The
 * shape of a P&L curve IS the claim the card is making, so it cannot be a
 * function of which platform the user is posting to.
 *
 * 300x100 and the panel matches it. A Story's extra height goes to the hero
 * figure, the rule chips and the badge instead.
 */
const CHART_W = 300;
const CHART_H = 100;

/**
 * The card's chart, from the trade's own path.
 *
 * The card shipped with a FIXED polyline lifted from the handoff — the same
 * descending line on every card, whatever the trade did. On a winning trade it
 * drew a falling green line, which is the picture contradicting the number
 * above it. And the hero figure, "what the rule was worth", had no picture at
 * all: the one number the whole card is about was the one thing not drawn.
 *
 * So: P is what the trade actually made, A is what holding would have made,
 * and the region between where it closed and where it went is shaded. That
 * shaded area IS the hero number.
 *
 * Returns null when there is no priced path. A card with no counterfactual
 * draws no chart rather than a decorative one.
 */
export function chartGeometry(paths, { w = CHART_W, h = CHART_H, parallel = false } = {}) {
  const P = paths?.P;
  const A = paths?.A;
  if (!Array.isArray(P) || P.length < 2) return null;

  const tail = Array.isArray(A) && A.length >= 2 ? A : null;
  const all = tail ? P.concat(tail) : P;
  const hi = Math.max(...all, 0);
  const lo = Math.min(...all, 0);
  const span = hi - lo || 1;

  /*
   * Air on all four sides.
   *
   * The panel clips what overflows it, and the line is drawn 3px wide with a
   * 7px glow under it and a 7px marker at the close — so a path that starts at
   * x=0 and peaks at y=0 loses half its stroke to the frame. It looked cropped
   * because it was.
   */
  const padY = h * 0.14;
  const padX = w * 0.045;
  const y = (v) => h - padY - ((v - lo) / span) * (h - padY * 2);

  /*
   * Two layouts, because the two comparisons are different shapes.
   *
   *   sequential  A continues where P stopped — what the price did NEXT. The
   *               x-axis grows past the close.
   *   parallel    A runs alongside P over the same period — the same days
   *               without the guard. Used by the week, where "afterwards" is
   *               not a thing that happened.
   */
  const total = parallel
    ? Math.max(P.length, tail?.length ?? 0) - 1
    : P.length + (tail ? tail.length - 1 : 0) - 1;
  const x = (i) => padX + (i / (total || 1)) * (w - padX * 2);

  const pts = (arr, from = 0) => arr.map((v, i) => `${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const splitX = parallel ? x(total) : x(P.length - 1);
  const closeY = y(P[P.length - 1]);
  const tailFrom = parallel ? 0 : P.length - 1;

  /*
   * Marker positions as PERCENTAGES of the panel, not user units.
   *
   * The SVG is stretched to the panel with preserveAspectRatio="none", which
   * turns every circle into an ellipse — the close marker was a flattened blob
   * whose flattening changed with the card's shape. The dots are HTML divs
   * over the SVG now, so they stay round; what they need from here is where to
   * sit, in units the panel understands.
   */
  const px = (v) => Number(((v / w) * 100).toFixed(3));
  const py = (v) => Number(((v / h) * 100).toFixed(3));

  const dots = [
    { id: 'entry', x: px(x(0)), y: py(y(P[0])) },
    { id: 'exit', x: px(splitX), y: py(closeY) },
  ];
  // Where it would have ended if it had been left open. Only exists when
  // there is an after-path to end.
  if (tail) dots.push({ id: 'held', x: px(x(total)), y: py(y(tail[tail.length - 1])) });

  return {
    w,
    h,
    line: pts(P),
    area: `${pts(P)} ${splitX.toFixed(1)},${h} ${padX.toFixed(1)},${h}`,
    tail: tail ? pts(tail, tailFrom) : null,
    dots,
    // Between what happened and what would have: the saving, drawn.
    gap: tail
      ? parallel
        // Forward along yours, back along theirs — the region between them.
        ? `${pts(P)} ${tail.map((v, i) => `${x(tail.length - 1 - i).toFixed(1)},${y(tail[tail.length - 1 - i]).toFixed(1)}`).join(' ')}`
        : `${pts(tail, tailFrom)} ${(w - padX).toFixed(1)},${closeY.toFixed(1)} ${splitX.toFixed(1)},${closeY.toFixed(1)}`
      : null,
    closeX: splitX,
    closeY,
    padX,
    parallel,
    /*
     * The entry line, which is zero P&L, and it is ALWAYS on the chart: `lo`
     * and `hi` are clamped through zero above, so there is no path on which
     * the line has nowhere to sit. It used to be drawn only when the trade
     * crossed back and forth over break-even — so on a trade that only ever
     * went one way, the single most useful reference line on the chart was
     * missing. It is labelled now, which is the other half of the fix: an
     * unlabelled dotted line is decoration.
     */
    zeroY: y(0),
    zeroPct: py(y(0)),
    rising: P[P.length - 1] >= P[0],
  };
}


/**
 * The week as a calendar, not a chart.
 *
 * A line or a bar chart has to pick one scale for the whole week, and a real
 * week does not cooperate: one day of ₹61,496 beside four of a few rupees
 * gives one block and four invisible slivers, whichever shape you draw. A
 * calendar has no scale at all — every day is the same tile and carries its
 * own figure — so the quiet days stay legible and the big one still obviously
 * dominates, by colour rather than by size.
 *
 * It also reads as what it is. People already know what a week of days looks
 * like.
 */
export function weekCalendar(days, currency = 'USD') {
  if (!Array.isArray(days) || days.length < 2) return null;
  const { compact } = moneyFns(currency);
  const peak = Math.max(...days.map((d) => Math.abs(d.v)), 1);

  return days.map((d) => {
    const up = d.v >= 0;
    const flat = Math.abs(d.v) / peak < 0.005;
    return {
      key: d.key ?? d.d,
      label: d.d,
      text: compact(d.v),
      up,
      flat,
      // Depth of colour stands in for size. A square root rather than a linear
      // share, or the four quiet days of a lopsided week all come out black.
      heat: flat ? 0 : Math.max(0.16, Math.sqrt(Math.abs(d.v) / peak)),
      guarded: d.ghost != null,
    };
  });
}
