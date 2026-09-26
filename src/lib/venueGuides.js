import { DELTA_EGRESS_IP } from '../api/config';

/**
 * The setup guides, one per venue, at /exchanges/<venue>/<guide>.
 *
 * These are the articles that used to live at /help/getting-started, where all
 * three shared a single URL and only the first one was ever crawled. They keep
 * the same `sections` shape that DocsPage's ArticleBody renders, so moving them
 * was a change of address rather than a rewrite — the copy below is the copy
 * that was already reviewed, and the step order in each is the venue's own
 * screen order, not a tidied version of it.
 *
 * `imagesFrom` names the venue slug whose `appGuide` screenshots illustrate the
 * guide. Those live in venues.js and are hosted on Supabase storage so a
 * screenshot showing our egress IP or a venue's scope toggle can be corrected
 * without shipping a build.
 */

const SHARK_STEPS = [
  {
    title: 'Create your TradeGuardX account',
    body: 'Sign up at tradeguardx.com/signup with email or Google. No card is needed to start.',
  },
  {
    title: 'Start adding your Shark account',
    body: 'In the dashboard, open Accounts → "Add trading account" and choose Shark Exchange.',
    sub: [
      'Name the account. Keep this form open — it shows the IP you need to whitelist and is where you paste your key.',
      'The API Key and Secret are required to create the account, so you will finish this form in step 4.',
    ],
  },
  {
    title: 'Create the API key on Shark Exchange',
    body:
      'Open sharkexchange.in/user/api-management on a laptop or desktop. The order here is not the obvious one — Shark creates the key first and only lets you edit its permissions afterwards, so the scope you actually need comes after the secret is already on screen:',
    sub: [
      'Log in on a laptop or desktop. Shark\'s mobile app has no create-key screen at all — this cannot be done on a phone.',
      'Profile icon, top right → API Management, then Create API key.',
      `Label API and Add IP addresses — name it (we suggest "tradeguardx"), paste our IP (${DELTA_EGRESS_IP}) into the address field, then Create.`,
      'Enter Verification Code — Shark texts a 6-digit code to your registered number. It expires, and there is a resend link if it does.',
      'Copy the API key and secret from this screen now. The secret is never shown again.',
      'Tick "Trade Futures" under Edit API Restrictions, then tick that you have stored the keys and Save & Complete.',
    ],
    note:
      'Shark issues every key as Read only. Without "Trade Futures" we can watch the account and send alerts, but we can never close a position — the kill switch would do nothing. This is the step people miss, because it comes after the secret appears and the flow feels finished.',
  },
  {
    title: 'Connect the key in TradeGuardX',
    body: 'On the Add-account form, paste your API Key and Secret and create/connect.',
    sub: [
      'We validate the key against Shark immediately and show the linked account on the Accounts card.',
      'If Shark rejects it, the IP whitelist is the usual cause — Shark answers "IP address not whitelisted" to every request from any other address.',
      'Your secret is encrypted (KMS) before storage and is never shown again.',
    ],
  },
  {
    title: 'Set your guardrails',
    body: 'Open Rules and configure the protections you want — daily loss limit, max trades per day, loss-streak cooldown, risk per trade, and more. On Shark these are rupee amounts, because Shark settles in INR.',
    sub: [
      'Each rule has a "How it works" toggle explaining exactly what it does.',
      'Saving a tighter limit applies instantly; loosening one waits 24 hours — a cooling-off so you cannot weaken protection on impulse.',
      'Shark is in beta. No rule has yet fired against a real open position, so start with limits you are comfortable testing.',
    ],
  },
];

const DELTA_STEPS = [
  {
    title: 'Create your TradeGuardX account',
    body: 'Sign up at tradeguardx.com/signup with email or Google. No card is needed to start.',
  },
  {
    title: 'Start adding your Delta account',
    body: 'In the dashboard, open Accounts → "Add trading account" and choose Delta Exchange (India or Global).',
    sub: [
      'Name the account. Keep this form open — it shows the IP you need to whitelist and is where you paste your key.',
      'The API Key and Secret are required to create the account, so you will finish this form in step 4.',
    ],
  },
  {
    title: 'Create a Trading API key on Delta Exchange',
    body:
      'Open your Delta API keys page at delta.exchange/algo/delta-exchange-apis (log in first) and click "Create a new API key". Delta\'s form asks for just a few things:',
    sub: [
      'API Key Name — type anything you like (e.g. "TradeGuardX"). It is just a label.',
      `Whitelisted IP — paste TradeGuardX's IP (${DELTA_EGRESS_IP}). The connection panel shows it with a Copy button. Delta requires this for Trading keys.`,
      'Permissions — tick "Trading". "Read Data" is always on (leave it); there is no Withdrawal option, so your key can never move funds.',
      'Click "Create API key", then copy the API Key and API Secret. Delta shows the secret only once — copy it immediately.',
    ],
    note:
      'A read-only key (Trading unticked) can only send alerts — it cannot run the kill switch. For enforcement, tick Trading and whitelist the IP. On the Delta mobile app the same form is at Algo Hub → APIs; there, typing the IP is not enough, you must tap + to add it.',
  },
  {
    title: 'Connect the key in TradeGuardX',
    body:
      'On the Add-account form (or the Delta connection panel), paste your API Key and API Secret and create/connect. The API key and secret are required to create a Delta account.',
    sub: [
      'We validate the key against Delta immediately and show your linked Delta account and email.',
      'If Delta rejects it, check you used the right region key and gave it a few minutes — new keys take ~5 minutes to activate.',
      'Your secret is encrypted (KMS) before storage and is never shown again.',
    ],
  },
  {
    title: "Confirm you're protected",
    body: 'The connection should read CONNECTED and the header shows a green "Protected" pill.',
    note:
      'If it shows "Alerts only" or "Unprotected", the key is read-only or the IP is not whitelisted — recreate the key with the Trading permission and the IP whitelisted.',
  },
  {
    title: 'Set your guardrails',
    body:
      'Open Rules and configure the protections you want — daily loss limit, max trades per day, loss-streak cooldown, risk per trade, and more.',
    sub: [
      'Each rule has a "How it works" toggle explaining exactly what it does.',
      'Saving a tighter limit applies instantly; loosening one waits 24 hours (a cooling-off so you cannot weaken protection on impulse).',
    ],
  },
  {
    title: "Trade — you're covered",
    body:
      'Open the Live tab to watch your session in real time: status, guardrail meters, and activity. If a rule is breached, the kill switch cancels your orders, closes your positions, and locks the account with an unlock countdown.',
  },
];

const COINDCX_STEPS = [
  {
    title: 'Create your TradeGuardX account',
    body: 'Sign up at tradeguardx.com/signup with email or Google. No card is needed to start.',
  },
  {
    title: 'Start adding your CoinDCX account',
    body: 'In the dashboard, open Accounts → "Add trading account" and choose CoinDCX.',
    sub: [
      'Name the account. Keep this form open — it shows the IP you need to bind and is where you paste your key.',
      'The API Key and Secret are required to create the account, so you will finish this form in step 4.',
    ],
  },
  {
    title: 'Create an API key on CoinDCX',
    body: 'Open coindcx.com/create-api on a laptop or desktop (log in first). Their form is short:',
    sub: [
      'Log in on a laptop or desktop. CoinDCX has no create-key screen in their mobile app, so this cannot be done on a phone.',
      'Profile icon, top right → API Dashboard → Create API Key.',
      'Label — type anything you like (e.g. "TradeGuardX"). It is just a name.',
      `Bind IP Address to API key — tick this, then paste TradeGuardX's IP (${DELTA_EGRESS_IP}) into the field that appears. The key then works only from our engine and nowhere else.`,
      'Send OTP — CoinDCX sends one code to your email and another by SMS. Enter both to confirm the key.',
      'Copy the API Key and Secret. Both are shown once, on that screen — the secret is hidden the moment you refresh.',
    ],
    note:
      'There is no permission checkbox on CoinDCX\'s form, so there is nothing to tick for trading — do not go looking for one. We verify the key can actually act the moment you connect it, and tell you plainly if it cannot.',
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
    note:
      'If it shows "Alerts only" or "Unprotected", the key cannot trade or the IP binding does not match — recreate the key and bind it to the IP shown on the panel.',
  },
  {
    title: 'Set your guardrails',
    body:
      'Open Rules and configure the protections you want — daily loss limit, max trades per day, loss-streak cooldown, risk per trade, and more.',
    sub: [
      'Each rule has a "How it works" toggle explaining exactly what it does.',
      'Saving a tighter limit applies instantly; loosening one waits 24 hours (a cooling-off so you cannot weaken protection on impulse).',
    ],
  },
  {
    title: "Trade — you're covered",
    body:
      'Open the Live tab to watch your session in real time: status, guardrail meters, and activity. If a rule is breached, the kill switch cancels your orders, closes your positions, and locks the account with an unlock countdown.',
  },
];

/**
 * Guides keyed by venue slug, then by guide slug. The guide slug is the second
 * path segment — /exchanges/coindcx/api-key — and nesting stops there.
 */
export const VENUE_GUIDES = {
  shark: {
    'api-key': {
      slug: 'api-key',
      navLabel: 'Connect a key',
      title: 'How to create a Shark Exchange API key',
      // Kept under 60 including the brand: the suffix is added by the page.
      seoTitle: 'Shark Exchange API Key Setup — TradeGuardX',
      description:
        'Step by step: create a Shark Exchange API key on a laptop, whitelist our IP, enable Trade Futures, and connect it to TradeGuardX. About five minutes.',
      intro:
        'Connect your Shark Exchange account and be protected in about five minutes. There is no extension to install — you create an API key on Shark, whitelist our IP, enable Trade Futures, and paste the key into TradeGuardX.',
      imagesFrom: 'shark',
      sections: [
        {
          heading: 'Before you start',
          body:
            'Two things about Shark that are easy to get wrong, and both cost a session if you find them halfway through.',
          list: [
            {
              bold: 'It has to be a computer:',
              text: 'Shark\'s mobile app has no create-key screen at all. A laptop or desktop browser is the only way. Their limit, not ours.',
            },
            {
              bold: 'Permissions come last, not first:',
              text: 'Shark creates the key and only then lets you edit its restrictions, so "Trade Futures" is ticked after the secret is already on screen — exactly when the flow feels finished.',
            },
          ],
        },
        {
          heading: 'Set up Shark Exchange — step by step',
          body: 'Follow these in order. The only part done outside TradeGuardX is creating the API key on Shark.',
          steps: SHARK_STEPS,
        },
      ],
    },
  },

  coindcx: {
    'api-key': {
      slug: 'api-key',
      navLabel: 'Connect a key',
      title: 'How to create a CoinDCX API key',
      seoTitle: 'CoinDCX API Key Setup for Futures — TradeGuardX',
      description:
        'Step by step: create a CoinDCX API key on a desktop browser, bind it to our IP, confirm the OTPs, and connect it to TradeGuardX. About five minutes.',
      intro:
        'Connect your CoinDCX futures account and be protected in about five minutes. There is no extension to install — you create an API key on CoinDCX, bind it to our IP, and paste the key into TradeGuardX.',
      imagesFrom: 'coindcx',
      sections: [
        {
          heading: 'Before you start',
          list: [
            {
              bold: 'It has to be a desktop browser:',
              text: 'CoinDCX has no create-key screen in their mobile app, and the flow needs a computer. Their limit, not ours.',
            },
            {
              bold: 'The secret is shown once:',
              text: 'It is hidden the moment you refresh that page, and CoinDCX will not show it again. Copy both values before you navigate away.',
            },
            {
              bold: 'There is no permission to tick:',
              text: 'CoinDCX\'s form has no trading checkbox. We verify the key can act when you connect it and say so if it cannot.',
            },
          ],
        },
        {
          heading: 'Set up CoinDCX — step by step',
          body: 'Follow these in order. The only part done outside TradeGuardX is creating the API key on CoinDCX.',
          steps: COINDCX_STEPS,
        },
      ],
    },

    margin: {
      slug: 'margin',
      navLabel: 'INR vs USDT margin',
      title: 'CoinDCX INR and USDT margin are one venue',
      seoTitle: 'CoinDCX INR vs USDT Margin Explained — TradeGuardX',
      description:
        'CoinDCX INR and USDT margin modes are a wallet toggle, not two exchanges. One API key covers both, and your TradeGuardX rules apply across the pair.',
      intro:
        'People connect CoinDCX twice, expecting to need one account for INR margin and another for USDT. You do not. Here is exactly what the toggle changes and what it does not.',
      sections: [
        {
          heading: 'It is a wallet toggle, not two exchanges',
          body:
            'CoinDCX lets you margin the same perpetuals from either your INR wallet or your USDT wallet. That is a wallet toggle, not two exchanges: the instruments are identical and prices, fees and P&L are quoted in USDT either way. One key covers both, your rules apply across both, and your equity is reported as a single USDT figure with the INR wallet converted at CoinDCX\'s own spot rate.',
        },
        {
          heading: 'What that means for your rules',
          list: [
            {
              bold: 'One account, not two:',
              text: 'Add CoinDCX once. A second account for the other margin mode would split your daily loss limit across two budgets, which is the opposite of what a daily limit is for.',
            },
            {
              bold: 'Your limits are USDT figures:',
              text: 'Because CoinDCX prices everything in USDT, a daily loss limit on CoinDCX is a USDT amount — unlike Shark, which settles in INR and takes rupee limits.',
            },
            {
              bold: 'The conversion is CoinDCX\'s, not ours:',
              text: 'The INR wallet is converted at CoinDCX\'s own spot rate, so the equity we measure your rules against is the equity CoinDCX reports.',
            },
          ],
        },
        {
          heading: 'Futures only, on both margin modes',
          body:
            'CoinDCX spot is not enforced on either wallet, does not appear in the journal, and is not carried into the tax centre. Switching margin mode does not change that — spot is a different product, not a different wallet.',
        },
      ],
    },
  },

  delta: {
    'api-key': {
      slug: 'api-key',
      navLabel: 'Connect a key',
      title: 'How to create a Delta Exchange API key',
      seoTitle: 'Delta Exchange API Key Setup — TradeGuardX',
      description:
        'Step by step: create a Delta Exchange Trading API key, whitelist our IP, and connect it to TradeGuardX. Works on Delta India and Delta Global. About five minutes.',
      intro:
        'Connect your Delta account and be protected in about five minutes. There is no extension to install — you create a Trading API key on Delta, whitelist our IP, and paste the key into TradeGuardX.',
      imagesFrom: 'delta',
      sections: [
        {
          heading: 'Before you start',
          list: [
            {
              bold: 'Pick the right region:',
              text: 'Delta India and Delta Global are separate accounts with separate keys. A Global key on an India account fails in a way that looks identical to a bad key — this is the most common connection failure on Delta.',
            },
            {
              bold: 'A new key needs about five minutes:',
              text: 'Delta takes roughly five minutes to activate a freshly created key. An immediate rejection is often just impatience.',
            },
            {
              bold: 'Delta is the one exchange you can do this on a phone:',
              text: 'The path in the Delta app is Algo Hub → APIs. On the others it has to be a computer.',
            },
          ],
        },
        {
          heading: 'Set up Delta Exchange — step by step',
          body: 'Follow these in order. The only part done outside TradeGuardX is creating the API key on Delta.',
          steps: DELTA_STEPS,
        },
      ],
    },
  },
};

/** Guides for a venue, in nav order. Empty array for a venue with none. */
export function guidesFor(venueSlug) {
  return Object.values(VENUE_GUIDES[venueSlug] ?? {});
}

export function guideFor(venueSlug, guideSlug) {
  return VENUE_GUIDES[venueSlug]?.[guideSlug] ?? null;
}
