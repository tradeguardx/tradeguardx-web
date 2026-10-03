import { MINT, RED, STORIES } from './reelStories';
import { moneyFns, weekdayShort } from './shareData';

/**
 * A reel story from one account's real data.
 *
 * Same shape as the hand-written STORIES in reelStories.js, so ShareReel is
 * unchanged — it renders whatever it is handed. What differs is where every
 * number comes from.
 *
 * Two of the four can be built honestly today:
 *
 *   trade  needs the price path during the trade and the one after it, which
 *          counterfactual.js produces from candles. Without that path there
 *          is no chart to animate and no "it kept falling" to claim, so this
 *          returns null and the modal offers the card instead of the reel.
 *   week   needs one bar per trading day, which the ledger has, plus a ghost
 *          per guarded day, which it does not. Bars without ghosts still make
 *          a true story — "five days, two stopped at the limit" — so the week
 *          reel builds either way and simply omits what it cannot price.
 *
 * `day` and `month` are deliberately NOT built from real data here. Both of
 * the handoff's versions are driven by an intraday equity curve the journal
 * does not store: it records closed trades, not a running balance. Animating
 * a curve between them would be drawing a path the account never took, on the
 * artefact the user posts publicly. They fall back to the card.
 */

const CAPTION_SLOTS = 6;

function caps(list) {
  // The caption schedule has exactly six slots; a short list leaves the back
  // third of the reel silent, and a long one renders captions nobody sees.
  const out = list.filter(Boolean).slice(0, CAPTION_SLOTS);
  while (out.length < CAPTION_SLOTS) out.push(out[out.length - 1] ?? '');
  return out;
}

/**
 * The trade reel: the account's own trade, its own chart, its own rule.
 *
 * `paths` is counterfactual.js's output — P during the trade, A after it,
 * both already scaled so P ends exactly on the ledger's realised figure.
 */
export function tradeStory({ trade, card, paths, rule, currency = 'USD' }) {
  if (!paths?.P?.length || !paths?.A?.length || !card?.available) return null;
  /*
   * The rule is not decoration here, it is the premise.
   *
   * Every caption, the stamp and the big second figure all say "your rule
   * closed it". The after-path is now priced for ORDINARY trades too — it is
   * what draws their chart — so without this check a trade the user closed
   * themselves, that happened to be followed by a move in their favour, would
   * get the full "SAVED BY YOUR RULE" reel for a rule that never fired.
   */
  if (!rule) return null;

  const { money, plain } = moneyFns(currency);
  const realized = paths.P[paths.P.length - 1];
  const saved = realized - paths.worstAfter;
  if (!(saved > 0)) return null;

  const long = !/^(short|sell)/i.test(String(trade.side ?? 'long'));
  const win = realized >= 0;
  const sym = trade.symbol || 'Position';
  const ruleName = rule || 'rule';

  // Scales Guardy's mood and his arms. The reel was tuned against a ±$200
  // trade; k keeps a ₹50,000 one from pinning every expression at full tilt.
  const k = Math.max(1, Math.abs(realized) / 220);

  return {
    P: paths.P,
    A: paths.A,
    mode: 'after',
    win,
    k,
    limit: 0,
    limitLabel: '',
    limitC: win ? MINT : RED,
    lit: 0,
    saved,
    sym,
    tag: long ? 'LONG' : 'SHORT',
    liveLabel: 'LIVE P&L',
    savedLabel: `SAVED BY YOUR ${ruleName.toUpperCase()}`,
    // The reveal here IS the saving, which is a positive amount avoided.
    savedNeg: false,
    stamp: `Guard closed at ${money(realized)}`,
    heldPre: long ? 'If you’d held, it went to ' : 'If you’d held, it ran to ',
    held: money(paths.worstAfter),
    near: () => 0,
    card: {
      sym,
      meta: card.meta,
      badge: card.badge,
      label: card.label,
      pill: card.pill,
      pillC: card.pillRed ? RED : MINT,
      pillText: card.pillText,
      // Signed, and coloured by the sign. The end card used to print
      // `story.saved` — a magnitude — in a hard-coded mint.
      hero: money(realized),
      heroC: win ? MINT : RED,
      tiles: [
        ['Closed at', money(realized), card.pillRed ? '#ff8a80' : MINT],
        ['If held', money(paths.worstAfter), '#c9d2e0'],
        ['Rule', ruleName, '#fff'],
      ],
      ach: card.ach,
      tier: card.tier,
      achText: `Your ${ruleName.toLowerCase()} closed it before the move kept going.`,
      date: card.date,
    },
    caps: caps([
      'You set your rules before you traded.',
      'Then locked them, so you couldn’t change your mind mid-trade.',
      `You went ${long ? 'long' : 'short'} ${sym}.`,
      'Then it turned against you.',
      `Your ${ruleName.toLowerCase()} closed it at ${money(realized)}.`,
      `It kept going. You didn’t — ${plain(saved)} of it.`,
    ]),
  };
}

/** "2h 14m". Empty when the ledger's two timestamps cannot give one. */
function holdText(t) {
  const ms = Date.parse(t?.closedAt) - Date.parse(t?.openedAt);
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

/**
 * The trade reel when no rule stepped in.
 *
 * MOST TRADES ARE ORDINARY. Someone opened a position, it moved, they closed
 * it themselves, and every rule they had written was standing the whole time.
 * That is a true story, it is the one nearly every account has, and gating
 * the reel on a guard close meant the format was dead for almost everyone who
 * opened the modal — a greyed-out tab and a paragraph explaining why they
 * could not have the thing they came for.
 *
 * Same eight beats, same timings. What changes is the reveal: there is no
 * path the trade did not take, so the second act is the result itself landing
 * under "inside my rules" rather than a saving under "saved by my rule".
 * Nothing is invented to fill the gap — `A` is a single point sitting exactly
 * on the close, so the chart simply does not widen and no second line is ever
 * drawn.
 */
export function ownTradeStory({ trade, card, paths, currency = 'USD', rulesKept = 0, rule = null }) {
  if (!paths?.P?.length || !card?.available || !trade) return null;

  const { money } = moneyFns(currency);
  const realized = paths.P[paths.P.length - 1];
  const win = realized >= 0;
  const long = !/^(short|sell)/i.test(String(trade.side ?? 'long'));
  const sym = trade.symbol || 'Position';
  const held = holdText(trade);

  // Same scaling as the guard story: the reel was tuned against a ±$200
  // trade, and k keeps a ₹50,000 one from pinning Guardy at full tilt.
  const k = Math.max(1, Math.abs(realized) / 220);

  return {
    P: paths.P,
    // One point, exactly on the close. There is no "afterwards" being
    // claimed, and a single point keeps the x-axis from widening into empty
    // space during the reveal.
    A: [realized],
    mode: 'own',
    win,
    k,
    limit: 0,
    limitLabel: '',
    limitC: win ? MINT : RED,
    lit: 0,
    // The figure the second act counts up to is the result itself.
    saved: Math.abs(realized),
    savedC: win ? MINT : RED,
    sym,
    tag: long ? 'LONG' : 'SHORT',
    liveLabel: 'LIVE P&L',
    savedLabel: rule
      ? `CLOSED BY MY ${rule.toUpperCase()}`
      : win ? 'BANKED, INSIDE MY RULES' : 'TAKEN, INSIDE MY RULES',
    stamp: rule ? `${rule} closed it at ${money(realized)}` : `Closed at ${money(realized)}`,
    // A LOSING trade shows its minus. The reveal figure was unsigned, so a
    // ₹5.97 loss read as a bare ₹5.97 under a label people scroll past.
    savedNeg: !win,
    // No counterfactual, so no "if you'd held" line. The slot stays empty
    // rather than being filled with something we cannot stand behind.
    heldPre: '',
    held: '',
    near: () => 0,
    card: {
      sym,
      meta: card.meta,
      badge: card.badge,
      label: card.label,
      pill: card.pill,
      pillC: card.pillRed ? RED : MINT,
      pillText: card.pillText,
      hero: money(realized),
      heroC: win ? MINT : RED,
      tiles: [
        ['Closed at', money(realized), win ? MINT : '#ff8a80'],
        ['Held for', held || '\u2014', '#fff'],
        ['Rules kept', rulesKept > 0 ? String(rulesKept) : '\u2014', '#c9d2e0'],
      ],
      ach: card.ach,
      tier: card.tier,
      achText: rule
        ? `Your ${rule.toLowerCase()} closed it and stopped there. That is the whole point of writing it while calm.`
        : win
          ? 'Opened, held and closed inside the limits you set while calm.'
          : 'It went against you and still never left the limits you set.',
      date: card.date,
    },
    /*
     * The captions have to know whether a rule fired.
     *
     * This story is used for a guard close too — whenever the saving could
     * not be priced, or was too small to be the headline. It said "you closed
     * it yourself" and "not one of them had to fire" on a card whose badge
     * read GUARD CLOSED and whose caption said the loss limit closed it. Two
     * statements, on the same artefact, contradicting each other.
     */
    caps: caps([
      'You set your rules before you traded.',
      'Then locked them, so you couldn\u2019t change your mind mid-trade.',
      `You went ${long ? 'long' : 'short'} ${sym}.`,
      held ? `You held it ${held}.` : 'You watched it move.',
      rule
        ? `Your ${rule.toLowerCase()} closed it at ${money(realized)}.`
        : `You closed it yourself at ${money(realized)}.`,
      rule
        ? 'It stopped exactly where you said it would.'
        : rulesKept > 0
          ? `${rulesKept} rules standing the whole way. Not one of them had to fire.`
          : 'Inside every limit, start to finish.',
    ]),
  };
}

/** The week reel: one bar per trading day, ghosts only where we priced them. */
export function weekStory({ card, currency = 'USD' }) {
  const days = card?.days;
  if (!card?.available || !days?.length || days.length < 2) return null;

  const { money } = moneyFns(currency);
  const total = days.reduce((a, d) => a + d.v, 0);
  const noGuard = days.reduce((a, d) => a + (d.ghost ?? d.v), 0);
  const saved = card.saved ?? null;
  const up = days.filter((d) => d.v >= 0).length;
  const down = days.length - up;
  const guarded = card.guarded ?? days.filter((d) => d.ghost != null).length;
  const win = total >= 0;

  // Cumulative, for the card's mini chart. The reel itself draws bars.
  const P = [0];
  const A = [0];
  for (const d of days) {
    P.push(P[P.length - 1] + d.v);
    A.push(A[A.length - 1] + (d.ghost ?? d.v));
  }

  const k = Math.max(1, Math.abs(total) / 400);

  return {
    days: days.map((d) => ({ d: d.d || weekdayShort(d.key), v: d.v, ...(d.ghost != null ? { ghost: d.ghost } : {}) })),
    P,
    A,
    mode: 'parallel',
    win,
    k,
    limit: 0,
    limitLabel: '',
    // The bar chart's own limit line, in account units. Null draws none.
    limitAbs: card.dailyLoss ?? null,
    limitC: RED,
    lit: 0,
    saved: saved ?? Math.abs(total),
    sym: 'THIS WEEK',
    tag: String(card.meta || '').toUpperCase(),
    liveLabel: 'WEEK P&L',
    savedLabel: saved ? 'THE GUARD WAS WORTH' : win ? 'BANKED THIS WEEK' : 'TAKEN THIS WEEK',
    stamp: `Week closed at ${money(total)}`,
    heldPre: 'Same week without the guard: ',
    held: money(noGuard),
    near: () => 0,
    card: {
      sym: 'Weekly recap',
      meta: card.meta,
      badge: card.badge,
      label: card.label,
      pill: card.pill,
      pillC: card.pillRed ? RED : MINT,
      pillText: card.pillText,
      hero: money(total),
      heroC: win ? MINT : RED,
      tiles: [
        ['Week', money(total), card.pillRed ? '#ff8a80' : MINT],
        ['Days', `${up} up · ${down} down`, '#fff'],
        saved ? ['Without guard', money(noGuard), '#c9d2e0'] : ['Guard closes', String(guarded), '#c9d2e0'],
      ],
      ach: card.ach,
      tier: card.tier,
      achText: `${up} green ${up === 1 ? 'day' : 'days'}, ${guarded} the guard closed, 0 rule edits.`,
      date: card.date,
    },
    caps: caps([
      'You locked your rules at the start of the week.',
      'No edits allowed.',
      'One bar a day. Watch the red ones.',
      guarded
        ? `The guard stepped in on ${guarded} of them.`
        : 'Every day stayed inside them.',
      `The week closes ${money(total)}.`,
      saved ? `Without the guard, it was ${money(noGuard)}.` : `${up} up, ${down} down, rules held.`,
    ]),
  };
}

/**
 * The stories this account can actually tell, keyed the way SHARE_CARDS is.
 *
 * Anything absent means the modal hides the Reel format for that tab rather
 * than playing the handoff's demo in its place.
 */
export function buildStories({ cards, trade, paths, rule, currency = 'USD', rulesKept = 0 }) {
  const out = {};
  /*
   * The reel and the card must tell the SAME story.
   *
   * `card.type` is the one place that decides which of the three a trade is,
   * so the reel reads it rather than re-deriving it from the paths and
   * arriving somewhere else. The fallback covers the case where the guard
   * story cannot be built after all — a card whose headline is the saving
   * still beats no reel at all, told as the trade's own run.
   */
  const t = (cards?.trade?.type === 'saved'
    ? tradeStory({ trade, card: cards?.trade, paths, rule, currency })
    : null)
    ?? ownTradeStory({ trade, card: cards?.trade, paths, currency, rulesKept, rule });
  if (t) out.trade = t;
  const w = weekStory({ card: cards?.week, currency });
  if (w) out.week = w;
  return out;
}

/** The demo stories, for the standalone preview page only. */
export const DEMO_STORIES = STORIES;
