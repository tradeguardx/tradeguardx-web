import { DELTA_EGRESS_IP, deltaApiKeysUrl } from '../api/config';

/**
 * Supabase public storage, where the connect walkthrough screenshots live.
 *
 * Hosted rather than bundled so a screenshot can be corrected without shipping
 * a build — these images show our egress IP and the venue's own scope toggles,
 * both of which change more often than the site does.
 */
const GUIDE = 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media';
const guideImg = (file) => `${GUIDE}/${file}`;

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
    /** The exchange asks the user to name the key; we suggest one. */
    suggestsKeyName: true,
    /**
     * Screenshot walkthrough, shown on phones where the user is in the venue's
     * app rather than on its site in a browser tab. Lives here rather than in
     * the component because it is venue copy, like keysUrl and createSteps —
     * one place to remember when a venue is added.
     *
     * Hosted so a screenshot can be corrected without a deploy, with the older
     * bundled copies kept as fallbackSrc. This guide was bundled originally so
     * it could not break mid-connect — when someone is holding a secret the
     * venue will not show twice — and moving it to storage would have given
     * that up. Both together keep the new artwork and the old guarantee; if
     * both fail, the caption is shown as text, because the caption IS the
     * instruction.
     */
    appGuide: [
      { src: guideImg('tradeguardx_step_1.png'), fallbackSrc: '/guide/delta-app/step-1.png', alt: 'Step 1 — Open Delta and tap Algo Hub' },
      { src: guideImg('tradeguardx_step_2.png'), fallbackSrc: '/guide/delta-app/step-2.png', alt: 'Step 2 — Tap APIs' },
      { src: guideImg('tradeguardx_step_3.png'), fallbackSrc: '/guide/delta-app/step-3.png', alt: 'Step 3 — Name the key, paste our IP, then tap + to add it. Typing the IP alone will not save it' },
      { src: guideImg('tradeguardx_step_4.png'), fallbackSrc: '/guide/delta-app/step-4.png', alt: 'Step 4 — The IP shows as a chip; tick Trading, then tap Create API key' },
    ],
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
    /**
     * CoinDCX issues API keys ONLY from a desktop browser — there is no
     * create-key flow in their mobile app. So there is no mobile path to name,
     * and naming one sends a user hunting through an app for a screen that
     * does not exist.
     *
     * desktopOnlyNote is per venue because the constraint is not the same
     * everywhere: CoinDCX needs a computer, Shark needs its website rather
     * than its app. One shared sentence would have to overstate one of them,
     * and an instruction stricter than the truth costs a user a session they
     * could have spent trading.
     */
    desktopOnly: true,
    desktopOnlyNote: 'CoinDCX has no create-key screen in their mobile app, and the flow needs a desktop browser. Their limit, not ours.',
    mobilePath: null,
    suggestsKeyName: true,
    /**
     * Six steps, all hosted. The captions are the instruction in words, which
     * is what shows if an image fails to load — so they say what to DO, not
     * what the picture contains.
     */
    appGuide: [
      { src: guideImg('coindcx-step1.png'), alt: 'Step 1 — Log in to CoinDCX and click the Profile icon, top right' },
      { src: guideImg('coindcx-step2.png'), alt: 'Step 2 — In the left menu, click API Dashboard' },
      { src: guideImg('coindcx-step3.png'), alt: 'Step 3 — Click Create API Key' },
      { src: guideImg('coindcx-step4.png'), alt: 'Step 4 — Label the key, tick Bind IP Address, paste our IP, then Send OTP' },
      { src: guideImg('coindcx-step5.png'), alt: 'Step 5 — Enter the codes CoinDCX emails and texts you' },
      { src: guideImg('coindcx-step6.png'), alt: 'Step 6 — Copy the API key and the secret now; the secret is hidden once you refresh' },
    ],
    // Same shape as Shark's: where to log in, how to get to the form, then the
    // form itself. It used to start at "Label", which is the fourth thing you
    // do — someone reading it on a phone had no idea they needed a computer,
    // and someone on a computer still had to find the API Dashboard on their
    // own. Two venues describing the same kind of flow at two different levels
    // of detail is a tell that one of them was written from the form rather
    // than from the journey.
    //
    // Matches CoinDCX's own screens, in order.
    createSteps: [
      { title: 'Log in on a laptop or desktop', body: 'The CoinDCX mobile app does not allow API key creation — this has to be a computer.' },
      { title: 'Profile icon, top right → API Dashboard', body: 'API Dashboard is in the left-hand menu once the profile panel is open.' },
      { title: 'Create API Key', body: 'Opens the Create an API Key form.' },
      { title: 'Label and Bind IP Address, then Send OTP', body: 'Name it, tick Bind IP Address to API Key, paste our IP into the field that appears, then Send OTP.' },
      { title: 'Enter the codes', body: 'CoinDCX sends one to your email and another by SMS. Both are needed to confirm the key.' },
      { title: 'Copy the API key and secret', body: 'Both appear once, on that screen. Copy them now — the secret is hidden the moment you refresh — then paste them here.' },
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
    // Shark's own words on the form: "Trade Futures", under Edit API
    // Restrictions. We said "Futures trading", which is a control nobody can
    // find by that name.
    scopeLabel: 'Trade Futures',
    /**
     * Shark needs a laptop or desktop: their mobile app has no create-key
     * flow at all.
     *
     * This said a phone browser was fine, inferred from their step-1 caption
     * saying "log in on a browser". That was reading a constraint out of a
     * word they did not use, and the direction of the error is the bad one —
     * someone follows it on a phone, cannot finish, and concludes the product
     * is broken.
     */
    desktopOnly: true,
    desktopOnlyNote: 'Shark only allows API key creation from a laptop or desktop — their mobile app has no create-key screen at all.',
    mobilePath: null,
    suggestsKeyName: true,
    appGuide: [
      { src: guideImg('shark-step-1.png'), alt: 'Step 1 — Sign in on a browser, open the profile menu top-right, choose API Management, then Create API key' },
      { src: guideImg('shark-step-2.png'), alt: 'Step 2 — Label it tradeguardx, paste our IP into the address field, then Create' },
      { src: guideImg('shark-step-3.png'), alt: 'Step 3 — Enter the 6-digit code Shark texts you and hit Verify before the timer runs out' },
      { src: guideImg('shark-step-4.png'), alt: 'Step 4 — Tick Trade Futures; Shark issues the key Read-only and without it nothing can be closed. Then tick that you have stored the keys and Save & Complete' },
    ],
    // No taxCentre flag here on purpose: all three venues on this branch are
    // Indian, so the tax centre applies to every account and there is nothing
    // to gate. Shark is the one where it is EXACT rather than converted — it
    // settles in INR, so the figure reconciles to the rupee with Shark's own
    // statement. The hasTaxCentre() machinery arrives with the first global
    // venue that has to switch it off.
    /** No real key has been through this end to end. CoinDCX's own first live
     *  key surfaced six bugs that nothing else would have found. */
    beta: true,
    // VERIFIED, 26 Sep 2026: the IP whitelist is real and Shark enforces it.
    // A live key answered 403 {"error":"4009","message":"Access denied",
    // "details":"IP address not whitelisted"} to every endpoint when called
    // from outside our egress, and the address we publish below matches the
    // Elastic IP on the engine's NAT — so it stays correct across task
    // replacement rather than only until the next deploy.
    //
    // CHECKED against the live form, 26 Sep 2026, via the walkthrough captures.
    // Two things were wrong and both would have stranded someone mid-flow:
    // the scope control is called "Trade Futures", not "Futures trading"; and
    // there was no OTP step at all, though Shark texts a code and will not
    // issue the key without it.
    //
    // The ORDER matters and is not the obvious one: Shark creates the key
    // first and only then lets you edit its restrictions, so permissions come
    // after the secret is already on screen — which is the moment people think
    // they are finished and navigate away.
    createSteps: [
      { title: 'Log in on a laptop or desktop', body: 'The Shark mobile app does not allow API key creation at all — this has to be a computer.' },
      { title: 'Profile icon, top right → API Management', body: 'The profile menu is where the API section lives.' },
      { title: 'Create API key', body: 'Opens the Create API Key form.' },
      { title: 'Label API and Add IP addresses', body: 'Name it, paste our IP into the address field, then Create.' },
      { title: 'Enter Verification Code', body: 'Shark texts a 6-digit code to your registered number. It expires, and there is a resend link if it does.' },
      { title: 'Tick Trade Futures, then Save & Complete', body: 'Shark issues every key as Read only. Without Trade Futures we can watch the account but never close a position — the kill switch would do nothing. Copy the key and secret on this screen first; the secret is never shown again.' },
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
