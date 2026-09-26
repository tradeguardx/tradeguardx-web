/**
 * Help-center article content. Each article renders inside a single /help
 * page with sidebar navigation. Edit copy here; layout is in HelpPage.jsx.
 *
 * The support assistant (trade-service, supportKnowledge.ts) is generated
 * from this file — run `node scripts/gen-help-md.mjs` there after editing.
 *
 * Article shape:
 *   { slug, title, intro, sections: [{ heading, body, list?, note? }] }
 */
export const HELP_ARTICLES = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    intro:
      'TradeGuardX protects a Delta Exchange or CoinDCX futures account in four steps, all on the dashboard: create the account, connect an enforcement key, switch on rules, turn on alerts. Until all four are done your rules are written down but nothing enforces them.',
    sections: [
      {
        heading: '1. Create your TradeGuardX account',
        body:
          'Sign up at tradeguardx.com/signup with email + password or Google. Every new account starts a 7-day free trial with everything unlocked — no card, and nothing is charged when it ends.',
      },
      {
        heading: '2. Add a trading account',
        body:
          'On the dashboard go to Accounts → Add another account → Choose a venue. Delta Exchange and CoinDCX futures are both live, and one subscription covers both — connect either or both. Give the account a name; that name is what the account switcher in the top bar shows.',
      },
      {
        heading: '3. Connect the enforcement key',
        body:
          'Go to Connect key. Create an API key on your exchange, pin it to the TradeGuardX IP shown on the page, then paste the key and secret and verify. This is the step that lets us cancel orders and close positions for you. A key that cannot trade is accepted but leaves the account in WATCHING — we see fills but cannot act. The Connect key page walks through your venue\'s own form field by field.',
      },
      {
        heading: '4. Switch on your rules',
        body:
          'Go to Rules. Every rule is off until you turn it on; two are enough to start — Daily loss protection and Max trades per day. Toggle a rule on, or expand it and Edit rule to change the limits first.',
      },
      {
        heading: '5. Turn on alerts',
        body:
          'Go to Alerts and connect Telegram (fastest) or email. The guard acts whether or not you are watching; alerts are how you find out it did.',
      },
      {
        heading: 'Read the pill',
        body:
          'The pill next to the account switcher is the one answer to "am I protected?".',
        list: [
          { bold: 'ARMED:', text: 'trading-scope key verified, at least one rule on, setup complete. The engine can close positions.' },
          { bold: 'WATCHING:', text: 'the key is read-only. We see fills but cannot act — replace the key.' },
          { bold: 'NOT PROTECTED:', text: 'no key, no rule on, or setup unfinished. The band under the top bar says which and where to go.' },
          { bold: 'LOCKED:', text: 'a rule cooldown or your killswitch is running. Anything opened is closed on sight.' },
        ],
      },
    ],
  },
  {
    slug: 'connecting-your-key',
    title: 'Connecting your exchange key',
    intro:
      'TradeGuardX enforces server-side: our risk engine holds a live connection to your exchange and acts on your account 24/7, dashboard open or not. That needs an API key that is allowed to trade. The steps are the same on Delta and CoinDCX — each venue just names the fields differently.',
    sections: [
      {
        heading: 'Create the key on Delta',
        body:
          'Delta → Account → API keys → Create. Tick Trading. Add the IP address shown on the Connect key page to the key\'s whitelist; without it Delta rejects every request we make.',
      },
      {
        heading: 'Create the key on CoinDCX',
        body:
          'CoinDCX → coindcx.com/create-api. Give the key a label, tick Bind IP Address to API key and paste the IP shown on our Connect key page, then confirm with the two one-time codes CoinDCX sends — one by email, one by SMS. There is no permission checkbox on that form, so there is nothing to tick for trading; we verify the key can act as soon as you connect it and say so if it cannot. The key and secret appear once, on that screen — copy both before you leave it.',
        note: 'CoinDCX is futures only. Spot trades are not enforced and do not appear in the tax centre.',
      },
      {
        heading: 'Paste and verify',
        body:
          'Back on Connect key, paste the key and secret (pasting both in one box works — we split them) and press Connect. We verify against the exchange immediately and show the account id and time verified on the Accounts card.',
      },
      {
        heading: 'Trading scope vs read-only',
        list: [
          { bold: 'Trading scope:', text: 'the pill reads ARMED. Rules that close positions actually close them.' },
          { bold: 'Read-only:', text: 'the pill reads WATCHING. Alerts still fire, nothing is closed. Replace the key from Accounts → Replace key.' },
        ],
      },
      {
        heading: 'Key failed / Unprotected',
        body:
          'The exchange rejected the key — it was deleted, rotated, or the IP it is pinned to no longer matches ours. The engine retries a failed key every 15 minutes, so a transient rejection usually recovers on its own; otherwise reconnect from Accounts.',
        note: 'A Delta or CoinDCX key created without an IP binding can also simply expire. If enforcement stops with no other change, that is the first thing to check.',
      },
      {
        heading: 'Keys cannot be changed during a lock',
        body:
          'While a killswitch lockout runs, keys cannot be disconnected or replaced — otherwise removing the key would be a way around the lock.',
      },
    ],
  },
  {
    slug: 'setting-your-first-rule',
    title: 'Rules and the rule lock',
    intro:
      'Rules are what you ask us to enforce. The rule lock is what holds you to them. The killswitch is the manual one. All three are on the Rules and Live guard screens.',
    sections: [
      {
        heading: 'The seven rules',
        body: 'Every rule is on every plan, and every rule is off until you switch it on.',
        list: [
          { bold: 'Daily loss protection:', text: 'warns near the limit; at the limit we cancel orders, close positions and lock the account until the daily reset.' },
          { bold: 'Daily profit target:', text: 'once you are up by the target and flat, the day locks and the gain is kept. Never force-closes an open winner.' },
          { bold: 'Risk per trade:', text: 'with a stop attached, if the loss at the stop is over your cap that position is closed.' },
          { bold: 'Max drawdown lock:', text: 'peak-to-trough across the whole account. Alert-only today — the rule says so.' },
          { bold: 'Max trades per day:', text: 'hitting the cap locks the account for the rest of the session.' },
          { bold: 'Close after N losses:', text: 'N losses in a row buys a forced break; a larger N ends the day.' },
          { bold: 'Stop loss protection:', text: 'alerts when a position sits without a stop. Alert-only.' },
        ],
      },
      {
        heading: 'Turning a rule on, editing, turning off',
        body:
          'On Rules, each row has a toggle. Expand a row to see the values as tiles; Edit rule turns them into inputs, Save applies. A rule you have never saved is created with the values shown when you turn it on. Before you click, the row tells you what the click does to the lock ("Saving starts a 15-minute window, then locks all rules for 7 days").',
      },
      {
        heading: 'The rule lock',
        body:
          'Pick the window on Live guard → Rule lock: Off, 3d, 7d (default) or 30d. Fifteen minutes after your last save the lock engages and rules that are ON freeze — no edits, no turning off, no tightening — until it lifts. Rules that are OFF can always be turned on; they join the running lock. Off is a session lock, not a free-for-all: rules are editable until your first trade of the day, then hold until the reset.',
        note:
          'The window can only be changed while nothing is locked. Only support can release a running lock early — press "Need it lifted? Ask support" on the Rules banner and say why.',
      },
      {
        heading: 'What the status chip means',
        list: [
          { bold: 'OFF:', text: 'the rule does nothing.' },
          { bold: 'ARMED:', text: 'on, and the engine can act on it.' },
          { bold: 'ALERT ONLY:', text: 'on, but the key is read-only — you will be told, not protected.' },
          { bold: 'NOT ENFORCING:', text: 'on, but setup is unfinished — nothing can act yet.' },
        ],
      },
    ],
  },
  {
    slug: 'live-guard-and-killswitch',
    title: 'Live guard, the killswitch and the calendar',
    intro:
      'Live guard is the screen to keep open while you trade. It shows the session as the guard sees it and holds the two commitment controls — the manual killswitch and the rule lock.',
    sections: [
      {
        heading: 'The session',
        body:
          "Today's P&L on a scale from your loss limit to your target, loss budget left, trades today, open positions, and the Rule panel: each rule that is on with its live status, recomputed on every fill.",
      },
      {
        heading: 'Manual killswitch — you fire it',
        body:
          'Lock yourself out for 3, 6 or 12 hours. Read the confirmation, arm it. There is no off button, only the clock — support can lift it if something real happens. It cannot be armed with a position open, so close your position on the exchange first; unlike a rule breach, the manual switch does not close for you. You can re-arm for longer to extend, but never for less — that would be an off button. While armed, anything you open is closed on sight, and rule edits and key changes are blocked so the lock cannot be worked around. The red Kill switch button in the top bar opens the same dialog from any screen.',
      },
      {
        heading: 'Rule-based killswitch — the engine fires it',
        body:
          'Same three steps, no confirmation, and it does close your positions for you: cancel every order, close every position, lock the account. Four rules fire it — Daily loss protection, Max trades per day, Daily profit target (all locking until your next daily reset) and Close after N losses (a soft lock at your chosen count, default 3 losses for 3 hours, then a hard lock if the streak continues, default 5 losses for 12 hours).',
        note:
          'Three rules never fire it, which is worth knowing before you rely on them: Risk per trade closes only the one oversized position and does not lock; Stop-loss protection is alert-only; and Max drawdown lock, despite its name, alerts today and does not close or lock.',
      },
      {
        heading: 'What we can and cannot do',
        body:
          'We cannot stop you placing an order inside the exchange\'s own app — no exchange gives us that switch. What we do is close the position immediately after it opens, then check you are actually flat. A forced close can register a small loss from fees, and that loss counts toward Close after N losses — one rule\'s action can trigger another.',
      },
      {
        heading: 'Economic calendar',
        body:
          'Under MARKET, the Economic calendar lists upcoming macro releases (CPI, FOMC, NFP, rate decisions) in your timezone, with impact and currency filters and a countdown to the next high-impact print. Events marked TENTATIVE, ALL DAY or DAY 1 have no clock time on purpose.',
        note:
          'The "Auto-lock ±15 min" button is not live on the engine yet; pressing it says so and arms nothing.',
      },
    ],
  },
  {
    slug: 'tax-centre',
    title: 'Tax centre',
    intro:
      'Your Indian financial-year result, rebuilt from exchange fills and reconciled against your wallet, then shown under each treatment a CA might apply. TradeGuardX reports the numbers; it does not file anything and does not decide your treatment.',
    sections: [
      {
        heading: 'One account at a time',
        body:
          'The figures always cover the account selected in the top bar, never every account at once. We have no way to know whose account an account is — if you added a family member\'s key to run the kill switch on it, merging the two would put two people\'s trades under one PAN. Switch accounts to see each one.',
        note: 'If every account is yours they belong on one return, because F&O results net across accounts under a single PAN. Add the figures together until the combined CA report ships.',
      },
      {
        heading: 'F&O and VDA are separate, deliberately',
        list: [
          { bold: 'F&O / Business:', text: 'futures and options. Gains and losses net against each other, and fees are part of the trading result.' },
          { bold: 'VDA / 115BBH:', text: 'flat 30%, no set-off, no deductions beyond cost of acquisition.' },
        ],
        note: 'They are never added into one total, because a combined figure across two tax regimes would mean nothing. Which treatment applies is a question for your CA.',
      },
      {
        heading: 'Currency and the FX rate',
        body:
          'Delta settles in USD and CoinDCX futures in USDT, so an Indian figure has to be converted. We derive the rate from your own capital movements rather than a market feed, show it on the page, and label it a disclosed assumption. It is not a statutory rate, and your CA may apply a different one under Rule 115.',
      },
      {
        heading: 'Which trades are included',
        body:
          'Closed positions only, dated by when the position went flat, inside the selected financial year (1 April to 31 March, IST). Open positions are not income yet and are excluded. CoinDCX spot is not carried at all — we only read futures.',
      },
      {
        heading: 'Where the numbers come from',
        body:
          'Every figure is rebuilt from raw exchange fills using FIFO lot matching, then reconciled against your wallet ledger. The Tax transactions tab lists it position by position so any total can be traced back to the trades behind it, and the CA report tab exports the working.',
      },
    ],
  },
  {
    slug: 'common-issues',
    title: 'Common issues',
    intro: 'Most questions come down to the pill: what it says, and why.',
    sections: [
      {
        heading: 'The pill says NOT PROTECTED but my key is connected',
        body:
          'One of the other two checks is failing: no rule is switched on, or the account has no venue. The band under the top bar names the missing step and links to it.',
      },
      {
        heading: 'The pill says WATCHING',
        body:
          'Your key cannot trade, so we can see fills but never close anything. Create a new key that is allowed to trade and use Accounts → Replace key.',
      },
      {
        heading: 'I cannot edit a rule',
        body:
          'Either the rule lock is running (mint banner on Rules with the countdown; rules that are on are frozen until it lifts) or your killswitch lockout is (red band at the top; edits are blocked until trading resumes). Rules that are off can still be turned on in both cases.',
      },
      {
        heading: 'A trade I opened was closed within seconds',
        body:
          'The account was locked — by a rule cooldown or your killswitch — and anything opened during a lock is closed on sight. Live guard\'s activity feed and the alert you received name the rule. Blocked trades do not count toward your daily trade limit.',
      },
      {
        heading: 'The rule lock says 4 days but I picked 3',
        body:
          'You changed the window during the 15-minute setup period. The lock is anchored on your original save; the countdown shows the remaining time from there.',
      },
      {
        heading: 'Trade missing from the journal',
        body:
          'Trades arrive from the exchange over the live connection. If one is missing after a minute, check the key is still ARMED on Accounts — a failed key stops the feed until it recovers (we retry every 15 minutes). On CoinDCX, only futures are carried; spot trades never appear.',
      },
      {
        heading: 'Subscription past due',
        body:
          'If your card declined, features revert to Free. Plan & billing → Update payment method takes you to Dodo to enter a new card; once payment retries, your plan comes back.',
      },
    ],
  },
  {
    slug: 'account-questions',
    title: 'Account questions',
    intro: 'Email, password, plan, cancelling and deleting.',
    sections: [
      {
        heading: 'Changing your email',
        body:
          'Email changes go through support: use Contact support in the dashboard chat, or email support@tradeguardx.com from your current address with the new one. You verify the new address before it activates.',
      },
      {
        heading: 'Resetting your password',
        body:
          'Signed out: Forgot password on the login page sends a link (valid one hour). Signed in: Security → Change password; we ask for your current password even though the auth provider does not, so an unlocked laptop cannot lock the real owner out.',
      },
      {
        heading: 'Plans',
        list: [
          { bold: 'Free:', text: '1 trading account, 7 days of journal history.' },
          { bold: 'Pro:', text: 'unlimited trading accounts, 3 financial years of history, tax centre, priority support. ₹1,299/month, ₹3,299/quarter or ₹8,999/year — the longer intervals are the discount.' },
        ],
        note: 'Prices include 18% GST, cancel anytime. Every rule is on every plan, on every account — Pro is about how many accounts and how much history, never which rules. Pro+ was retired in September 2026; anyone already on it keeps it.',
      },
      {
        heading: 'Switching or cancelling',
        body:
          'Plan & billing → Upgrade takes you to Pricing, where you pick monthly, quarterly or yearly; Manage billing opens the Dodo customer portal where you can change card or cancel. Paid features stay until the end of the period you have paid for.',
      },
      {
        heading: 'Refund policy',
        body:
          'Full refund if you ask within 7 days of your first payment or a renewal, provided you have not already been refunded for the same plan in the past 12 months. After that, cancel anytime to stop future charges. See the Refund Policy page.',
      },
      {
        heading: 'Deleting your account',
        body:
          'Use Contact support or email support@tradeguardx.com from your account email. Keys are deleted immediately and enforcement stops; trade history and tax records stay for 30 days so you can export them, then go too.',
      },
      {
        heading: 'Verification email not arriving',
        body:
          'Check spam, then request a new one from the login page. Adding noreply@tradeguardx.com to your contacts helps with strict corporate filters.',
      },
    ],
  },
];
