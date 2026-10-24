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
    ipField: 'Trusted IPs to Whitelist',
    ipRequired: true,
    /**
     * The two things on Delta's IP field that cost people a key.
     *
     * The box is not the whitelist. Typing an IP and pressing Create API key
     * leaves it out — it counts only once + Add turns it into a chip. And
     * Delta offers ready-made chips beside it (My IP Address, Algotest,
     * Tradetron); "My IP Address" is the one that looks right and is not. A
     * key whitelisted to the user's own home IP connects, verifies, and then
     * fails from our engine, which is the worst of both — they believe they
     * are covered.
     */
    ipAddNote: 'Press + Add so it becomes a chip. Ignore the ready-made chips beside it — My IP Address is your computer, not us.',
    /**
     * Delta's form opens with an account dropdown. Nothing else we support
     * has one, and a key made on the wrong account belongs to an account we
     * are not watching: it connects, it passes the scope check, and it can
     * never close the position the user is actually holding.
     */
    accountField: 'Account Name',
    accountNote: 'The dropdown at the top. Pick the account you actually trade in — the key works on that one only.',
    /** How the exchange names the permission the kill switch needs. */
    scopeLabel: 'Trading',
    /**
     * Delta's Permissions block is two cards, not one tick box, and the first
     * is already on. Drawing only Trading made the replica look unlike the
     * screen it is copying — and "All API keys have read permissions" reads,
     * to someone skimming, as though the key is already set up.
     */
    readScopeLabel: 'Read Data',
    /** Path inside the mobile app, when the user is on a phone. */
    mobilePath: 'Algo Hub → APIs',
    /**
     * Getting to the form, as three taps.
     *
     * This step used to render the whole createSteps list — every field of the
     * form, in words, above a screen that then draws the same form filled in.
     * Reading the form twice before seeing it once is not thoroughness, it is
     * a wall of text between someone and a button. Finding the page is the
     * only thing step one has to do.
     */
    navPath: ['Algo Hub', 'APIs', 'Create API key'],
    /** The exchange asks the user to name the key; we suggest one. */
    suggestsKeyName: true,
    /** Delta's own label for it. Ours said "Name"; the form says this. */
    keyNameField: 'API Key Name',
    /**
     * The rest of Delta's form as it is drawn, so the replica can BE the form
     * rather than describe it. Every string here is read off the live page —
     * placeholder text, button labels, the suggested-IP chips, the sub-line
     * under each permission card. If Delta restyles the page these are what
     * go stale, and they are all in one block for that reason.
     */
    accountDefault: 'Main',
    ipAddButton: '+ Add',
    /**
     * Delta's own one-click chips. Drawn because leaving them out makes the
     * replica look unlike the screen — and because the user needs to be told
     * to walk past them, which cannot be said about something not shown.
     */
    ipChips: ['My IP Address', 'Algotest IP', 'Tradetron IP'],
    readScopeNote: 'All API keys have read permissions',
    scopeNote: 'Select this to give trading permissions',
    submitLabel: 'Create API key',
    /** Delta's accent, so the replica reads as their page and not ours. */
    accent: 'amber',
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
      { title: 'Account Name', body: 'The dropdown at the top. Pick the account you actually trade in — the key works on that one only.' },
      { title: 'API Key Name', body: 'Anything you will recognise later. We suggest the name shown below.' },
      { title: 'Trusted IPs to Whitelist', body: 'Paste our IP into the box and press + Add, so it shows as a chip. Typing it alone does not save it. The chips Delta offers — My IP Address, Algotest, Tradetron — are not us.' },
      { title: 'Permissions', body: 'Read Data is already on and cannot be turned off. Tick Trading as well — a read-only key connects fine and can never close a position.' },
      { title: 'Create API key', body: 'Delta shows the key and secret once. Copy both, then paste them here.' },
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
    navPath: ['Profile icon', 'API Dashboard', 'Create API Key'],
    /**
     * CoinDCX confirms the key with two codes, not one, and they arrive by
     * different routes. Someone watching only their inbox waits for an SMS
     * they have already received, and the form times out.
     */
    otpNote: 'CoinDCX then sends two codes — one by email, one by SMS. Both are needed.',
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
    /*
     * CHECKED against Shark's live Create API Key modal, 1 Oct 2026.
     *
     * We had this field as "IP whitelist", optional. Both wrong. Their form
     * labels it "Add IP addresses (comma separated)" and marks it required
     * with a red asterisk alongside the label — so our copy was telling people
     * a mandatory field was theirs to skip, under a name that is not on the
     * screen.
     */
    keyNameField: 'Label API',
    keyNameHint: 'Between 2 and 64 characters. Any label you will recognise later.',
    ipField: 'Add IP addresses (comma separated)',
    ipRequired: true,
    submitLabel: 'Create',
    /**
     * Shark's create form has two fields and nothing else — no permission
     * control at all. It is set afterwards, which `afterCreate` below draws.
     */
    scopeChoice: false,
    /**
     * The screen Shark shows once the key exists, and the one that decides
     * whether any of this works.
     *
     * Three things have to happen on it and two of them are easy to miss: the
     * secret is visible only here, the key is issued Read-only so Trade
     * Futures has to be ticked, and Save & Complete stays inert until the
     * "I have noted & stored" box is ticked. Someone who copies the keys and
     * closes the tab has a key that connects to us and can never close a
     * position.
     */
    afterCreate: {
      lead: 'Shark shows the API key and the secret on this screen and nowhere else. Copy both before you touch anything on it.',
      keyLabel: 'API Key',
      secretLabel: 'Secret Key',
      restrictionsHeading: 'Edit API Restrictions',
      readScopeLabel: 'Read',
      readScopeNote: 'Shark issues every key Read-only.',
      scopeNote: 'Without it we can watch the account and never close a position.',
      ipHeading: 'IP Access Restriction:',
      ipMode: 'Restricted access to trusted IPs only (recommended)',
      ipConfirmButton: 'Confirm',
      /** Their own three lines, in their own order and wording. */
      warnings: [
        'Store the API and Secret Key securely.',
        'If lost, you will need to create a new API Key.',
        'For security reasons, Secret Keys are only visible when the API key is created.',
      ],
      confirmLabel: 'I have noted & stored the API key & Secret Key',
      submitLabel: 'Save & Complete',
      submitNote: 'Stays greyed out until that box is ticked.',
    },
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
    navPath: ['Profile icon', 'API Management', 'Create API key'],
    /** Shark texts one 6-digit code, and it expires; there is a resend link. */
    otpNote: 'Shark then texts a 6-digit code to your registered number. It expires — resend it if it does.',
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
    // statement. hasTaxCentre() below exists for BloFin, the first global
    // venue, which switches it off.
    /** Out of beta, 27 Sep 2026. A real key has been through it end to end and
     *  the daily-loss rule has fired on a live Shark account. */
    beta: false,
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
      { title: 'Label API and Add IP addresses', body: 'Both are required. Name it, paste our IP into the address field, then Create.' },
      { title: 'Enter Verification Code', body: 'Shark texts a 6-digit code to your registered number. It expires, and there is a resend link if it does.' },
      { title: 'Tick Trade Futures, then Save & Complete', body: 'Shark issues every key as Read only. Without Trade Futures we can watch the account but never close a position — the kill switch would do nothing. Copy the key and secret on this screen first; the secret is never shown again.' },
    ],
  },
  /*
   * BloFin — the first global venue, USDT-margined perpetuals only.
   *
   * NOT YET CHECKED against a live screenshot of BloFin's form: the field
   * names below are the ones in BloFin's API docs and help pages, kept
   * generic where we are not sure of the exact label. No appGuide images, so
   * the connect flow renders the written steps and the replica only.
   *
   * Two things are different from every venue before it:
   *   - The key has a PASSPHRASE the user chooses on BloFin's form, and every
   *     request is signed with it, so the connect form asks for it as a third
   *     field (hasPassphrase). It is stored inside the encrypted secret.
   *   - BloFin offers a Transfer permission. It must stay off; the key needs
   *     Read and Trade and nothing that can move money.
   *
   * The IP bind is optional on their side, but an unbound BloFin key expires
   * after 90 days — and a key that silently dies is a guard that silently
   * stops. So we treat it as required in our copy.
   */
  blofin: {
    family: 'blofin',
    name: 'BloFin',
    longName: 'BloFin',
    keysUrl: () => 'https://blofin.com/account/apis',
    keyNameField: 'API name',
    keyNameHint: 'Any name you will recognise later.',
    ipField: 'IP address (bind IP)',
    ipRequired: false,
    ipHint: 'Optional on BloFin, but bind it: an unbound key expires after 90 days, and then the guard cannot act.',
    readScopeLabel: 'Read',
    readScopeNote: 'Tick it — we need to see positions and orders.',
    readScopeSelectable: true,
    scopeLabel: 'Trade',
    scopeNote: 'Lets us close a position when a rule fires.',
    /** Permissions that must stay unticked, drawn so nobody ticks them. */
    offScopes: [{ label: 'Transfer', note: 'Leave this off. We never move money, and the key does not need it.' }],
    noWithdrawNote: 'Read and Trade only. Leave Transfer off — the key can read your account and place or close trades, and nothing that moves money.',
    /** BloFin keys carry a passphrase the user sets; the connect form asks for it. */
    hasPassphrase: true,
    passphraseField: 'Passphrase',
    passphraseNote: 'You choose this on BloFin. Write it down — you paste it here too, and BloFin will not show it again.',
    desktopOnly: false,
    mobilePath: null,
    navPath: ['Account', 'API Management', 'Create API key'],
    suggestsKeyName: true,
    createSteps: [
      { title: 'Account → API Management', body: 'Log in to BloFin, open your account menu and choose API Management.' },
      { title: 'Create API key and give it a name', body: 'Any name you will recognise later. We suggest the name shown below.' },
      { title: 'Set a passphrase', body: 'You choose it. Keep it somewhere safe — you paste it into TradeGuardX as well, and BloFin will not show it again.' },
      { title: 'Permissions: Read and Trade only', body: 'Tick Read and Trade. Never tick Transfer — we do not need it, and a key without it cannot move your money.' },
      { title: 'Bind our IP', body: 'Paste our IP into the IP field. BloFin expires a key with no IP after 90 days, and from then on the guard cannot act.' },
      { title: 'Copy the API key and secret', body: 'Then paste the key, the secret and your passphrase here.' },
    ],
    /** Tax centre is for Indian venues; BloFin is not part of it. */
    taxCentre: false,
    beta: true,
  },
  /*
   * Exness — the first forex/CFD venue (FX pairs, metals, indices, energies,
   * crypto CFDs), and only accounts on Exness's OWN platform (Exness Terminal
   * / web terminal). The Exness Trader API cannot see MT4 or MT5 accounts, so
   * the copy says so plainly rather than letting someone connect a key that
   * will never find their positions.
   *
   * UNVERIFIED: nothing below has been checked against a live screenshot of
   * Exness's Key Management screen. The words come from the Exness Trader API
   * docs (exness-api.com) and the shared spec: the menu path, the "Info" key
   * type name, the "trading key" wording, the allowed-IP field label and the
   * statement that the key cannot withdraw are all to be confirmed with a real
   * account. No appGuide images, so the connect flow renders the written steps
   * and the replica only — same as BloFin.
   *
   * What is different from every venue before it:
   *   - The secret is a PRIVATE KEY (Ed25519, PEM, several lines), so the
   *     secret box is a multi-line textarea (secretMultiline) and the
   *     key+secret paste-splitter is switched off (pasteSplit: false) — it
   *     would cut a PEM in half.
   *   - The key is scoped to one trading account, and the API is served from
   *     a per-account host, so the connect form asks for two more values
   *     (extraFields): the account ID (required) and the API host (optional;
   *     the backend defaults it and only accepts *.exness.com hosts).
   *   - Exness has a read-only "Info" key type. It must not be used; the
   *     backend probes for it and rejects it as KEY_READ_ONLY.
   */
  exness: {
    family: 'exness',
    name: 'Exness',
    longName: 'Exness (native platform)',
    // Personal Area; Key Management is reached from there (see navPath).
    keysUrl: () => 'https://my.exness.com/',
    keyNameField: 'Key name',
    keyNameHint: 'Any name you will recognise later.',
    /** Exness scopes each key to one trading account; drawn as their picker. */
    accountField: 'Trading account',
    accountDefault: 'Your Exness native-platform account',
    accountNote: 'Pick the account you trade on the Exness platform. MT4 and MT5 accounts are not supported.',
    ipField: 'Allowed IPs',
    ipRequired: true,
    ipHint: 'Add our IP to the key. Calls from any other address are refused, so without it we cannot act.',
    scopeLabel: 'Trading key',
    scopeNote: 'A key that can place and close trades on this account.',
    /** Drawn unticked: the read-only key type, which we turn away at connect. */
    offScopes: [{ label: 'Info key', note: 'Read-only. Do not pick it — it can watch but never close a position, and we reject it.' }],
    noWithdrawNote: 'A trading key reads the account and opens or closes trades on it. It cannot withdraw or move money.',
    /** Under the name in the venue picker, where someone decides if this venue is theirs. */
    pickerNote: 'Exness platform only — not MT4/MT5',
    /** Shown on the connect forms, before anyone makes a key. */
    platformNote: 'Exness platform accounts only (Exness Terminal / web terminal). MT4 and MT5 accounts are not supported — their keys cannot see those trades.',
    /* Exness's own name for it on the Key Management screen (checked 24 Oct 2026):
       "API Key" and "Secret Key", each with a copy button. One line, masked. */
    secretLabel: 'Secret Key',
    secretPlaceholder: 'Paste the Secret Key',
    secretMultiline: false,
    pasteSplit: false,
    /**
     * Inputs beyond key and secret. `name` is the field sent to the API, and
     * the API sends only the names listed here, for this venue.
     */
    extraFields: [
      {
        name: 'accountId',
        label: 'Account ID',
        hint: 'The number of the Exness account you made the key for (Personal Area → My accounts).',
        placeholder: 'e.g. 12345678',
        required: true,
        inputMode: 'numeric',
        pattern: /^\d{1,20}$/,
        invalidHint: 'Digits only.',
      },
      {
        name: 'host',
        label: 'API host',
        hint: 'Leave empty unless Exness shows you a different host.',
        placeholder: 'https://api.exness.com',
        required: false,
        inputMode: 'url',
      },
    ],
    formStepBody: 'Pick your Exness platform account, choose a trading key (not an Info key), add our IP, and create the key.',
    pasteStep: {
      title: 'Paste the API Key, Secret Key and account ID here',
      body: 'Use the copy buttons next to API Key and Secret Key in Key Management, then add the account number the key is for.',
    },
    desktopOnly: false,
    mobilePath: null,
    navPath: ['Personal Area', 'Key Management', 'Create key'], // UNVERIFIED labels
    suggestsKeyName: true,
    createSteps: [
      { title: 'Personal Area → Key Management', body: 'Log in at my.exness.com and open Key Management. Only accounts on the Exness platform can have a key — MT4 and MT5 accounts cannot.' },
      { title: 'Create a trading key for your account', body: 'Pick the Exness platform account you trade on. Choose a trading key, not an Info key — an Info key can only read, so the kill switch could not close anything.' },
      { title: 'Allow our IP', body: 'Add our IP to the key’s allowed IPs. Exness refuses calls from any address that is not on the list.' },
      { title: 'Copy the API Key and Secret Key', body: 'Use the copy button next to each one. Copy the Secret Key before you leave the screen — Exness may not show it again.' },
      { title: 'Paste them here with your account number', body: 'Paste both into TradeGuardX and add the number of the account the key is for. We check the key can trade the moment you connect it.' },
    ],
    /** Tax centre is for Indian venues; Exness is not part of it. */
    taxCentre: false,
    // No BETA badge: the owner wants Exness listed quietly as a venue to connect,
    // with no banner or label. Still unproven with a real key — watch the logs.
    beta: false,
  },
};

/** exchange slug → venue copy; null for non-exchange (prop-firm) accounts. */
export function venueFor(exchangeSlug) {
  if (!exchangeSlug) return null;
  if (exchangeSlug.startsWith('delta')) return VENUES.delta;
  if (exchangeSlug.startsWith('coindcx')) return VENUES.coindcx;
  if (exchangeSlug.startsWith('shark')) return VENUES.shark;
  if (exchangeSlug.startsWith('blofin')) return VENUES.blofin;
  if (exchangeSlug.startsWith('exness')) return VENUES.exness;
  return null;
}

/**
 * Whether the Tax centre covers this account. Only a venue that says
 * `taxCentre: false` is excluded; non-exchange accounts keep it (legacy).
 */
export function hasTaxCentre(exchangeSlug) {
  const v = venueFor(exchangeSlug);
  return v ? v.taxCentre !== false : true;
}

/** True when the venue's key carries a passphrase the connect form must ask for. */
export function needsPassphrase(exchangeSlug) {
  return Boolean(venueFor(exchangeSlug)?.hasPassphrase);
}

/**
 * The secret box, described. Every venue before Exness had a one-line "API
 * secret"; Exness's is a multi-line private key. Defaults keep the others'
 * labels exactly as they were.
 */
export function secretFieldFor(venue) {
  return {
    label: venue?.secretLabel ?? 'API secret',
    placeholder: venue?.secretPlaceholder ?? null,
    multiline: Boolean(venue?.secretMultiline),
  };
}

/** Inputs the connect form asks for beyond key, secret and passphrase. */
export function extraFieldsFor(exchangeSlug) {
  return venueFor(exchangeSlug)?.extraFields ?? [];
}

/** True when a venue's extra field holds an acceptable value (or may be left empty). */
export function extraFieldValid(field, value) {
  const s = String(value ?? '').trim();
  if (!s) return !field.required;
  return field.pattern ? field.pattern.test(s) : true;
}

/** Every extra field the venue asks for is filled (if required) and well-formed. */
export function extraFieldsReady(venue, values) {
  return (venue?.extraFields ?? []).every((f) => extraFieldValid(f, values?.[f.name]));
}

/**
 * The extra values to send: trimmed, empties dropped, and only names this
 * venue declares — so nothing typed for one venue can ride along to another.
 */
export function extraFieldsPayload(exchangeSlug, values) {
  const out = {};
  for (const f of extraFieldsFor(exchangeSlug)) {
    const s = String(values?.[f.name] ?? '').trim();
    if (s) out[f.name] = s;
  }
  return out;
}

/** False for a venue whose secret must not be split out of a pasted key (Exness's PEM). */
export function splitsPastedPair(venue) {
  return venue?.pasteSplit !== false;
}

/** True while a venue has not been proven end to end with a real key. */
export function isBetaVenue(exchangeSlug) {
  return Boolean(venueFor(exchangeSlug)?.beta);
}

/** Our egress IP is one address for every venue — the NAT in front of the engine. */
export const ENGINE_EGRESS_IP = DELTA_EGRESS_IP;
