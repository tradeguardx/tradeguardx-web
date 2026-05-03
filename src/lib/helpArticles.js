/**
 * Help-center article content. Each article renders inside a single /help
 * page with sidebar navigation. Edit copy here; layout is in HelpPage.jsx.
 *
 * Article shape:
 *   { slug, title, intro, sections: [{ heading, body, list?, note? }] }
 */
export const HELP_ARTICLES = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    intro:
      "Get TradeGuardX running on your trading account in under 5 minutes. The setup has three steps: create an account, install the Chrome extension, and pair it to your broker.",
    sections: [
      {
        heading: '1. Create your account',
        body:
          "Sign up at tradeguardx.com/signup. We support email + password and Google sign-in. No credit card needed for the Free plan, which gives you core protection on one trading account.",
      },
      {
        heading: '2. Install the Chrome extension',
        body:
          "TradeGuardX runs as a Chrome / Brave / Edge extension that watches your broker tab and enforces your rules at the click. Install it from the Chrome Web Store — there's a direct link on your dashboard's Install Extension page.",
        note:
          "The extension only activates on broker domains you've explicitly paired. On other websites it stays dormant.",
      },
      {
        heading: '3. Add a trading account',
        body:
          "From your dashboard, go to Trading Accounts → Add Account. Pick your prop firm or broker, name the account, and set your starting balance. This is the account TradeGuardX will protect.",
      },
      {
        heading: '4. Pair the extension',
        body:
          "On the same page, click 'Pair Extension'. We give you a short code. Open the extension popup on your broker tab, enter the code, and pairing is complete. See the Pairing article for detail.",
      },
      {
        heading: '5. Set your first rule',
        body:
          "Go to Rules Terminal in the dashboard. Pick a template (we recommend Daily Loss Limit as your first rule), set the threshold, save. The extension picks it up immediately. See Setting Your First Rule for a walkthrough.",
      },
      {
        heading: 'What happens when a rule fires?',
        body:
          "When you try to place a trade that would breach a rule, the extension blocks the broker's Buy/Sell button at the click. Not a popup, not a warning — the trade simply does not go through. The block persists until you reset for the next session (typically next trading day).",
      },
    ],
  },
  {
    slug: 'pairing',
    title: 'Pairing your extension',
    intro:
      "Pairing connects the Chrome extension to a specific trading account so it knows which broker to monitor and which rules to enforce. You'll do this once per trading account.",
    sections: [
      {
        heading: 'Why pairing exists',
        body:
          "The extension never has your broker login. Instead, you tell it which trading account it's protecting via a short-lived pairing code. After pairing, the extension stores a session token and uses it to authenticate API calls — no broker password required.",
      },
      {
        heading: 'How to pair',
        list: [
          { bold: 'Step 1:', text: "In the web dashboard, go to Trading Accounts → click your account → 'Pair Extension'." },
          { bold: 'Step 2:', text: "We generate a 6-character pairing code valid for 5 minutes." },
          { bold: 'Step 3:', text: "Open your broker's tab in the same browser." },
          { bold: 'Step 4:', text: "Click the TradeGuardX extension icon in your toolbar to open the popup." },
          { bold: 'Step 5:', text: "Enter the pairing code. The popup will show 'Paired' with the broker hostname." },
        ],
      },
      {
        heading: 'Pairing code expired?',
        body:
          "Codes expire after 5 minutes for security. Just generate a new one from the dashboard and try again. Old codes can't be reused.",
      },
      {
        heading: 'Re-pairing',
        body:
          "If you cleared your browser data or moved to a new computer, you'll need to re-pair. Generate a fresh code from the dashboard. The old session token is automatically invalidated when you pair again — only one active session per trading account.",
      },
      {
        heading: 'Pairing multiple accounts',
        body:
          "On Pro and Pro+ plans, you can pair multiple trading accounts (one per broker tab). Each tab needs its own pairing because the extension knows which rules apply only when paired to that specific account.",
      },
      {
        heading: 'Common pairing problems',
        list: [
          { bold: "Extension popup says 'Not on a supported broker':", text: "You're on a tab the extension doesn't know about. Switch to your broker's trading page." },
          { bold: "Pairing code 'Invalid or expired':", text: "Generate a new code (most likely cause). If the new code also fails, sign out and back in." },
          { bold: "Pairs but rules don't fire:", text: "Open the extension popup — does it show your account name? If not, re-pair. If yes, check the Rules Terminal — your rules may not be saved/enabled." },
        ],
      },
    ],
  },
  {
    slug: 'setting-your-first-rule',
    title: 'Setting your first rule',
    intro:
      "Rules are how TradeGuardX actually protects you. Without rules, the extension just watches — it doesn't block anything. We recommend Daily Loss Limit as your first rule because it stops the most common account-killer: revenge trading after a bad morning.",
    sections: [
      {
        heading: 'Open the Rules Terminal',
        body:
          "From your dashboard sidebar, click Rules. You'll see a list of rule templates available on your plan. Free has core templates; Pro adds advanced rules like risk-per-trade and max drawdown.",
      },
      {
        heading: "Pick the Daily Loss Limit template",
        body:
          "Click 'Daily Loss Limit'. The form expands. Set:",
        list: [
          { bold: 'Account size:', text: "Auto-filled from the trading account you selected. This anchors the percentage calculations." },
          { bold: 'Max daily loss:', text: "The dollar amount or percentage you'll never lose in a single day. A common starting point is 2% of your account size — small enough to come back from, large enough not to trigger on normal volatility." },
          { bold: 'Reset time:', text: "When does 'a new day' start for the rule? Default is broker midnight. Set it to your local trading session start if different." },
        ],
      },
      {
        heading: 'Save the rule',
        body:
          "Click Save. Your rule is immediately active — the extension sees it within seconds and starts enforcing on every Buy/Sell click in the paired broker tab.",
      },
      {
        heading: 'Test it (recommended)',
        body:
          "On a paper/demo broker account, simulate a loss until you cross the threshold. Try to enter a new trade — the extension should block the click with a brief overlay explaining why. If it doesn't, your pairing or rule config has an issue. Better to find this on a demo than during a live session.",
      },
      {
        heading: 'Add more rules',
        body:
          "Once Daily Loss is in place, common next rules are:",
        list: [
          { bold: 'Risk Per Trade:', text: "Limits the maximum risk per single trade (e.g., 0.5% of account). Stops oversized revenge bets." },
          { bold: 'Max Drawdown:', text: "Hard stop if your equity falls X% below peak. Saves accounts during losing streaks." },
          { bold: 'Hedging Prevention:', text: "Blocks opening opposite positions on the same instrument — most prop firms ban this and you can fail the challenge instantly." },
          { bold: 'Max Trades Per Day:', text: "Caps your trade count. Reduces overtrading after a winning open." },
        ],
      },
      {
        heading: 'Pausing or removing a rule',
        body:
          "You can disable any rule from the Rules Terminal without deleting it (toggle off). To remove permanently, delete the rule. Caution: rules are how TradeGuardX protects you — disabling one removes that protection until you re-enable.",
      },
    ],
  },
  {
    slug: 'common-issues',
    title: 'Common issues',
    intro:
      "Most issues come from one of three places: the extension isn't running, the pairing has lapsed, or the broker page didn't load the way the extension expected. Here's how to diagnose each.",
    sections: [
      {
        heading: 'Extension icon is grey or missing',
        body:
          "The extension is installed but not active on the current tab. This is normal on non-broker tabs — the extension only loads on supported broker domains. If you're ON your broker and it's still grey:",
        list: [
          { text: "Refresh the broker tab. Extensions sometimes need a fresh page load to attach." },
          { text: "Check the Chrome extensions page (chrome://extensions) — is TradeGuardX enabled?" },
          { text: "Check that you're on the broker domain we support. The full list is in the Install Extension page." },
        ],
      },
      {
        heading: 'Rules are not blocking trades',
        body:
          "Three things to check, in order:",
        list: [
          { bold: 'Is the extension paired?', text: "Click the extension icon. The popup should show 'Paired with [account name]'. If not, re-pair from the dashboard." },
          { bold: 'Is the rule saved AND enabled?', text: "In Rules Terminal, the rule should show as enabled (toggle on). A saved-but-disabled rule does nothing." },
          { bold: 'Does the rule actually apply?', text: "Some rules have conditions (e.g., 'only after 9:30 AM' or 'only when daily P&L is below -X%'). Re-read your rule config to make sure the condition is met." },
        ],
      },
      {
        heading: 'Broker not recognized',
        body:
          "We support a fixed list of brokers and prop firms. If yours isn't in the dropdown when adding an account, it's not supported yet. Email support@tradeguardx.com with the broker name and trading platform — popular requests get added.",
      },
      {
        heading: 'Subscription past due',
        body:
          "If your card declined, your subscription becomes past_due in our system and your features auto-revert to Free. Open Account → Billing → 'Update payment method' and Dodo will guide you through entering a new card. Once payment retries, your Pro features come back.",
      },
      {
        heading: "Trade didn't appear in journal",
        body:
          "The extension syncs trades when you open and close them in the broker. If a trade is missing:",
        list: [
          { text: "Make sure the trade actually closed in the broker (still open trades show in your positions, not journal)." },
          { text: "Refresh the broker tab — sometimes the extension needs to re-attach to detect the close event." },
          { text: "Wait 30-60 seconds after the close — sync isn't always instant." },
          { text: "If still missing after a minute, contact support with the trade timestamp." },
        ],
      },
      {
        heading: 'Browser slowdowns',
        body:
          "TradeGuardX is designed to be lightweight — DOM observation runs only on the active broker tab. If you notice slowdown, check chrome://extensions and disable other heavy extensions to isolate. If TradeGuardX itself is the cause (we've never seen this in testing), email support and we'll investigate.",
      },
      {
        heading: 'Reset everything',
        body:
          "If nothing else works, fully reset by signing out, removing the extension, removing the trading account from your dashboard, and starting from scratch. Your trade history stays in our database — only the local extension state and pairing get cleared.",
      },
    ],
  },
  {
    slug: 'account-questions',
    title: 'Account questions',
    intro:
      "How to manage your TradeGuardX account: changing email, password, plan, or canceling.",
    sections: [
      {
        heading: 'Changing your email',
        body:
          "Email changes go through Supabase (our auth provider). Email support@tradeguardx.com from your current account email with the new email you want, and we'll initiate the change. You'll need to verify the new email before it activates.",
      },
      {
        heading: 'Resetting your password',
        body:
          "Go to /login and click 'Forgot password'. We send a magic link to your registered email — click it, set a new password, and you're back in. The link expires in 1 hour.",
      },
      {
        heading: 'Switching plans',
        body:
          "Open Account → Billing → Change Plan. You'll be taken back to Pricing. Pick your new plan, complete checkout via Dodo, and your account upgrades immediately. You're charged the new plan's price prorated for the rest of the current billing period.",
      },
      {
        heading: 'Canceling your subscription',
        body:
          "Open Account → Billing → Manage or Cancel Subscription. You'll be taken to Dodo's customer portal where you can cancel with one click. Your Pro features stay active until the end of your current billing period — no refund for the unused portion, but no early cutoff either.",
      },
      {
        heading: 'Refund policy',
        body:
          "We offer a 7-day money-back guarantee on the first paid month of any subscription. After that, all sales are final but you can cancel anytime to stop future charges. See our Refund Policy page for full details.",
      },
      {
        heading: 'Deleting your account',
        body:
          "Email support@tradeguardx.com from your account email and request account deletion. We'll permanently remove your profile, trading accounts, rules, trade history, and authentication record within 30 days. This is irreversible. You can also export your trade history first if you want to keep a copy.",
      },
      {
        heading: 'Multiple trading accounts',
        body:
          "Pro supports up to 5 trading accounts. Pro+ is unlimited. Free is limited to 1. Each trading account has its own rules and pairing — they're independent so you can run different rule sets on different brokers or strategies.",
      },
      {
        heading: "I haven't received a verification email",
        body:
          "Check your spam folder first. If still missing after 5 minutes, request a new verification email from the login page. Some email providers (corporate Outlook especially) aggressively filter unfamiliar senders — adding noreply@tradeguardx.com to your contacts helps.",
      },
    ],
  },
];
