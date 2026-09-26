import { DELTA_EGRESS_IP } from '../api/config';

/**
 * Exchange documentation, keyed by exchange and split into navigable articles.
 * Rendered by DocsPage with a broker toggle.
 *
 * Only the SETUP guide is per-venue — that is the one part that depends on
 * whose form you are filling in. Everything after the key is connected (how
 * enforcement works, the kill switch, rules, cooldowns, the Live dashboard)
 * is identical on every venue because it is the same engine, so those
 * articles are written once in SHARED_ARTICLES and shared by reference.
 * Copying them per venue would guarantee they drift.
 *
 * To add a venue: write its setup article, add a DOCS entry spreading
 * SHARED_ARTICLES after it, and add a DOC_BROKERS row. No page changes.
 *
 * Broker shape:  { id, label, tagline, articles: Article[] }
 * Article shape: { slug, title, intro, sections: Section[] }
 * Section shape: { heading?, body?, list?: [{ bold?, text }], steps?: [{ title, body?, sub?: string[], note? }], note? }
 */

export const DOCS = {
  delta: {
    id: 'delta',
    label: 'Delta Exchange',
    tagline:
      'A server-side kill switch and journal for your Delta Exchange account. No browser extension — you connect a Trading API key and our always-on engine enforces your rules for you.',
    articles: [
      {
        slug: 'getting-started',
        title: 'Getting Started',
        intro:
          'Connect your Delta account and be protected in about five minutes. There is no extension to install — you create a Trading API key on Delta, whitelist our IP, and paste the key into TradeGuardX.',
        sections: [
          {
            heading: 'What TradeGuardX does',
            body:
              "TradeGuardX is a risk-management layer on top of your own Delta Exchange account. You keep full control of your funds — we never hold them. You connect a Trading API key, define your rules (daily loss limit, max trades, loss-streak cooldown, and more), and our cloud engine enforces them: when a rule is breached it cancels your open orders and closes your positions, then locks the account for a cooldown so you can't keep digging.",
            note:
              'On a retail exchange like Delta this is a cooperative safety tool, not an un-bypassable cage — you always own your exchange login. Its job is to stop impulse decisions in the moment, for the trader who wants to be protected from their own tilt.',
          },
          {
            heading: 'Set up Delta Exchange — step by step',
            body: 'Follow these in order. The only part done outside TradeGuardX is creating the API key on Delta.',
            steps: [
              {
                title: 'Create your TradeGuardX account',
                body: 'Sign up at tradeguardx.com/signup with email or Google. No card is needed to start.',
              },
              {
                title: 'Start adding your Delta account',
                body: 'In the dashboard, open Accounts → "Add trading account" and choose Delta Exchange (India or Global).',
                sub: [
                  'Name the account. Keep this form open — it shows the IP you need to whitelist and is where you paste your key.',
                  'The API Key and Secret are required to create the account, so you\'ll finish this form in step 4.',
                ],
              },
              {
                title: 'Create a Trading API key on Delta Exchange',
                body: 'Open your Delta API keys page at delta.exchange/algo/delta-exchange-apis (log in first) and click "Create a new API key". Delta\'s form asks for just a few things:',
                sub: [
                  'API Key Name — type anything you like (e.g. "TradeGuardX"). It\'s just a label.',
                  `Whitelisted IP — paste TradeGuardX's IP (${DELTA_EGRESS_IP}). The connection panel shows it with a Copy button. Delta requires this for Trading keys.`,
                  'Permissions — tick "Trading". "Read Data" is always on (leave it); there is no Withdrawal option, so your key can never move funds.',
                  'Click "Create API key", then copy the API Key and API Secret. Delta shows the secret only once — copy it immediately.',
                ],
                note: 'A read-only key (Trading unticked) can only send alerts — it cannot run the kill switch. For enforcement, tick Trading and whitelist the IP.',
              },
              {
                title: 'Connect the key in TradeGuardX',
                body: 'On the Add-account form (or the Delta connection panel), paste your API Key and API Secret and create/connect. The API key and secret are required to create a Delta account.',
                sub: [
                  'We validate the key against Delta immediately and show your linked Delta account and email.',
                  'If Delta rejects it, check you used the right region key and gave it a few minutes — new keys take ~5 minutes to activate.',
                  'Your secret is encrypted (KMS) before storage and is never shown again.',
                ],
              },
              {
                title: "Confirm you're protected",
                body: 'The connection should read CONNECTED and the header shows a green "Protected" pill.',
                note: 'If it shows "Alerts only" or "Unprotected", the key is read-only or the IP isn\'t whitelisted — recreate the key with the Trading permission and the IP whitelisted.',
              },
              {
                title: 'Set your guardrails',
                body: 'Open Rules and configure the protections you want — daily loss limit, max trades per day, loss-streak cooldown, risk per trade, and more.',
                sub: [
                  'Each rule has a "How it works" toggle explaining exactly what it does.',
                  'Saving a tighter limit applies instantly; loosening one waits 24 hours (a cooling-off so you can\'t weaken protection on impulse).',
                ],
              },
              {
                title: "Trade — you're covered",
                body: 'Open the Live tab to watch your session in real time: status, guardrail meters, and activity. If a rule is breached, the kill switch cancels your orders, closes your positions, and locks the account with an unlock countdown.',
              },
            ],
          },
        ],
      },
    ],
  },
  coindcx: {
    id: 'coindcx',
    label: 'CoinDCX',
    tagline:
      'A server-side kill switch and journal for your CoinDCX futures account. No browser extension — you create an API key on CoinDCX, bind it to our IP, and our always-on engine enforces your rules for you.',
    articles: [
      {
        slug: 'getting-started',
        title: 'Getting Started',
        intro:
          'Connect your CoinDCX futures account and be protected in about five minutes. There is no extension to install — you create an API key on CoinDCX, bind it to our IP, and paste the key into TradeGuardX.',
        sections: [
          {
            heading: 'What TradeGuardX does',
            body:
              "TradeGuardX is a risk-management layer on top of your own CoinDCX account. You keep full control of your funds — we never hold them. You connect an API key, define your rules (daily loss limit, max trades, loss-streak cooldown, and more), and our cloud engine enforces them: when a rule is breached it cancels your open orders and closes your positions, then locks the account for a cooldown so you can't keep digging.",
            note:
              'Futures only. CoinDCX spot is not enforced, does not appear in the journal, and is not carried into the tax centre — if you want spot protected, it is not something we can do today.',
          },
          {
            heading: 'INR and USDT margin are one venue',
            body:
              'CoinDCX lets you margin the same perpetuals from either your INR wallet or your USDT wallet. That is a wallet toggle, not two exchanges: the instruments are identical and prices, fees and P&L are quoted in USDT either way. One key covers both, your rules apply across both, and your equity is reported as a single USDT figure with the INR wallet converted at CoinDCX\'s own spot rate.',
          },
          {
            heading: 'Set up CoinDCX — step by step',
            body: 'Follow these in order. The only part done outside TradeGuardX is creating the API key on CoinDCX.',
            steps: [
              {
                title: 'Create your TradeGuardX account',
                body: 'Sign up at tradeguardx.com/signup with email or Google. No card is needed to start.',
              },
              {
                title: 'Start adding your CoinDCX account',
                body: 'In the dashboard, open Accounts → "Add trading account" and choose CoinDCX.',
                sub: [
                  'Name the account. Keep this form open — it shows the IP you need to bind and is where you paste your key.',
                  'The API Key and Secret are required to create the account, so you\'ll finish this form in step 4.',
                ],
              },
              {
                title: 'Create an API key on CoinDCX',
                body: 'Open coindcx.com/create-api (log in first). Their form is short:',
                sub: [
                  'Label — type anything you like (e.g. "TradeGuardX"). It is just a name.',
                  `Bind IP Address to API key — tick this, then paste TradeGuardX's IP (${DELTA_EGRESS_IP}) into the field that appears. The connection panel shows it with a Copy button. The key then works only from our engine and nowhere else.`,
                  'Send OTP — CoinDCX sends one code to your email and another by SMS. Enter both to confirm the key.',
                  'Copy the API Key and Secret. Both are shown once, on that screen — CoinDCX will not show the secret again.',
                ],
                note: 'There is no permission checkbox on CoinDCX\'s form, so there is nothing to tick for trading — do not go looking for one. We verify the key can actually act the moment you connect it, and tell you plainly if it cannot.',
              },
              {
                title: 'Connect the key in TradeGuardX',
                body: 'On the Add-account form, paste your API Key and Secret and create/connect.',
                sub: [
                  'We validate the key against CoinDCX immediately and show the linked account on the Accounts card.',
                  'If CoinDCX rejects it, the IP binding is the usual cause — the key must be bound to our IP exactly, or bound to nothing at all.',
                  'Your secret is encrypted (KMS) before storage and is never shown again.',
                ],
              },
              {
                title: "Confirm you're protected",
                body: 'The connection should read CONNECTED and the header shows a green "Protected" pill.',
                note: 'If it shows "Alerts only" or "Unprotected", the key cannot trade or the IP binding does not match — recreate the key and bind it to the IP shown on the panel.',
              },
              {
                title: 'Set your guardrails',
                body: 'Open Rules and configure the protections you want — daily loss limit, max trades per day, loss-streak cooldown, risk per trade, and more.',
                sub: [
                  'Each rule has a "How it works" toggle explaining exactly what it does.',
                  'Saving a tighter limit applies instantly; loosening one waits 24 hours (a cooling-off so you can\'t weaken protection on impulse).',
                ],
              },
              {
                title: "Trade — you're covered",
                body: 'Open the Live tab to watch your session in real time: status, guardrail meters, and activity. If a rule is breached, the kill switch cancels your orders, closes your positions, and locks the account with an unlock countdown.',
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Written once, shared by every venue. These describe the engine, not the
 * exchange — the kill switch behaves identically wherever your key points.
 */
const SHARED_ARTICLES = [
  {
    slug: 'how-it-works',
    title: 'How enforcement works',
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
    title: 'The kill switch',
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
    title: 'Cooldowns & locks',
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
    title: 'Your rules',
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
    title: 'Changing rules safely',
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
    title: 'The Live dashboard',
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
    title: 'Troubleshooting',
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

// Attach the shared set after each venue's own setup guide.
for (const broker of Object.values(DOCS)) broker.articles.push(...SHARED_ARTICLES);

// Brokers shown in the docs toggle, in order. Add more here as they ship.
export const DOC_BROKERS = [
  { id: 'delta', label: 'Delta Exchange' },
  { id: 'coindcx', label: 'CoinDCX' },
];
