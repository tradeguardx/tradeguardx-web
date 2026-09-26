import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * Head-term landing page: "crypto kill switch", "crypto killswitch app",
 * "best crypto kill switch India".
 *
 * Written to actually answer the query rather than to repeat the phrase — a thin
 * page built around a keyword is a doorway page, and Google demotes those. The
 * job here is to be the page that genuinely explains what a crypto kill switch
 * is, including the parts that don't flatter us (what it can't do, when you
 * don't need one). Both spellings appear because people search both.
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
    a: 'Delta Exchange (India or Global) and CoinDCX futures, both live today, with one subscription covering both. Enforcement runs server-side through the exchange API rather than in your browser, so it applies whether you trade from the web, the mobile app, or a third-party client. Bybit and Bitget are next. Spot is not covered on any venue — futures only.',
  },
  {
    q: 'Does a kill switch need access to my funds?',
    a: 'No, and you should refuse any tool that asks. We use an API key scoped to read and trade only. That is enough to cancel an order and close a position, and it is nowhere near enough to move a rupee — the key cannot withdraw or transfer. Your funds never leave your own exchange wallet. None of the venues we support even offer a withdrawal permission on an API key.',
  },
  {
    q: 'Can I turn the kill switch off when I want to keep trading?',
    a: "You can change any rule, but loosening one goes through a cooling-off window — you can't raise your loss limit in the middle of a bad session. Tightening applies instantly. A kill switch you can disable in the moment you most want to disable it isn't a kill switch.",
  },
  {
    q: 'Does it work if I trade from the exchange mobile app?',
    a: "Yes, and that is the main reason it runs on our servers rather than in your browser. We hold a live connection to your account, so it does not matter where the order came from — the exchange website, the phone app, or a bot you wrote yourself. If the trade reaches your account, we see it in roughly 120 milliseconds and act if it breaks a rule.",
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
      'Seven of them, and every one is on every plan — the paid tier buys more accounts and more history, never more protection.',
      'Four will close your positions and lock the account: a daily loss cap, a maximum trade count, a daily profit target (so a good day survives contact with a bad afternoon), and a losing-streak cooldown that escalates — three losses in a row buys you three hours off, five buys twelve.',
      'Risk per trade works differently: it closes the single position whose stop sits too far away, and leaves everything else alone. Two more only warn you — one when a position has been sitting open without a stop attached, one when the account is deep in drawdown. We would rather say that plainly than let you believe something is watching when it is only talking.',
    ],
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
      'TradeGuardX holds a live connection to your exchange from our own servers. Screen off, phone in your pocket, laptop shut in a bag — a breach is typically detected and acted on inside about 120 milliseconds. If you open a position while a lock is running, it gets closed on sight, and it does not count toward your trade limit or your losing streak.',
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
    p: [
      'Two, both live today, both futures.',
      'Delta Exchange came first — India or Global, whichever account you hold. It has the most granular and stable perpetuals API in the country, which matters when your protection is only as fast as the data feed behind it.',
      'CoinDCX futures went live in September 2026. Their INR and USDT margin modes are the same instruments with a different wallet posting margin, so one key covers both and your rules apply across the pair. Spot is not covered on either venue: we read futures, enforce futures, and say so rather than letting you assume.',
      'One subscription covers every exchange you connect. Bybit and Bitget are next.',
    ],
  },
  {
    h: 'When you don\'t need this',
    p: [
      "If you stop at your daily limit without help, you do not need us and we would rather say so than take the money. This exists for one specific gap — between what a trader writes down on a calm Sunday and what they actually do on a Wednesday afternoon, three trades down, convinced the fourth is the one.",
    ],
  },
];

export default function CryptoKillSwitchPage() {
  useSEO({
    title: 'Crypto Kill Switch for Indian Traders',
    description:
      'What a crypto kill switch is, how server-side enforcement differs from alerts, and what to look for in a killswitch app. Built for Delta Exchange and CoinDCX traders in India.',
    url: 'https://tradeguardx.com/crypto-kill-switch',
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
        <header className="mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Crypto kill switch</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            The crypto kill switch for Indian traders
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            A kill switch caps the day, not the trade. Set your daily loss limit once — TradeGuardX
            cancels your orders, closes your positions, and locks new entries the moment you cross it.
            Enforced from our servers on Delta Exchange and CoinDCX, whether your screen is on or not.
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
