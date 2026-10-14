import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import { useSEO } from '../hooks/useSEO';
import { ogImageFor } from '../lib/publicRoutes';
import VenueMark from '../components/dashboard/VenueMark';

/**
 * /revenge-report — the free revenge report, for someone not signed in.
 *
 * "What does revenge trading actually cost you?" is a question traders ask
 * themselves and never answer, because nobody tallies the trades they took
 * angry. This page shows the shape of the answer (an EXAMPLE, labelled as
 * one), then the way to get their own: pick the exchange, sign in, connect a
 * key, and the report builds from their real trades.
 *
 * Public-page styling (fixed colours, like the other landing pages), not the
 * dashboard's theme tokens: a logged-out visitor has no preferences yet.
 *
 * No file upload yet — connecting the exchange is the only way in.
 */
const EXCHANGES = [
  { slug: 'delta_india', name: 'Delta Exchange', cur: 'USDT' },
  { slug: 'coindcx', name: 'CoinDCX', cur: 'USDT' },
  { slug: 'shark', name: 'Shark Exchange', cur: 'INR' },
];

// The example's figures, per currency. Illustrative, and the card says so.
const EXAMPLE = {
  USDT: { chase: '−1,646.43 USDT', rest: '+964.70 USDT' },
  INR: { chase: '−₹1,38,200', rest: '+₹81,000' },
};

const ANSWERS = [
  { q: 'How fast you trade again after a loss', a: 'Every loss, and how many minutes until your next trade.', eg: '9 of 45 losses → back in <5 min', tone: '#ff8a7a', art: 'gaps' },
  { q: 'Whether you size up to win it back', a: 'Your size right after a loss, against your own usual size on calm trades.', eg: '2.4× your usual size after a loss', tone: '#f8b26a', art: 'size' },
  { q: 'The coin you keep going back to', a: 'The losses you answered by jumping straight back into the same coin.', eg: 'SOLUSDT · 6 times in 30 min', tone: '#f8b26a', art: 'coin' },
  { q: 'Your worst hour and your worst day', a: 'When you lose the most, and the day trading after a loss made it all worse.', eg: '23:00–00:00 · costliest hour', tone: '#ff8a7a', art: 'hours' },
  { q: 'What revenge trades cost you', a: 'Money lost on trades taken in the heat of a loss, against everything else.', eg: '19% of all you lost', tone: '#ff8a7a', art: 'split' },
  { q: 'The rules that would stop it', a: 'A short plan picked from your own trades — the limits to set while you are calm.', eg: 'Close after 2 losses · daily limit', tone: '#3ae8c0', art: 'rules' },
];

const FAQ = [
  ['What is revenge trading?', 'Revenge trading is opening a new trade right after a loss to win the money back, instead of because your plan says so. The trade is usually bigger, faster and less thought-through than normal — and it tends to turn one loss into several.'],
  ['How do I know if I am revenge trading?', 'Look at what you do in the minutes after a loss. If you often open a new position within 15 minutes, trade a bigger size than usual, or jump straight back into the coin that just lost you money, those are revenge trades. The report counts each of these from your own history.'],
  ['How do I stop revenge trading?', 'Decide your limits while you are calm and make them hard to break: a daily loss limit, a maximum risk per trade, and a rule to stop for the day after two losses in a row. Willpower fails in the moment, so the limit has to hold without you — that is what a kill switch does.'],
  ['Is revenge trading the same as overtrading?', 'They overlap but are not the same. Overtrading is taking too many trades in general; revenge trading is the specific burst of trades that follows a loss. Most traders who overtrade do it on the days they are chasing a loss.'],
  ['Is the revenge report free?', 'Yes. Connect your exchange and the report is yours, with no payment and no card. The guard that enforces rules for you is a separate, paid feature with a free trial.'],
  ['Can TradeGuardX trade or withdraw with my key?', 'The report only reads your past trades. TradeGuardX never needs withdrawal permission — create your key without it and your funds cannot be moved with it.'],
  ['How far back does the report look?', 'The last month by default, and up to three months. If a month is too quiet to judge, it looks further back on its own.'],
  ['What counts as a revenge trade in the report?', 'A trade opened within 15 minutes of a loss that also sizes up, goes straight back into the same coin, or comes after two losses in a row.'],
  ['Which exchanges does it work with?', 'Delta Exchange (India and global), CoinDCX futures and Shark Exchange.'],
];

const PAGE_URL = 'https://tradeguardx.com/revenge-report';
/* Structured data: what the page is, where it sits, the free tool it offers
   and the questions it answers. The FAQ entries are the visible ones, word
   for word — Google ignores (or penalises) FAQ markup the page does not show. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: 'Revenge Trading Calculator — Free Revenge Trading Report',
      description: 'What revenge trading is, how to spot it, how to stop it — and a free report of what it cost you, from your own crypto futures trades.',
      inLanguage: 'en-IN',
      isPartOf: { '@id': 'https://tradeguardx.com/#website' },
      breadcrumb: { '@id': `${PAGE_URL}#breadcrumb` },
      about: { '@type': 'Thing', name: 'Revenge trading' },
      primaryImageOfPage: 'https://tradeguardx.com/og/revenge-report.png',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tradeguardx.com/' },
        { '@type': 'ListItem', position: 2, name: 'Revenge trading report', item: PAGE_URL },
      ],
    },
    {
      '@type': 'WebApplication',
      name: 'TradeGuardX Revenge Report',
      url: PAGE_URL,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: 'Reads your closed crypto futures trades on Delta Exchange, CoinDCX or Shark and shows every trade opened right after a loss, what revenge trading cost you, and a revenge score out of 100.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://tradeguardx.com/#organization' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
};

export default function RevengeLandingPage() {
  const { session, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [pick, setPick] = useState(EXCHANGES[0]);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(session?.access_token);
  const ex = EXAMPLE[pick.cur];

  useSEO({
    // ≤60 characters, the keyword first, the brand last.
    title: 'Revenge Trading Calculator: Free Report | TradeGuardX',
    rawTitle: true,
    // ≤155 characters.
    description:
      'What is revenge trading costing you? Free report for Delta Exchange, CoinDCX & Shark: every trade after a loss, what it cost, and how to stop it.',
    url: PAGE_URL,
    image: ogImageFor('/revenge-report'),
    imageAlt: 'What does revenge trading actually cost you? A free revenge trading report — TradeGuardX',
    jsonLd: JSON_LD,
  });

  const google = async () => {
    setBusy(true);
    try {
      // Straight into setup with their exchange chosen; the report is step 4.
      await loginWithGoogle(`/dashboard/setup?venue=${pick.slug}`);
    } catch (e) {
      toast.error('Could not open Google sign-in', e?.message || 'Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f', color: '#eef3fa' }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[560px] w-[760px] rounded-full blur-[150px]" style={{ background: 'radial-gradient(ellipse, rgba(255,110,90,0.13), transparent 65%)' }} />
        <div className="absolute -right-40 top-[420px] h-[520px] w-[720px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.07), transparent 65%)' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-24 md:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#ff9a87' }}>Revenge report · free</p>
            <h1 className="mt-4 font-display text-[40px] font-bold leading-[1.05] tracking-tight md:text-[64px]">
              What does revenge trading{' '}
              <span style={{ background: 'linear-gradient(90deg,#ff8a7a,#f8b26a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>actually cost you?</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed" style={{ color: '#a9b4c6' }}>
              See every trade you opened right after a loss, what it cost, and your revenge score out of 100 — read from your own exchange. Takes about 3 minutes.
            </p>

            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7d8aa0' }}>Pick your exchange</p>
            <div className="mt-3 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Your exchange">
              {EXCHANGES.map((e) => {
                const on = e.slug === pick.slug;
                return (
                  <button
                    key={e.slug}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPick(e)}
                    className="flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 transition-colors"
                    style={{ border: `1.5px solid ${on ? '#00d4aa' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(0,212,170,0.08)' : 'rgba(255,255,255,0.03)' }}
                  >
                    <VenueMark slug={e.slug} name={e.name} size={30} radius={15} />
                    <span className="text-[15px] font-semibold">{e.name}</span>
                    <span className="font-mono text-[10px] tracking-wider" style={{ color: '#7d8aa0' }}>{e.cur}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The example — labelled, so nobody reads it as their own. */}
          <div className="rounded-[22px] p-5" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(160deg, rgba(255,120,100,0.08), rgba(255,255,255,0.02) 45%, rgba(0,212,170,0.05))' }}>
            <div className="flex items-center gap-2.5">
              <VenueMark slug={pick.slug} name={pick.name} size={26} radius={13} />
              <span className="text-[15px] font-semibold">{pick.name}</span>
              <span className="flex-1" />
              <span className="rounded-md px-2 py-1 font-mono text-[10px] tracking-[0.14em]" style={{ background: 'rgba(255,255,255,0.07)', color: '#a9b4c6' }}>EXAMPLE</span>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-2xl p-4" style={{ border: '1px solid rgba(255,122,105,0.35)', background: 'rgba(255,122,105,0.08)' }}>
              <div className="flex-1">
                <div className="font-display text-[18px] font-bold">59 revenge trades</div>
                <div className="text-[13px]" style={{ color: '#ff9a87' }}>opened within 15 min of a loss</div>
              </div>
              <div className="font-display text-[20px] font-bold" style={{ color: '#ff8a7a' }}>{ex.chase}</div>
            </div>
            <div className="mt-3 flex items-center gap-4 rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1">
                <div className="font-display text-[18px] font-bold">186 other trades</div>
                <div className="text-[13px]" style={{ color: '#a9b4c6' }}>everything else</div>
              </div>
              <div className="font-display text-[20px] font-bold" style={{ color: '#3ae8c0' }}>{ex.rest}</div>
            </div>
            <div className="mt-3 flex items-center gap-4 rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <ScoreDial score={43} />
              <div>
                <div className="text-[15px] font-semibold">Revenge score · Revenge-prone</div>
                <div className="text-[13px]" style={{ color: '#a9b4c6' }}>out of 100, from six habits</div>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: '#7d8aa0' }}>
              Same trader, same month: the trades taken angry lost more than everything else made.
            </p>
          </div>
        </div>

        {/* ── Get yours ───────────────────────────────────────────────── */}
        <div className="mt-16 flex items-center gap-4">
          <h2 className="font-display text-[22px] font-bold">Get your free revenge trading report</h2>
          <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[22px] p-6" style={{ border: '1px solid rgba(0,212,170,0.3)', background: 'linear-gradient(160deg, rgba(0,212,170,0.07), rgba(255,255,255,0.02) 60%)' }}>
            <div className="flex items-center gap-3.5">
              <VenueMark slug={pick.slug} name={pick.name} size={46} radius={13} />
              <div className="flex-1">
                <div className="font-display text-[20px] font-bold">Connect {pick.name} for your report</div>
                <div className="text-[14px]" style={{ color: '#a9b4c6' }}>3 steps · about 3 minutes · free</div>
              </div>
            </div>

            <ol className="mt-5 grid gap-3">
              {[
                [true, `${pick.name} selected`],
                [false, signedIn ? 'Connect your key in our 2-minute setup' : 'Create your free account'],
                [false, signedIn ? 'Your revenge report builds itself' : 'Connect your key — the report builds itself'],
              ].map(([done, text], i) => (
                <li key={text} className="flex items-center gap-3 text-[15px]">
                  <span className="grid h-7 w-7 place-items-center rounded-lg text-[13px] font-bold" style={done ? { background: '#00d4aa', color: '#02241d' } : { background: 'rgba(0,212,170,0.1)', color: '#3ae8c0' }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ color: done ? '#eef3fa' : '#c9d2df' }}>{text}</span>
                </li>
              ))}
            </ol>

            {signedIn ? (
              <Link to="/dashboard/revenge" className="mt-6 flex min-h-[52px] items-center justify-center rounded-2xl text-[16px] font-bold" style={{ background: '#00d4aa', color: '#02241d' }}>
                Open my revenge report →
              </Link>
            ) : (
              <>
                <button type="button" onClick={google} disabled={busy} className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-white text-[16px] font-bold text-[#111] disabled:opacity-60">
                  <GoogleG /> {busy ? 'Opening Google…' : 'Continue with Google'}
                </button>
                <Link to="/signup" className="mt-3 block text-center text-[14px] font-semibold underline-offset-4 hover:underline" style={{ color: '#a9b4c6' }}>
                  or sign up with email
                </Link>
              </>
            )}
          </div>

          <div className="rounded-[22px] p-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="font-display text-[18px] font-bold">Your key, your trades, nothing else</div>
            <ul className="mt-4 grid gap-3.5 text-[14.5px] leading-relaxed" style={{ color: '#c9d2df' }}>
              {[
                'The report reads your closed trades. It never places, edits or closes an order.',
                'Keys are made without withdrawal permission — your funds cannot move.',
                'Your key is encrypted at rest and you can disconnect it any time.',
                'The report is yours alone. Share it only if you choose to.',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ae8c0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 flex-none" aria-hidden><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── What it answers ─────────────────────────────────────────── */}
        <div className="mt-24 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#ff9a87' }}>Inside the report</p>
          <h2 className="mt-3 font-display text-[30px] font-bold leading-tight md:text-[40px]">Six questions it answers, from your own trades</h2>
          <p className="mt-3 text-[16px] leading-relaxed" style={{ color: '#a9b4c6' }}>Not a lecture on discipline. Your numbers, the trades behind them, and what to change.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ANSWERS.map((x, i) => (
            <div key={x.q} className="rv-land-card group relative flex flex-col overflow-hidden rounded-[20px] p-5 transition-all duration-300 hover:-translate-y-1" style={{ border: '1px solid rgba(255,255,255,0.08)', background: `radial-gradient(ellipse 90% 60% at 100% 0%, ${x.tone}14, transparent 70%), rgba(255,255,255,0.025)` }}>
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${x.tone}, transparent)` }} />
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[11px] tracking-wider" style={{ color: x.tone }}>{String(i + 1).padStart(2, '0')}</span>
                <AnswerArt kind={x.art} tone={x.tone} />
              </div>
              <div className="mt-3 font-display text-[18px] font-bold leading-snug">{x.q}</div>
              <p className="mb-4 mt-2 text-[14px] leading-relaxed" style={{ color: '#a9b4c6' }}>{x.a}</p>
              <div className="mt-auto inline-flex items-center gap-2 self-start whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[11px]" style={{ background: `${x.tone}14`, border: `1px solid ${x.tone}40`, color: x.tone }}>
                <span className="opacity-70">e.g.</span> {x.eg}
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenge trading, explained ────────────────────────────────── */}
        <article className="mt-24 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#ff9a87' }}>Revenge trading, explained</p>
            <h2 className="mt-3 font-display text-[30px] font-bold leading-tight md:text-[40px]">What is revenge trading?</h2>
          </div>
          <div className="grid gap-8 text-[16px] leading-relaxed" style={{ color: '#c9d2df' }}>
            <p>
              <strong className="text-white">Revenge trading is opening a new trade right after a loss to win the money back</strong>, instead of because your plan says so. It is not a strategy; it is a reaction. The next trade comes faster, bigger and with less thought than usual — and in crypto futures, with leverage, one angry trade can undo a week of careful ones.
            </p>

            <div>
              <h3 className="font-display text-[22px] font-bold text-white">Signs you are revenge trading</h3>
              <ul className="mt-3 grid gap-2.5">
                {[
                  ['Back in within minutes.', 'You open a new position soon after a loss closes, often before you have looked at why it lost.'],
                  ['Bigger size.', 'The trade after a loss is larger than your usual one, to make the money back in one go.'],
                  ['The same coin again.', 'You jump straight back into the coin that just hurt you, as if it owes you.'],
                  ['Losses in a row, and you keep going.', 'Two losses and you keep trading instead of stopping for the day.'],
                  ['The worst days are the long days.', 'Your biggest losing days are the ones where you kept trading after the first loss.'],
                ].map(([b, t]) => (
                  <li key={b} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: '#ff8a7a' }} /><span><strong className="text-white">{b}</strong> {t}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-[22px] font-bold text-white">Why traders revenge trade</h3>
              <p className="mt-3">
                A loss hurts more than an equal win feels good, and the fastest way to make that feeling stop is to be back in the market. Anger, the urge to be right, and the round number you were up earlier all pull the same way. Knowing this does not help in the moment — that is why the fix has to be set up before the moment arrives.
              </p>
            </div>

            <div>
              <h3 className="font-display text-[22px] font-bold text-white">How to stop revenge trading</h3>
              <ol className="mt-3 grid gap-3">
                {[
                  ['Measure it first.', 'Find out how often you trade after a loss, how fast, at what size, and what it has cost you. That is what this free report is for.'],
                  ['Set a daily loss limit.', 'Pick the amount you can lose in a day and still trade calmly tomorrow. When it is hit, you are done.'],
                  ['Cap risk per trade.', 'A fixed maximum size means a loss cannot make the next trade bigger.'],
                  ['Stop after two losses in a row.', 'The trade after the second loss is the one most likely to be revenge.'],
                  ['Make the limits enforce themselves.', <>Rules you can override in the moment are suggestions. A <Link to="/crypto-kill-switch" className="font-semibold underline underline-offset-4" style={{ color: '#3ae8c0' }}>crypto kill switch</Link> closes positions and locks the account when a limit is hit, so the rule holds when you would not.</>],
                ].map(([b, t], i) => (
                  <li key={b} className="flex gap-3.5">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-lg font-mono text-[12px] font-bold" style={{ background: 'rgba(0,212,170,0.1)', color: '#3ae8c0' }}>{i + 1}</span>
                    <span><strong className="text-white">{b}</strong> {t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-display text-[22px] font-bold text-white">Revenge trading in crypto futures</h3>
              <p className="mt-3">
                Crypto futures make revenge trading more expensive than anywhere else: the market never closes, leverage turns a bigger size into a much bigger loss, and the next trade is one tap away at 2 a.m. The report is built for that — it reads perpetual futures on{' '}
                <Link to="/exchanges/delta" className="font-semibold underline underline-offset-4" style={{ color: '#3ae8c0' }}>Delta Exchange</Link>,{' '}
                <Link to="/exchanges/coindcx" className="font-semibold underline underline-offset-4" style={{ color: '#3ae8c0' }}>CoinDCX</Link> and{' '}
                <Link to="/exchanges/shark" className="font-semibold underline underline-offset-4" style={{ color: '#3ae8c0' }}>Shark Exchange</Link>, in their own currency.
              </p>
            </div>
          </div>
        </article>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <div className="mt-24 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#3ae8c0' }}>Before you connect</p>
            <h2 className="mt-3 font-display text-[30px] font-bold leading-tight md:text-[40px]">Questions traders ask</h2>
            <p className="mt-3 max-w-sm text-[16px] leading-relaxed" style={{ color: '#a9b4c6' }}>Straight answers about your key, your money and what the report reads.</p>
            <Link to="/support" className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold" style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#eef3fa' }}>
              Still unsure? Talk to us →
            </Link>
          </div>
          <div className="grid gap-3">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="rv-faq group rounded-2xl transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 text-[16px] font-semibold">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg font-mono text-[12px] transition-colors group-open:text-[#02241d]" style={{ border: '1px solid rgba(0,212,170,0.3)', color: '#3ae8c0' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{q}</span>
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full text-[18px] transition-transform duration-300 group-open:rotate-45" style={{ background: 'rgba(255,255,255,0.06)', color: '#a9b4c6' }}>+</span>
                </summary>
                <p className="px-5 pb-5 pl-[68px] text-[15px] leading-relaxed" style={{ color: '#a9b4c6' }}>{a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-[22px] p-8 text-center" style={{ border: '1px solid rgba(0,212,170,0.25)', background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0,212,170,0.1), transparent 70%)' }}>
          <div className="font-display text-[26px] font-bold md:text-[32px]">Find out what your last loss cost you next.</div>
          <p className="mx-auto mt-3 max-w-xl text-[15.5px]" style={{ color: '#a9b4c6' }}>Free, from your own trades on {pick.name}. About 3 minutes.</p>
          {signedIn ? (
            <Link to="/dashboard/revenge" className="mt-6 inline-flex min-h-[50px] items-center rounded-2xl px-7 text-[16px] font-bold" style={{ background: '#00d4aa', color: '#02241d' }}>Open my revenge report →</Link>
          ) : (
            <button type="button" onClick={google} disabled={busy} className="mt-6 inline-flex min-h-[50px] items-center gap-3 rounded-2xl bg-white px-7 text-[16px] font-bold text-[#111] disabled:opacity-60">
              <GoogleG /> Get my revenge report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* A small picture of each answer — drawn, not a stock icon. */
function AnswerArt({ kind, tone }) {
  const dim = 'rgba(255,255,255,0.14)';
  const box = { width: 92, height: 46 };
  if (kind === 'gaps') {
    const bars = [[9, tone], [6, tone], [5, dim], [8, dim], [17, '#3ae8c0']];
    return (
      <div className="flex items-end gap-1" style={box} aria-hidden>
        {bars.map(([v, c], i) => <span key={i} className="flex-1 rounded-sm" style={{ height: `${(v / 17) * 100}%`, background: c }} />)}
      </div>
    );
  }
  if (kind === 'size') {
    return (
      <div className="flex items-end justify-end gap-2" style={box} aria-hidden>
        <span className="w-5 rounded-sm" style={{ height: '36%', background: dim }} />
        <span className="w-5 rounded-sm" style={{ height: '100%', background: tone }} />
        <span className="self-start font-mono text-[11px] font-bold" style={{ color: tone }}>2.4×</span>
      </div>
    );
  }
  if (kind === 'coin') {
    return (
      <svg {...box} viewBox="0 0 92 46" aria-hidden>
        <path d="M30 23a16 16 0 1 1 32 0" fill="none" stroke={tone} strokeWidth="2" strokeDasharray="3 3" />
        <path d="M58 17l4 6 5-5" fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="30" cy="31" r="10" fill={`${tone}22`} stroke={tone} strokeWidth="1.6" />
        <text x="30" y="35" textAnchor="middle" fill={tone} style={{ font: "700 10px 'Space Grotesk', sans-serif" }}>S</text>
      </svg>
    );
  }
  if (kind === 'hours') {
    const h = [1, 2, 1, 3, 2, 1, 2, 4, 3, 6, 9, 5];
    return (
      <div className="grid grid-cols-6 gap-1" style={box} aria-hidden>
        {h.map((v, i) => <span key={i} className="rounded-sm" style={{ background: v >= 6 ? tone : `rgba(255,138,122,${0.08 + v * 0.06})` }} />)}
      </div>
    );
  }
  if (kind === 'split') {
    return (
      <div className="flex flex-col justify-center gap-1.5" style={box} aria-hidden>
        <div className="flex h-3 overflow-hidden rounded-full" style={{ background: dim }}><span style={{ width: '19%', background: tone }} /></div>
        <div className="flex justify-between font-mono text-[9.5px]" style={{ color: '#7d8aa0' }}><span style={{ color: tone }}>revenge</span><span>rest</span></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-center gap-1.5" style={box} aria-hidden>
      {[true, true, false].map((on, i) => (
        <span key={i} className="flex items-center justify-end gap-2">
          <span className="h-1.5 rounded-full" style={{ width: 36 - i * 8, background: dim }} />
          <span className="relative h-3.5 w-6 rounded-full" style={{ background: on ? tone : dim }}>
            <span className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white" style={{ left: on ? 12 : 2 }} />
          </span>
        </span>
      ))}
    </div>
  );
}

function ScoreDial({ score }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="66" height="66" viewBox="0 0 66 66" className="flex-none" role="img" aria-label={`Example score ${score} out of 100`}>
      <circle cx="33" cy="33" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx="33" cy="33" r={r} fill="none" stroke="#f8b26a" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 33 33)" />
      <text x="33" y="38" textAnchor="middle" fill="#eef3fa" style={{ font: "700 16px 'Space Grotesk', sans-serif" }}>{score}</text>
    </svg>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
