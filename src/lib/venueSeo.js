import { DELTA_EGRESS_IP } from '../api/config';
import { SITE } from './publicRoutes';

/**
 * The venue pages: /exchanges, /exchanges/<venue>, /exchanges/<venue>/<guide>.
 *
 * WHY THIS EXISTS. The help centre picked its venue with React state
 * (`useState(DOC_BROKERS[0].id)`), not a route param. So /help/getting-started
 * served Delta's article to every crawler, CoinDCX's version had no URL at all,
 * and Shark — live and connectable — was not in the toggle, so it was
 * unreachable even by clicking. Three venues, one crawlable venue page. Routing
 * on state is invisible to search, and a venue nobody can link to is a venue
 * nobody finds.
 *
 * THE HUB IS THE KILL-SWITCH PAGE. There is deliberately no
 * /exchanges/delta/kill-switch: it would target the same query as its own
 * parent, and the parent would lose, because an internal link graph pointing at
 * two pages for one intent splits the signal rather than doubling it. For the
 * same reason the slug does not repeat the venue (/exchanges/delta, never
 * /exchanges/delta-kill-switch) and nesting stops at two levels.
 *
 * WHAT MAY NOT BE INVENTED HERE. Every factual claim below is carried from
 * somewhere else in this repo — exchangeDocs.js, venues.js, or the engine's own
 * rule files — and nowhere does this file state a latency figure, a rule, or a
 * permission that is not already established there. A page that oversells what
 * the guard does costs a refund and a chargeback, so where per-venue behaviour
 * is genuinely unknown it is left as a TODO rather than written as support.
 */

/**
 * The rules the risk engine actually implements, one per row.
 *
 * Verified against tradeguardx-risk-engine/src/rules/: closeAfterLosses,
 * dailyLoss, dailyTarget, maxTotalLoss, maxTradesDay, riskPerTrade,
 * stopLossAlert. Seven files, seven rows.
 *
 * `fires` is the honest column and the reason the table is here rather than a
 * list of seven flattering names. Three of these seven never close anything,
 * and a trader who believes Max Drawdown is a floor has bought a floor that
 * does not exist.
 *
 * SUPPORT IS NOT PER-VENUE. There is no exchange or venue conditional anywhere
 * in the engine's rule files — the rules read positions, orders and equity
 * through the adapter and behave identically wherever the key points. So this
 * one table is correct for all three live venues, and the genuine per-venue
 * differences (what is readable at all, what settles in which currency) are
 * stated on each venue instead.
 *
 * TODO: rule_templates also carries `hedging`, `minimum-hold` and `stacking`.
 * They have no implementation in the risk engine — they were enforced by the
 * frozen browser extension. They are NOT listed as supported on any venue until
 * an engine rule exists, because listing them would be a claim we cannot keep.
 */
export const ENFORCED_RULES = [
  {
    name: 'Daily Loss Protection',
    does: 'Cancels every open order, market-closes every position, and locks the account until your next daily reset.',
    fires: 'full',
    detail: 'Measures trading result, so a deposit does not move it.',
  },
  {
    name: 'Max Trades Per Day',
    does: 'Locks the account for the rest of the day once you hit your trade count.',
    fires: 'full',
    detail: 'Trades blocked by a lock are free — they do not count toward the limit.',
  },
  {
    name: 'Daily Profit Target',
    does: 'Locks the day once you have BOOKED your target and are flat, so the win survives the afternoon.',
    fires: 'full',
    detail: 'It never force-closes an open winner.',
  },
  {
    name: 'Close After N Losses',
    does: 'Pauses trading after a losing streak. Two tiers, each firing once per streak: a soft lock at your chosen count (3 losses → 3h by default) and a hard lock if it continues (5 → 12h).',
    fires: 'full',
    detail: 'A win resets the streak before either tier.',
  },
  {
    name: 'Risk Per Trade',
    does: 'Closes the single position whose stop-loss implies more risk than your limit, and leaves the rest of the account alone.',
    fires: 'one position',
    detail: 'It does not cancel your other orders and does not lock the account.',
  },
  {
    name: 'Stop-Loss Protection',
    does: 'Tells you a position is sitting open with no stop attached.',
    fires: 'alert only',
    detail: 'It never closes it. Force-closing you for not having set a stop yet would be worse than the problem.',
  },
  {
    name: 'Max Drawdown Lock',
    does: 'Notifies when the account is down past your threshold from its starting balance.',
    fires: 'alert only',
    detail: 'Alert only today, despite the name — it does not close or lock. Do not rely on it as a floor.',
  },
];

/** Shared closing section: the same engine sits behind every venue. */
const sharedBreachSection = (venue) => ({
  h: `What happens when you breach your limit on ${venue}`,
  p: [
    'Three steps, in this order, every time. Your open orders are cancelled. Every open position is market-closed — then verified, and retried if the exchange says otherwise, because assuming an instruction landed is how a guard quietly fails. Then the account is locked for a cooldown.',
    'The lock is written to the database before any closing starts, so a crash mid-close cannot leave you unlocked. It survives an engine restart and is lifted by the clock alone, never by an error. Anything you open during that window is closed on sight and does not count as a trade.',
    `We cannot stop an order from reaching ${venue}. No exchange hands a third party that switch, and anyone who says otherwise is selling something. What we do is close the position immediately after it opens and then confirm you are flat.`,
  ],
});

const sharedWithdrawSection = (venue, sentence) => ({
  h: 'Can TradeGuardX withdraw my funds?',
  p: [
    'No, and you should refuse any risk tool that asks. Your funds never leave your own exchange wallet — we never hold them.',
    sentence,
    `The key is also pinned to a single IP address (${DELTA_EGRESS_IP}), so it only works from our engine and nowhere else. Your secret is encrypted with KMS before storage and is never shown again, not even to you.`,
  ],
});

/**
 * Venue pages, in the order they appear on /exchanges.
 *
 * `title` is used verbatim (rawTitle in useSEO) rather than having
 * " — TradeGuardX" appended, because the suffix pushes every one of these past
 * the ~60 characters Google renders. Where "<Venue> Kill Switch — Auto-Close
 * Positions | TradeGuardX" fits, it is used as-is; where the venue's full name
 * makes it overflow, the middle clause is shortened rather than the venue name,
 * because the venue name is the part carrying the query. venueSeo.test.js
 * enforces the 60-char ceiling and that no two pages share a title or an H1.
 */
const VENUE_PAGES = {
  // ── Shark: live and connectable, and until now with no documentation at all.
  shark: {
    slug: 'shark',
    name: 'Shark',
    longName: 'Shark Exchange',
    status: 'live',
    beta: false,
    title: 'Shark Exchange Kill Switch — Auto-Close | TradeGuardX',
    description:
      'Set a daily loss limit on Shark Exchange and have it enforced. TradeGuardX cancels your orders, closes your positions and locks the account from our servers, in rupees.',
    h1: 'Kill switch for Shark Exchange',
    lede:
      'Connect a Shark Exchange API key with Trade Futures enabled, set your daily loss limit once, and our engine enforces it — cancelling orders, closing positions and locking the account without you having to be at the screen.',
    sections: [
      sharedBreachSection('Shark Exchange'),
      {
        h: 'What is different about Shark Exchange',
        p: [
          'Shark settles in INR. Your equity, your P&L and every limit you set are rupee figures that reconcile to the paisa against Shark\'s own statement — there is no USD conversion sitting between your loss limit and what the exchange says you lost.',
          'Shark issues every API key as Read only. The permission that lets anything be closed is called Trade Futures, and it is edited after the key already exists — which is the moment people think they are finished and navigate away. Without it we can watch the account and send you alerts, and the kill switch will do nothing at all.',
          'Shark does not publish an exit price on a closed position, so a closed trade\'s realised result is reconstructed rather than read off the exchange. It does not affect enforcement — the guard acts on live positions and marks — but it is why a Shark journal entry shows less fill detail than a Delta one.',
        ],
      },
      {
        h: 'Which Shark Exchange rules can TradeGuardX enforce?',
        rulesTable: true,
        p: [
          'All seven on Shark Exchange, with the same behaviour as every other exchange — it is one engine behind all of them. Shark came out of beta once a real key had run through it end to end and the daily-loss rule had fired on a live account.',
        ],
      },
      {
        h: 'How do I connect my Shark Exchange account?',
        p: [
          'Six screens on Shark, then one paste into TradeGuardX. The whole thing takes about five minutes, and the two places people get stuck are both worth knowing before you start: it has to be a laptop or desktop, because Shark\'s mobile app has no create-key screen at all; and Trade Futures is unticked by default.',
        ],
        guideLink: 'api-key',
      },
      sharedWithdrawSection(
        'Shark Exchange',
        'The only permission we ask for is Trade Futures, which is enough to cancel an order and close a position and nowhere near enough to move a rupee. Shark\'s API key form offers no withdrawal permission at all, so the key could not move funds even if someone took it.',
      ),
    ],
    faq: [
      {
        q: 'Does TradeGuardX work with Shark Exchange?',
        a: 'Yes, fully. Shark runs on the Pi42 API stack and we hold a live connection to your account: positions, orders, balances and the public mark-price feed. The connection, the feed and the close path have each been verified against a live account, and the daily-loss rule has fired on one.',
      },
      {
        q: 'Can I create a Shark Exchange API key on my phone?',
        a: 'No. Shark\'s mobile app has no create-key screen at all, so the key has to be made on a laptop or desktop browser. That is Shark\'s limit, not ours. Once the key is connected you can trade from the phone app as normal — enforcement runs on our servers, so it does not care where the order came from.',
      },
      {
        q: 'What is the Trade Futures permission on Shark Exchange?',
        a: 'It is the scope that lets an API key place and close futures orders, and Shark issues every key without it — Read only by default. You enable it under Edit API Restrictions after the key has been created. A Read-only key connects to TradeGuardX perfectly well and can send you alerts, but it can never close a position, so the kill switch would do nothing.',
      },
      {
        q: 'Why does Shark Exchange need an IP whitelist?',
        a: `Because it makes a stolen key useless. Paste our address (${DELTA_EGRESS_IP}) into the IP field when you create the key and it will only work from our engine — Shark answers every request from anywhere else with "IP address not whitelisted". That address is an Elastic IP pinned to our network, so it stays correct rather than changing on our next deploy.`,
      },
      {
        q: 'Are my Shark Exchange rules in rupees?',
        a: 'Yes. Shark settles in INR, so your daily loss limit, your risk per trade and your drawdown threshold are all rupee amounts, and your equity is reported in rupees. Nothing is converted on the way in or out, which means the figure your rule is measured against matches Shark\'s own statement exactly.',
      },
      {
        q: 'Does the kill switch still work if I trade from the Shark app?',
        a: 'Yes, and that is the reason it runs on our servers rather than in your browser. We hold a live connection to the account itself, so it makes no difference whether the order came from Shark\'s website, its mobile app, or a script you wrote. If the trade reaches your account, we see it and act if it breaks a rule.',
      },
    ],
  },

  // ── CoinDCX: proven with a real key, 23 Sep 2026.
  coindcx: {
    slug: 'coindcx',
    name: 'CoinDCX',
    longName: 'CoinDCX Futures',
    status: 'live',
    beta: false,
    title: 'CoinDCX Kill Switch — Auto-Close Positions | TradeGuardX',
    description:
      'Set a daily loss limit on CoinDCX futures and have it enforced. TradeGuardX cancels your orders, closes your positions and locks the account from our servers.',
    h1: 'Kill switch for CoinDCX',
    lede:
      'Connect a CoinDCX API key bound to our IP, set your daily loss limit once, and our engine enforces it — cancelling orders, closing positions and locking the account whether your screen is on or not. Futures only.',
    sections: [
      sharedBreachSection('CoinDCX'),
      {
        h: 'What is different about CoinDCX',
        p: [
          'Futures only. CoinDCX spot is not enforced, does not appear in your journal, and is not carried into the tax centre. If you want spot protected, that is not something we can do today — and it is better said here than discovered after a bad day.',
          'CoinDCX\'s INR and USDT margin modes are one venue, not two exchanges. They list the same perpetuals, priced in USDT either way; only the wallet posting margin differs. One key covers both, your rules apply across the pair, and your equity is reported as a single USDT figure with the INR wallet converted at CoinDCX\'s own spot rate.',
          'There is no permission checkbox on CoinDCX\'s create-key form, so there is nothing to tick for trading and no point hunting for it. We verify the key can actually act the moment you connect it, and say so plainly if it cannot.',
        ],
        guideLink: 'margin',
      },
      {
        h: 'Which CoinDCX rules can TradeGuardX enforce?',
        rulesTable: true,
        p: [
          'All seven on CoinDCX futures, with the same behaviour as every other venue — it is one engine behind all of them. CoinDCX\'s first live key went through this end to end in September 2026 and surfaced three request-shape bugs, including one where a position with a stop attached read as unprotected. Those are fixed; the venue is proven rather than assumed.',
        ],
      },
      {
        h: 'How do I connect my CoinDCX account?',
        p: [
          'Six screens on CoinDCX, then one paste into TradeGuardX — about five minutes. Two things to know before you start: it has to be a desktop browser, because CoinDCX has no create-key screen in their mobile app; and the secret is shown exactly once, on the screen that creates it.',
        ],
        guideLink: 'api-key',
      },
      sharedWithdrawSection(
        'CoinDCX',
        'CoinDCX\'s API key form offers no withdrawal permission at all — there is no box to tick and none to leave unticked. The key can cancel an order and close a position, and it cannot move a rupee out of your account.',
      ),
    ],
    faq: [
      {
        q: 'Does TradeGuardX work with CoinDCX?',
        a: 'Yes, on CoinDCX futures, live since September 2026. You create an API key on CoinDCX, bind it to our IP, and paste it in. We hold a live connection to the account — positions, orders, balances and the public mark-price feed — and enforce your rules from our servers. CoinDCX spot is not covered.',
      },
      {
        q: 'Can I create a CoinDCX API key on the mobile app?',
        a: 'No. CoinDCX has no create-key screen in their mobile app, so the key has to be made in a desktop browser. Once it is connected you can trade from the phone app as normal — enforcement runs server-side and does not care where the order came from.',
      },
      {
        q: 'Do INR and USDT margin need two separate keys on CoinDCX?',
        a: 'No, one key covers both. CoinDCX\'s INR and USDT margin modes are a wallet toggle, not two exchanges: the instruments are identical and prices, fees and P&L are quoted in USDT either way. Your rules apply across both, and your equity is reported as a single USDT figure with the INR wallet converted at CoinDCX\'s own spot rate.',
      },
      {
        q: 'Why does my CoinDCX key keep getting rejected?',
        a: 'Almost always the IP binding. The key must be bound to our IP exactly, or bound to nothing at all — a key bound to some other address will fail every request. Our address is shown with a copy button on the connection panel. There is no trading permission to enable on CoinDCX, so that is never the cause.',
      },
      {
        q: 'Why are my CoinDCX spot trades missing?',
        a: 'Expected — we read futures only. Spot trades are not enforced, do not appear in the journal, and are not carried into the tax centre. We would rather state that than let you assume a position is being watched when it is not.',
      },
      {
        q: 'Does the kill switch still work if I trade from the CoinDCX app?',
        a: 'Yes. That is the whole reason it runs on our servers rather than as a browser extension. An extension can only see the tab it is in, and only while that tab is open; we hold a live connection to the account, so a position opened from the CoinDCX app, the website or a third-party client is seen the same way.',
      },
    ],
  },

  // ── Delta: the original venue, most granular API of the three.
  delta: {
    slug: 'delta',
    name: 'Delta',
    longName: 'Delta Exchange',
    status: 'live',
    beta: false,
    title: 'Delta Exchange Kill Switch — Auto-Close | TradeGuardX',
    description:
      'Set a daily loss limit on Delta Exchange and have it enforced. TradeGuardX cancels your orders, closes your positions and locks the account from our servers, not your browser.',
    h1: 'Kill switch for Delta Exchange',
    lede:
      'Connect a Delta Exchange Trading API key with our IP whitelisted, set your daily loss limit once, and our engine enforces it — cancelling orders, closing positions and locking the account whether your screen is on or not.',
    sections: [
      sharedBreachSection('Delta Exchange'),
      {
        h: 'What is different about Delta Exchange',
        p: [
          'Delta has the most granular and stable perpetuals API of the three exchanges we support, which matters more than it sounds: your protection is only ever as fast as the data feed behind it.',
          'India and Global are separate Delta accounts with separate keys. Pick the region that matches the account you actually hold when you add it — a Global key on an India account is the single most common connection failure, and it looks identical to a bad key.',
          'The permission you need is called Trading. Read Data is always on and can be left alone. Futures only: Delta spot is not enforced.',
        ],
      },
      {
        h: 'Which Delta Exchange rules can TradeGuardX enforce?',
        rulesTable: true,
        p: [
          'All seven on Delta Exchange. This is the exchange we built the engine against, and the behaviour of every rule below is the behaviour on Delta — the other venues match it rather than the reverse.',
        ],
      },
      {
        h: 'How do I connect my Delta Exchange account?',
        p: [
          'Create a Trading API key on Delta with our IP whitelisted, then paste the key and secret into TradeGuardX. About five minutes. One thing that catches people: a brand-new Delta key takes roughly five minutes to activate, so an immediate rejection is often just impatience.',
        ],
        guideLink: 'api-key',
      },
      sharedWithdrawSection(
        'Delta Exchange',
        'The only permission we ask for is Trading. Delta\'s API key form has no withdrawal option at all, so the key can cancel an order and close a position and can never move funds — not to another exchange, not to a wallet, not anywhere.',
      ),
    ],
    faq: [
      {
        q: 'Does TradeGuardX work with Delta Exchange?',
        a: 'Yes, on both Delta India and Delta Global, and it is the exchange we built the engine against. There is no extension to install: you create a Trading API key on Delta, whitelist our IP, and paste it in. We hold a live connection to the account and enforce your rules from our servers.',
      },
      {
        q: 'Which Delta Exchange API permissions does a kill switch need?',
        a: 'Trading, and nothing else. Read Data is always enabled and can be left as it is. Trading is what lets us cancel a resting order and close an open position. A key with Trading unticked will connect and can send you alerts, but it cannot run the kill switch — there is no way to close a position with a read-only key.',
      },
      {
        q: 'Why is Delta Exchange rejecting my API key?',
        a: 'Three usual causes, in order of likelihood. A region mismatch — an India key on a Global account or the reverse. A brand-new key, which Delta takes about five minutes to activate. Or the Trading permission was not ticked, or our IP was not whitelisted. Delta requires the whitelist for Trading keys.',
      },
      {
        q: 'Can I create a Delta Exchange API key from the mobile app?',
        a: 'Yes — Delta is the one exchange of the three where you can. The path in the app is Algo Hub → APIs. Name the key, paste our IP and tap + to add it (typing the IP without adding it will not save), tick Trading, then create. On a desktop browser the same form is on Delta\'s API keys page.',
      },
      {
        q: 'Does the kill switch still work if I trade from the Delta app?',
        a: 'Yes. Enforcement runs on our servers against the account itself, not in a browser tab, so it makes no difference whether the order came from Delta\'s website, the mobile app, or a bot you wrote. If a trade reaches your account and breaks a rule, the guard acts.',
      },
      {
        q: 'Is a kill switch the same as Delta Exchange\'s stop loss?',
        a: 'No, and the difference is the point. A stop loss protects one trade; a kill switch protects the account. A stop does nothing about the behaviour that actually empties accounts — re-entering ninety seconds after a loss, doubling size to win it back, taking twelve trades on a day you planned three. A kill switch caps the day, not the trade.',
      },
    ],
  },
};

/**
 * Display order on /exchanges and in the cross-links.
 *
 * Bybit and Bitget had pages here saying the integration was built but not
 * deployed. They are gone: a page whose whole content is "not yet" competes
 * for the venue's name while having nothing to say to whoever arrives, and it
 * put two of the five entries on the index in the position of advertising
 * something nobody can buy. They were live for less than a day, so vercel.json
 * 301s both to /exchanges — the honest answer to "does this work on Bybit" is
 * the list of venues where it does.
 *
 * Re-adding one is a revert of this commit plus its route in publicRoutes.js.
 */
export const VENUE_ORDER = ['delta', 'coindcx', 'shark'];

export const VENUE_PAGE_LIST = VENUE_ORDER.map((slug) => VENUE_PAGES[slug]);

export function venuePageFor(slug) {
  return VENUE_PAGES[slug] ?? null;
}

export function venueUrl(slug) {
  return `${SITE}/exchanges/${slug}`;
}

export { VENUE_PAGES };
