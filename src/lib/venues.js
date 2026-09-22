import { DELTA_EGRESS_IP, deltaApiKeysUrl } from '../api/config';

/**
 * Everything the connect-key screens need to say about a venue, keyed by the
 * `exchange` slug the backend stores. The steps are the same on every
 * exchange — open the key page, pin our IP, grant trading, paste — but each
 * one names the fields differently, and copy that says "Delta" to a CoinDCX
 * user is the kind of small wrongness that makes people doubt the big claims.
 */
const VENUES = {
  delta: {
    family: 'delta',
    name: 'Delta',
    longName: 'Delta Exchange',
    /** Where the exchange's API-key page lives; slug-aware for India/Global. */
    keysUrl: (slug) => deltaApiKeysUrl(slug),
    /** The label the exchange puts on its allow-list field. */
    ipField: 'Whitelisted IP',
    ipRequired: true,
    /** How the exchange names the permission the kill switch needs. */
    scopeLabel: 'Trading',
    /** Path inside the mobile app, when the user is on a phone. */
    mobilePath: 'Algo Hub → APIs',
    withdrawalNote: 'Delta never offers a withdrawal permission on API keys, so nothing can move your funds.',
    /** The exchange asks the user to name the key; we suggest one. */
    suggestsKeyName: true,
    /** Screenshot walkthrough exists for this app. */
    hasAppGuide: true,
    /**
     * The venue's own form, field by field, in the venue's own words. Shown
     * beside our step 1 so the page the user lands on is already familiar —
     * the generic "create a key with trading scope" is where people stall.
     */
    createSteps: [
      { title: 'Name', body: 'Anything you will recognise later. We suggest the name shown below.' },
      { title: 'Whitelisted IP', body: 'Paste our IP. The key then works only from our engine and nowhere else.' },
      { title: 'Trading', body: 'Tick it. Read-only connects fine and can never close a position.' },
      { title: 'Create', body: 'Delta shows the key and secret once. Copy both, then paste them here.' },
    ],
    /** Proven in production. A beta venue says so on every surface. */
    beta: false,
  },
  coindcx: {
    family: 'coindcx',
    name: 'CoinDCX',
    longName: 'CoinDCX Futures',
    // One venue: CoinDCX's INR and USDT "margin modes" list the same
    // instruments, all priced in USDT — only the wallet posting margin differs.
    // The page that actually creates a key. /api-dashboard only lists the
    // existing ones, so it left the user a step short of what we asked for.
    keysUrl: () => 'https://coindcx.com/create-api',
    ipField: 'Bind IP Address',
    // CoinDCX lets a key be unbound; binding it to our IP means the key only
    // works from our engine, which is the point — but it is their toggle.
    ipRequired: false,
    scopeLabel: 'Trade',
    // CoinDCX's Create API key form has no permission choice — label, IP bind,
    // OTP, done. Telling someone to "give the key trade permission" sends them
    // looking for a control that isn't on the page. Connect verifies the scope
    // afterwards anyway, and says so if the key can't act.
    scopeChoice: false,
    mobilePath: 'Profile → API Management',
    withdrawalNote: 'Do not grant Withdraw. We never ask for it and refuse a key that has it.',
    suggestsKeyName: true,
    hasAppGuide: false,
    // Matches CoinDCX's Create API key form field for field, and their own
    // setup docs: label → bind IP → email AND SMS OTP → key shown once.
    createSteps: [
      { title: 'Label', body: 'Anything you will recognise later. We suggest the name shown below.' },
      { title: 'Bind IP Address to API key', body: 'Tick the box, then paste our IP into the IP Address field that appears. The key then works only from our engine.' },
      { title: 'Send OTP', body: 'CoinDCX sends a code to your email and another by SMS. Enter both to confirm the key.' },
      { title: 'Copy the key and secret', body: 'Both appear once, on that screen. Copy them now — CoinDCX will not show the secret again — then paste them here.' },
    ],
    // Live, but no real key has run through it end to end yet — so every
    // surface that names CoinDCX says so. Cheaper than a user finding out
    // during a breach.
    beta: true,
  },
};

/** exchange slug → venue copy; null for non-exchange (prop-firm) accounts. */
export function venueFor(exchangeSlug) {
  if (!exchangeSlug) return null;
  if (exchangeSlug.startsWith('delta')) return VENUES.delta;
  if (exchangeSlug.startsWith('coindcx')) return VENUES.coindcx;
  return null;
}

/** True while a venue has not been proven end to end with a real key. */
export function isBetaVenue(exchangeSlug) {
  return Boolean(venueFor(exchangeSlug)?.beta);
}

/** Our egress IP is one address for every venue — the NAT in front of the engine. */
export const ENGINE_EGRESS_IP = DELTA_EGRESS_IP;
