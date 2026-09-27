import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { ENFORCED_RULES, VENUE_PAGE_LIST } from '../lib/venueSeo';
import { ogImageFor } from '../lib/publicRoutes';

/**
 * Head-term landing page: "crypto kill switch", "crypto killswitch app",
 * "best crypto kill switch India".
 *
 * Written to actually answer the query rather than to repeat the phrase — a thin
 * page built around a keyword is a doorway page, and Google demotes those. The
 * job here is to be the page that genuinely explains what a crypto kill switch
 * is, including the parts that don't flatter us (what it can't do, when you
 * don't need one). Both spellings appear because people search both.
 *
 * IT IS ALSO THE HUB for /exchanges/<venue>. This page stays exactly where it
 * is — it is indexed, and moving it would spend rankings for a tidier path —
 * but it stops competing with its own children. It no longer argues the case for
 * any single venue; it explains the category and hands the venue question to the
 * venue page. Two pages optimised for "coindcx kill switch" would split the
 * internal links between them and neither would win.
 */

const FAQ = [
  {
    q: 'What is a crypto kill switch?',
    a: "A crypto kill switch is an automated rule that stops you trading once you cross a limit you set in advance — a daily loss cap, a maximum number of trades, a position size. When the limit is hit, it cancels your open orders, closes your positions, and blocks new entries until a cooldown expires. The point is that the decision is made while you're calm and enforced when you aren't.",
  },
  {
    q: 'Is a killswitch different from a stop loss?',
    a: "Yes, and the difference matters. A stop loss protects a single trade; a kill switch protects the account. A stop loss also does nothing about the behaviour that actually blows accounts — re-entering immediately after a loss, doubling size to win it back, trading twelve times on a day you planned to trade three. A kill switch caps the day, not the trade.",
  },
  {
    q: 'Which exchanges does a crypto kill switch work with in India?',
    a: 'Three, all live today: Delta Exchange (India or Global), CoinDCX futures, and Shark Exchange. One subscription covers every exchange you connect. Enforcement runs server-side through the exchange API rather than in your browser, so it applies whether you trade from the web, the mobile app, or a third-party client. Spot is not covered on any exchange — futures only.',
  },
  {
    q: 'Does a kill switch need access to my funds?',
    a: 'No, and you should refuse any tool that asks. We use an API key scoped to read and trade only. That is enough to cancel an order and close a position, and it is nowhere near enough to move a rupee — the key cannot withdraw or transfer. Your funds never leave your own exchange wallet. None of the exchanges we support even offer a withdrawal permission on an API key.',
  },
  {
    q: 'Can I turn the kill switch off when I want to keep trading?',
    a: "You can change any rule, but loosening one goes through a cooling-off window — you can't raise your loss limit in the middle of a bad session. Tightening applies instantly. A kill switch you can disable in the moment you most want to disable it isn't a kill switch.",
  },
  {
    q: 'Does it work if I trade from the exchange mobile app?',
    a: "Yes, and that is the main reason it runs on our servers rather than in your browser. We hold a live connection to your account, so it does not matter where the order came from — the exchange website, the phone app, or a bot you wrote yourself. The connection is event-driven rather than polled: when a trade reaches your account we are told about it, and a breach is checked and acted on within seconds. How fast exactly depends on what that exchange's own feed publishes, which is why each exchange page states its own position instead of one number standing in for all three.",
  },
  {
    q: 'What happens to my open positions when it fires?',
    a: "They get market-closed, then checked. We cancel every resting order first, close each position, and then verify you are actually flat rather than assuming the instruction landed — if the exchange is briefly slow or a close silently fails, it retries. After that the account is locked, and anything you open during the lock is closed on sight without counting toward your trade limit or losing streak.",
  },
  {
    q: 'Can I lock myself out before a rule fires?',
    a: "Yes. Pick three, six or twelve hours and confirm, and the account is shut to you for that window. There is no cancel button — it does not exist, not in settings and not behind a confirmation. You can extend it, never shorten it. You do have to be flat to arm it, so it is a decision between trades rather than mid-position.",
  },
  {
    q: 'Do I need a kill switch if I already have discipline?',
    a: "Probably not, and that's an honest answer. If you consistently stop at your daily limit without help, this is a tool you don't need. It's built for the specific gap between what traders plan on a calm morning and what they do at 2pm after three red trades.",
  },
];

/**
 * How the three exchanges actually differ, side by side.
 *
 * Only a page that covers all of them can answer "which one should I use",
 * so this is additive to the venue pages rather than a second copy of them.
 * Every value here is carried from venues.js, where it was checked against
 * the exchange's own key-creation form.
 */
const BROKER_ROWS = [
  { k: 'Status', delta: 'Live', coindcx: 'Live', shark: 'Live' },
  { k: 'What you trade', delta: 'Perpetual futures', coindcx: 'Perpetual futures', shark: 'Perpetual futures' },
  { k: 'Priced / settled in', delta: 'USD', coindcx: 'USDT (INR wallet converts)', shark: 'INR' },
  { k: 'Your limits are set in', delta: 'Dollars', coindcx: 'Dollars', shark: 'Rupees' },
  { k: 'Permission the key needs', delta: '“Trading”', coindcx: 'None to tick — there is no box', shark: '“Trade Futures”' },
  { k: 'Key is read-only by default', delta: 'No', coindcx: 'No', shark: 'Yes — you must change it' },
  { k: 'Can you create the key on a phone?', delta: 'Yes (Algo Hub → APIs)', coindcx: 'No — desktop only', shark: 'No — desktop only' },
  { k: 'IP whitelist', delta: 'Required', coindcx: 'Optional, but we bind it', shark: 'Supported, and we use it' },
  { k: 'Spot covered', delta: 'No', coindcx: 'No', shark: 'No' },
  { k: 'Tax centre', delta: 'Yes', coindcx: 'Yes', shark: 'Yes — exact, it settles in INR' },
];

const SECTIONS = [
  {
    h: 'What a crypto kill switch actually does',
    p: [
      "Most blown accounts don't die from one bad trade. They die from the one after it. You take a normal loss, you're annoyed, you re-enter within ninety seconds to get it back, that one fails too, so the third is double size. Nobody plans that sequence. It takes about forty minutes.",
      'A kill switch breaks the chain mechanically. You decide the limits on a calm morning — how much you can lose in a day, how many trades you get, how much risk per position, how long you sit out after a losing streak. When you cross one, nothing is negotiated: your open orders are cancelled, your positions are market-closed, and new entries are shut off until the clock says otherwise.',
      "The whole design rests on one idea. The version of you who sets the limit and the version who wants to override it are not the same person, and the first one should win.",
    ],
  },
  {
    h: 'The rules you can actually set',
    p: [
      'Seven of them, and every one is on every plan — the paid tier buys more accounts and more history, never more protection. They behave identically on all three exchanges, because it is one engine behind them.',
      'The column that matters is the last one. Three of these seven never close anything. A trader who believes Max Drawdown is a floor has bought a floor that does not exist, so it says so here rather than in the small print.',
    ],
    rulesTable: true,
  },
  {
    h: 'The lockout you pull yourself',
    p: [
      "Some days you can feel it coming before any rule has fired. There's a red button for that. Pick three, six or twelve hours, confirm, and the account is shut to you for that long.",
      "There is no cancel. Not hidden in settings, not behind a confirmation — it does not exist. The clock is the only thing that lifts it, and you can extend it but never shorten it, because a lock you can shorten by re-arming for one hour was never a lock. You have to be flat to arm it, so it's a decision you make between trades rather than in the middle of one.",
    ],
  },
  {
    h: 'Why server-side enforcement matters',
    p: [
      "A browser extension can only see the tab it's in, and only while that tab is open. Shut the laptop, pick up your phone, place an order through a third-party client, and it sees nothing at all. It is a reminder wearing the costume of a safety system.",
      'TradeGuardX holds a live connection to your exchange from our own servers. Screen off, phone in your pocket, laptop shut in a bag — the feed pushes the change to us rather than us asking for it, and the breach is checked and acted on within seconds. The exact speed belongs to the exchange, not to us: it depends on what that exchange publishes and how quickly, which is why each exchange page states its own position rather than one number standing in for all of them. If you open a position while a lock is running, it gets closed on sight, and it does not count toward your trade limit or your losing streak.',
    ],
  },
  {
    h: 'You cannot loosen a rule in the moment you want to',
    p: [
      'This is the part people argue with, and it is the part that does the work.',
      'Tightening a limit applies immediately. Loosening one — raising your loss cap, allowing more trades, shortening a cooldown, switching a rule off — is staged for twenty-four hours. You can still make the change; you just cannot make it at 2pm on the day you are down and certain the next one comes back. While a lock is active your API key is frozen too, so pulling the key is not the exit either.',
    ],
  },
  {
    h: 'What it can\'t do, plainly',
    p: [
      "We cannot stop an order from reaching the exchange. No exchange in the world hands a third party that switch, and anyone who tells you otherwise is selling something. What we do is close the position immediately after it opens and then verify you are actually flat.",
      'That has a real cost worth knowing: a forced close can book a small loss on fees alone, and that loss counts toward your losing-streak rule. One rule tripping another is a thing that happens.',
      'And on a retail exchange this is a cooperative tool, not a cage. You own your exchange login and you can always revoke the key. It is built for the trader who wants to be protected from themselves, not for one trying to beat it.',
    ],
  },
  {
    h: 'What you get besides the switch',
    p: [
      'Breach alerts arrive on Telegram or email within seconds, because the engine acting while you are away is only useful if you find out it did.',
      'Every trade lands in a journal with the rules that fired on it, so a bad week has an actual record instead of a feeling. And there is a tax centre that rebuilds your Indian financial-year result from raw exchange fills — F&O treated as business income, VDA under 115BBH, kept separate because they are different regimes and adding them produces a number that means nothing. It exports the working for your CA.',
    ],
  },
  {
    h: 'Which Indian exchanges we support',
    // Deliberately short, and deliberately not a pitch for any one exchange.
    // The per-exchange argument lives at /exchanges/<venue>, and repeating it
    // here would put two of our own pages in front of the same query.
    p: [
      'Three, all live today, all futures, and one subscription covers every one you connect.',
      'Delta Exchange came first, India or Global, whichever account you hold. It has the most granular and stable perpetuals API in the country, which matters more than it sounds: your protection is only ever as fast as the data feed behind it. It is also the one exchange of the three where you can create the API key on your phone.',
      'CoinDCX futures followed. Its INR and USDT margin modes are one venue and two wallets, not two exchanges — the same instruments priced in USDT either way — so one key covers both and your rules apply across the pair. Its key form has no permission checkbox at all, which confuses people looking for one.',
      'Shark Exchange is the newest, and it settles in INR, so your limits are rupee amounts that reconcile to the paisa against Shark\'s own statement rather than surviving a conversion. It is also the one that most often goes wrong at setup: Shark issues every key Read-only, and the permission that lets anything be closed is edited after the secret is already on screen, which is exactly when people think they are finished.',
      'What does not differ is the guard. It is one engine, and the rules behave identically wherever your key points. What differs is the exchange underneath — and that is what the table shows.',
    ],
    brokerTable: true,
    venueLinks: true,
  },
  {
    h: 'When you don\'t need this',
    p: [
      "If you stop at your daily limit without help, you do not need us and we would rather say so than take the money. This exists for one specific gap — between what a trader writes down on a calm Sunday and what they actually do on a Wednesday afternoon, three trades down, convinced the fourth is the one.",
    ],
  },
];

/**
 * The links that make this page a hub rather than a competitor.
 *
 * Every venue we actually support. This page explains the category; each link
 * hands the venue question to the venue's own page rather than answering it
 * here, which is what stops the two competing for the same query.
 */
/**
 * The seven rules, with the honest column.
 *
 * Same ENFORCED_RULES the venue pages render, imported rather than retyped —
 * a second hand-written copy of this list is how a page ends up promising a
 * rule the engine does not have.
 */
const FIRES = {
  full: { label: 'Closes & locks', color: '#00d4aa', bg: 'rgba(0,212,170,0.12)', border: 'rgba(0,212,170,0.3)' },
  'one position': { label: 'Closes one position', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.28)' },
  'alert only': { label: 'Alert only', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
};

function RulesTable() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {ENFORCED_RULES.map((r, i) => {
        const f = FIRES[r.fires];
        return (
          <div
            key={r.name}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5"
            style={{
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              backgroundColor: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
            }}
          >
            <div className="sm:w-[185px] sm:shrink-0">
              <p className="text-[14px] font-bold text-white">{r.name}</p>
              <span
                className="mt-2 inline-block whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold"
                style={{ color: f.color, backgroundColor: f.bg, borderColor: f.border }}
              >
                {f.label}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-relaxed text-slate-300">{r.does}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{r.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The three exchanges side by side. Scrolls horizontally on a phone rather
 * than reflowing, because a comparison you cannot read across columns has
 * stopped being a comparison.
 */
function BrokerTable() {
  const head = ['', 'Delta Exchange', 'CoinDCX', 'Shark Exchange'];
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h || 'blank'}
                className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                style={{ color: h ? '#00d4aa' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                {h || '·'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BROKER_ROWS.map((r, i) => (
            <tr key={r.k} style={{ backgroundColor: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <th scope="row" className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {r.k}
              </th>
              {[r.delta, r.coindcx, r.shark].map((v, j) => (
                <td key={j} className="px-4 py-3 text-[13px] text-slate-400" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VenueLinks() {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {VENUE_PAGE_LIST.map((v) => (
        <li key={v.slug}>
          <Link
            to={`/exchanges/${v.slug}`}
            className="flex h-full flex-col rounded-xl border px-4 py-3.5 transition-colors hover:border-white/20"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-white">{v.longName}</span>
              {v.beta && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Beta</span>}
            </span>
            <span className="mt-1 text-[13px] leading-relaxed text-slate-400">{v.h1}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const HERO = ogImageFor('/crypto-kill-switch');

export default function CryptoKillSwitchPage() {
  useSEO({
    title: 'Crypto Kill Switch for Indian Traders',
    description:
      'What a crypto kill switch is, how server-side enforcement differs from alerts, and what to look for in a killswitch app. Built for Indian crypto futures traders.',
    url: 'https://tradeguardx.com/crypto-kill-switch',
    image: HERO,
    imageAlt: 'The crypto kill switch for Indian traders — TradeGuardX',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24">
        <header className={HERO ? 'mb-8' : 'mb-14'}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Crypto kill switch</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            The crypto kill switch for Indian traders
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            A kill switch caps the day, not the trade. Set your daily loss limit once — TradeGuardX
            cancels your orders, closes your positions, and locks new entries the moment you cross it.
            Enforced from our servers on Delta Exchange, CoinDCX and Shark Exchange, whether your
            screen is on or not.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
            >
              Try free for 7 days
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
            >
              See pricing
            </Link>
          </div>
        </header>

        {HERO && (
          <img
            src={HERO}
            alt="The crypto kill switch for Indian traders — TradeGuardX"
            width={1200}
            height={630}
            /* Eager: it sits directly under the H1, so lazy-loading it is a
               visible pop-in on every visit to the page most likely to be
               someone's first. */
            loading="eager"
            className="mb-14 w-full rounded-2xl border"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
          />
        )}

        <div className="space-y-12">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.h}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <h2 className="mb-3 font-display text-2xl font-bold text-white">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para.slice(0, 24)} className="mb-3 text-[15px] leading-relaxed text-slate-300">
                  {para}
                </p>
              ))}
              {s.rulesTable && <RulesTable />}
              {s.brokerTable && <BrokerTable />}
              {s.venueLinks && <VenueLinks />}
            </motion.section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-white">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border px-5 py-4"
                style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-100 marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal links — these pages already rank for long-tail queries and
            passing authority between them beats leaving each one isolated. */}
        <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="mb-4 font-display text-lg font-bold text-white">Read next</h2>
          <ul className="space-y-2.5 text-[15px]">
            <li>
              <Link to="/exchanges" className="text-accent hover:underline">
                Every exchange we support, and what each one can enforce
              </Link>
            </li>
            <li>
              <Link to="/help/kill-switch" className="text-accent hover:underline">
                How the kill switch works, step by step
              </Link>
            </li>
            <li>
              <Link to="/help/rules" className="text-accent hover:underline">
                Every rule you can set, and what each one prevents
              </Link>
            </li>
            <li>
              <Link to="/security" className="text-accent hover:underline">
                Security: how your API key is stored and scoped
              </Link>
            </li>
            <li>
              <Link to="/help/cooldowns" className="text-accent hover:underline">
                Cooldowns and why you can’t loosen a rule mid-session
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
