/**
 * The help centre at /help — the seven articles that describe the ENGINE, not
 * any one exchange.
 *
 * This file used to hold a per-venue setup guide as well, keyed by broker, and
 * DocsPage picked between them with React state. That meant one URL
 * (/help/getting-started) for three different articles: Delta's was the only
 * one a crawler ever saw, CoinDCX's had no address at all, and Shark — live and
 * connectable — was not in the list, so it was unreachable even by clicking.
 *
 * The setup guides now live in venueGuides.js under /exchanges/<venue>/api-key,
 * one URL each. What is left here is what was always genuinely shared: the kill
 * switch behaves identically wherever your key points, so it is described once.
 * With nothing venue-specific left, the broker toggle went too — it offered a
 * choice that no longer changed anything on the page.
 *
 * Article shape: { slug, title, intro, sections: Section[] }
 * Section shape: { heading?, body?, list?: [{ bold?, text }], steps?: [{ title, body?, sub?: string[], note? }], note? }
 */

export const HELP_ARTICLES = [
  {
    slug: 'how-it-works',
    navTitle: 'How enforcement works',
    title: 'How TradeGuardX watches your account',
    intro:
      'Once your key is connected, a dedicated engine keeps a live connection to your exchange and streams your positions, orders, and balances — and checks every update against your rules within seconds.',
    sections: [
      {
        body: 'It also subscribes to the public mark-price feed, so your unrealized P&L stays accurate even while you\'re idle.',
        list: [
          { bold: 'Real-time:', text: 'positions and P&L are tracked as they change, not polled occasionally.' },
          { bold: 'Idle-safe:', text: 'the mark-price feed means a position bleeding out while you\'re away can still trip your daily-loss limit.' },
          { bold: 'Server-side:', text: 'enforcement runs in the cloud, so it works whether or not your browser is open.' },
        ],
      },
    ],
  },
  {
    slug: 'kill-switch',
    navTitle: 'The kill switch',
    title: 'What happens when you break a trading rule',
    intro:
      'There is one kill switch and two ways to fire it: a rule breach fires it for you, or you fire it yourself. What it does is identical either way — only the trigger and the lock length differ.',
    sections: [
      {
        heading: 'What it does, every time',
        body: 'Three steps, in this order. It runs a verify-and-retry sequence so it does not give up if the exchange is briefly slow.',
        list: [
          { bold: '1. Cancel:', text: 'every open order on the account is cancelled.' },
          { bold: '2. Close:', text: 'every open position is market-closed — then verified, and retried if the exchange says otherwise.' },
          { bold: '3. Lock:', text: 'the account enters a cooldown. Anything you open during that window is force-closed on sight and does not count as a trade.' },
        ],
        note: 'The lock is written to the database before any closing happens, so a crash mid-close cannot leave you unlocked. It survives an engine restart and can only be lifted by the clock — never by an error.',
      },
      {
        heading: 'Rule-based — the engine fires it',
        body: 'You set the limit once; the engine watches and acts. Four rules fire the full kill switch:',
        list: [
          { bold: 'Daily Loss Protection:', text: 'your trading loss for the day hits the limit. Locks until your next daily reset.' },
          { bold: 'Max Trades Per Day:', text: 'you hit your trade count. Locks until your next daily reset.' },
          { bold: 'Daily Profit Target:', text: 'you BOOK your target and are flat. Locks until your next daily reset — the win stays a win.' },
          { bold: 'Close After N Losses:', text: 'a losing streak. Two tiers, each firing once per streak: a soft lock at your chosen count (default 3 losses → 3h) and a hard lock if it continues (default 5 losses → 12h). A hard lock resets the session when it lifts; a win resets the streak before either.' },
        ],
        note: 'Deposits are ignored by Daily Loss Protection — it measures trading result, not the balance moving.',
      },
      {
        heading: 'Rules that do NOT fire the kill switch',
        body: 'Worth knowing precisely, so you are not relying on something that was never going to close a position:',
        list: [
          { bold: 'Risk Per Trade:', text: 'closes the ONE position whose stop implies more risk than your limit. It does not cancel your other orders and does not lock the account.' },
          { bold: 'Stop Loss Protection:', text: 'alert only. It tells you a position is sitting open without a stop attached; it never closes it. Force-closing you for not having set a stop yet would be worse than the problem.' },
          { bold: 'Max Drawdown Lock:', text: 'alert only today, despite the name. It notifies when your account is down past your threshold from its starting balance; it does not close or lock. Do not rely on it as a floor.' },
        ],
      },
      {
        heading: 'Manual — you fire it yourself',
        body: 'On Live guard, "Arm the lockout" closes the account to you for a window you pick: 3, 6 or 12 hours. Use it when you can feel the tilt coming and would rather not test your own discipline. The red Kill switch button in the top bar opens the same dialog from any screen.',
        list: [
          { bold: 'You must be flat first:', text: 'it refuses to arm while a position is open — "a lockout can\'t be started mid-trade". Close your position, then arm it. This is the one way the manual switch differs from a rule breach, which closes for you.' },
          { bold: 'There is no cancel:', text: 'once armed you cannot call it off. Only the clock lifts it. Support can lift it if something real has happened.' },
          { bold: 'You can extend, never shorten:', text: 'arming again for longer pushes the release out. Arming for less keeps the lock you already have — otherwise re-arming for one hour would be an off button.' },
          { bold: 'It asks twice:', text: 'a confirm step spells out the window before it arms, because you cannot undo it afterwards.' },
          { bold: 'It will refuse to arm:', text: 'if nothing could enforce it — no key, or a key that cannot trade. A lockout you can walk around is not a commitment, so we would rather not offer it.' },
        ],
        note: 'Once armed, the watchdog closes anything you open for the rest of the window, wherever you placed it.',
      },
    ],
  },
  {
    slug: 'cooldowns',
    navTitle: 'Cooldowns & locks',
    title: 'How long does a trading cooldown last?',
    intro:
      'Every lock is time-based and self-releasing. Nothing you do on the exchange shortens one, and no error can leave you locked forever.',
    sections: [
      {
        heading: 'How long each one runs',
        list: [
          { bold: 'Daily loss / profit target / max trades:', text: 'until your next daily reset, in your account\'s own timezone and reset hour.' },
          { bold: 'Loss streak, soft tier:', text: 'a fixed window from when it fired — 3 hours by default.' },
          { bold: 'Loss streak, hard tier:', text: 'a longer fixed window — 12 hours by default. When it lifts, your session resets.' },
          { bold: 'Manual lockout:', text: 'exactly the 3, 6 or 12 hours you picked.' },
        ],
        note: 'Fixed-duration locks are clamped to a maximum of 24 hours, so no configuration can lock you out indefinitely.',
      },
      {
        heading: 'While a lock is running',
        list: [
          { bold: 'New trades are closed on sight:', text: 'a watchdog flattens anything that appears, wherever you placed it — web, mobile app or a third-party client.' },
          { bold: 'Blocked trades are free:', text: 'they do not count toward your daily trade limit and do not extend your losing streak.' },
          { bold: 'Your key is frozen:', text: 'you cannot disconnect or replace your API key during a lock. Otherwise pulling the key would be the way around it.' },
          { bold: 'Rules that are ON are frozen too:', text: 'you cannot loosen or disable them mid-lock. Rules that are off can still be turned on.' },
        ],
      },
      {
        heading: 'Where to watch it',
        body: 'The Live dashboard shows the countdown to release, and the header carries a "Locked" pill from any page so you can see it without going looking. The activity feed names the rule that fired and the trades it closed.',
      },
    ],
  },
  {
    slug: 'rules',
    navTitle: 'Your rules',
    title: 'Which trading rules can be automated?',
    intro:
      'Rules are configured per account on the Rules page — each has its own "How it works" toggle with full detail. In short:',
    sections: [
      {
        list: [
          { bold: 'Daily Loss Protection:', text: 'closes everything and locks the day when your trading loss hits the limit (deposits are ignored).' },
          { bold: 'Daily Profit Target:', text: 'a soft lock — once you BOOK your target and are flat, the day locks. It never force-closes an open winner.' },
          { bold: 'Risk Per Trade:', text: 'auto-closes a single position whose stop-loss implies more risk than your limit.' },
          { bold: 'Max Trades / Day:', text: 'locks new trades once you hit your daily count (blocked trades don\'t count).' },
          { bold: 'Close After N Losses:', text: 'pauses trading after a run of losing trades; a win resets the streak.' },
          { bold: 'Max Drawdown:', text: 'an account-life floor that alerts on deep drawdown (doesn\'t reset daily).' },
          { bold: 'Stop-Loss Protection:', text: 'warns when a position sits open without a stop attached.' },
        ],
      },
    ],
  },
  {
    slug: 'changing-rules',
    navTitle: 'Changing rules safely',
    title: "Why you can't loosen a limit instantly",
    intro:
      'To stop impulse decisions, loosening a protection is delayed while tightening is instant. This applies at all times, not only during a lock.',
    sections: [
      {
        list: [
          { bold: 'Tightening is immediate:', text: 'lowering a loss limit, fewer trades, or enabling a rule takes effect right away.' },
          { bold: 'Loosening waits 24h:', text: 'raising a limit, allowing more trades, shorter cooldowns, or disabling a rule is staged and applies after a 24-hour cooling-off.' },
          { bold: 'Keys are locked in cooldown:', text: 'you can\'t disconnect or replace your API key while a lock is active — this keeps the kill switch alive when it matters most.' },
        ],
      },
    ],
  },
  {
    slug: 'live-dashboard',
    navTitle: 'The Live dashboard',
    title: 'Watching a trading session in real time',
    intro:
      'The Live tab is your session cockpit — everything about the current trading day in one place.',
    sections: [
      {
        body:
          'It shows a state-driven hero (clear / cooldown / day-locked / target-hit) with your day\'s P&L and an unlock countdown, three at-a-glance meters (trades left, losses before cooldown, loss buffer), and a card for every active guardrail with its live status. The Activity tab groups today\'s trades with their lifecycle events and exactly which rules fired on each.',
      },
    ],
  },
  {
    slug: 'troubleshooting',
    navTitle: 'Troubleshooting',
    title: 'Why is my exchange API key not working?',
    intro: 'The most common issues and how to fix them.',
    sections: [
      {
        list: [
          { bold: '"The exchange rejected the API credentials":', text: 'on Delta, usually a region mismatch (India vs Global key), a brand-new key (Delta needs ~5 minutes), or the Trading permission not enabled. On CoinDCX, usually the IP binding — the key must be bound to our IP, or bound to nothing at all.' },
          { bold: '"Unprotected" banner:', text: 'no enforcing key is connected — the key was disconnected or is read-only. Reconnect a Trading-scoped, IP-whitelisted key.' },
          { bold: 'Rules not enforcing:', text: 'confirm the account shows "Protected" in the header and that the key is allowed to trade and pinned to our IP.' },
          { bold: 'CoinDCX spot trades missing:', text: 'expected — we read futures only. Spot is neither enforced nor carried into the tax centre.' },
          { bold: 'Feed delayed:', text: 'a brief note that the last known equity is shown; it clears automatically when the feed catches up.' },
        ],
      },
    ],
  },
];
