/**
 * Exchange documentation, keyed by exchange and split into navigable articles
 * (same shape as the /help center). Rendered by DocsPage with a broker toggle.
 * Only Delta Exchange ships today; add another key here (and a DOC_BROKERS entry)
 * to make it appear in the toggle — no page changes needed.
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
                  'Whitelisted IP — paste TradeGuardX\'s IP. The connection panel shows it with a Copy button (currently 13.205.214.83 on dev). Delta requires this for Trading keys.',
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
      {
        slug: 'how-it-works',
        title: 'How enforcement works',
        intro:
          'Once your key is connected, a dedicated engine keeps a live connection to Delta and streams your positions, orders, and balances — and checks every update against your rules within seconds.',
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
          'When a hard rule (like your daily loss limit or loss-streak lock) is breached, the kill switch fires. It runs a verify-and-retry sequence so it doesn\'t give up if Delta is briefly slow.',
        sections: [
          {
            list: [
              { bold: 'Cancel:', text: 'all your open orders on the account are cancelled.' },
              { bold: 'Close:', text: 'all open positions are market-closed (verified, with retries).' },
              { bold: 'Lock:', text: 'the account enters a cooldown; any new position you open during the lock is force-closed on sight.' },
            ],
            note: 'The lock is persisted, so it survives an engine restart — it can only be lifted by time, never by an error.',
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
        slug: 'cooldowns',
        title: 'Cooldowns & locks',
        intro:
          'When a rule locks the account, the Live dashboard shows a countdown to when it unlocks, and the header shows a "Locked" pill from any page. Locks are time-based and self-releasing.',
        sections: [
          {
            list: [
              { bold: 'Soft vs hard:', text: 'a loss streak triggers a shorter cooldown first, then a longer hard lock if it continues.' },
              { bold: 'Daily locks:', text: 'daily-loss / target / max-trades locks release at your next daily reset.' },
              { bold: 'Blocked trades:', text: 'trades you open during a lock are auto-closed and shown as "Blocked" — they don\'t count toward your limits or loss streak.' },
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
              { bold: '"Delta rejected the API credentials":', text: 'usually a region mismatch (India vs Global key), a brand-new key (Delta needs ~5 minutes), or the Trading permission not enabled.' },
              { bold: '"Unprotected" banner:', text: 'no enforcing key is connected — the key was disconnected or is read-only. Reconnect a Trading-scoped, IP-whitelisted key.' },
              { bold: 'Rules not enforcing:', text: 'confirm the account shows "Protected" in the header and the key has Trading permission + the correct IP whitelisted.' },
              { bold: 'Feed delayed:', text: 'a brief note that the last known equity is shown; it clears automatically when the feed catches up.' },
            ],
          },
        ],
      },
    ],
  },
};

// Brokers shown in the docs toggle, in order. Add more here as they ship.
export const DOC_BROKERS = [{ id: 'delta', label: 'Delta Exchange' }];
