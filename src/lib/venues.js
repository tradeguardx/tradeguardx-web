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
    // Was beta until a real key ran through it end to end (23 Sep 2026): that
    // probe found and fixed three request-shape bugs, including the one where
    // a position WITH a stop attached read as unprotected. Proven now.
    beta: false,
  },
  shark: {
    family: 'shark',
    name: 'Shark',
    longName: 'Shark Exchange',
    keysUrl: () => 'https://sharkexchange.in/user/api-management',
    ipField: 'IP whitelist',
    ipRequired: false,
    scopeLabel: 'Futures trading',
    mobilePath: 'Profile → API management',
    withdrawalNote: 'Do not grant withdrawal. We never ask for it and refuse a key that has it.',
    suggestsKeyName: true,
    hasAppGuide: false,
    // No taxCentre flag here on purpose: all three venues on this branch are
    // Indian, so the tax centre applies to every account and there is nothing
    // to gate. Shark is the one where it is EXACT rather than converted — it
    // settles in INR, so the figure reconciles to the rupee with Shark's own
    // statement. The hasTaxCentre() machinery arrives with the first global
    // venue that has to switch it off.
    /** No real key has been through this end to end. CoinDCX's own first live
     *  key surfaced six bugs that nothing else would have found. */
    beta: true,
    // NOT YET CHECKED against the live form. Every field above is from
    // Shark's published docs, not their key-creation page. Copy that names a
    // control the user cannot find is the whole reason this array exists, so
    // walk the page once and correct the wording before this ships.
    createSteps: [
      { title: 'Name', body: 'Anything you will recognise later. We suggest the name shown below.' },
      { title: 'IP whitelist', body: 'Paste our IP so the key works only from our engine and nowhere else.' },
      { title: 'Futures trading', body: 'Tick it. A read-only key connects fine and can never close a position.' },
      { title: 'Copy the key and secret', body: 'Copy both, then paste them here.' },
    ],
  }
};

/** exchange slug → venue copy; null for non-exchange (prop-firm) accounts. */
export function venueFor(exchangeSlug) {
  if (!exchangeSlug) return null;
  if (exchangeSlug.startsWith('delta')) return VENUES.delta;
  if (exchangeSlug.startsWith('coindcx')) return VENUES.coindcx;
  if (exchangeSlug.startsWith('shark')) return VENUES.shark;
  return null;
}

/** True while a venue has not been proven end to end with a real key. */
export function isBetaVenue(exchangeSlug) {
  return Boolean(venueFor(exchangeSlug)?.beta);
}

/** Our egress IP is one address for every venue — the NAT in front of the engine. */
export const ENGINE_EGRESS_IP = DELTA_EGRESS_IP;
