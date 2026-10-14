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
  ['How fast you trade again after a loss', 'Every loss, and how many minutes until your next trade. Most traders are shocked by the first bar.'],
  ['Whether you size up to win it back', 'Your size right after a loss, against your own usual size on calm trades.'],
  ['The coin you keep going back to', 'The losses you answered by jumping straight back into the same coin.'],
  ['Your worst hour and your worst day', 'When you lose the most, and the day trading after a loss made everything worse.'],
  ['What revenge trades cost you', 'The money lost on trades taken in the heat of a loss, against everything else.'],
  ['The rules that would stop it', 'A short plan picked from your own trades — the limits worth setting while you are calm.'],
];

const FAQ = [
  ['Is the revenge report free?', 'Yes. Connect your exchange and the report is yours, with no payment and no card. The guard that enforces rules for you is a separate, paid feature with a free trial.'],
  ['Can TradeGuardX trade or withdraw with my key?', 'The report only reads your past trades. Withdrawals are never possible: exchange keys for TradeGuardX are created without withdrawal permission, and we ask you to keep it that way.'],
  ['How far back does it look?', 'The last month by default, and up to three months. If a month is too quiet to judge, it looks further back on its own.'],
  ['What counts as a revenge trade?', 'A trade opened within 15 minutes of a loss that also sizes up, goes straight back into the same coin, or comes after two losses in a row.'],
  ['Which exchanges work?', 'Delta Exchange, CoinDCX futures and Shark Exchange today.'],
];

export default function RevengeLandingPage() {
  const { session, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [pick, setPick] = useState(EXCHANGES[0]);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(session?.access_token);
  const ex = EXAMPLE[pick.cur];

  useSEO({
    title: 'Revenge Trading Report — What Revenge Trades Cost You',
    description:
      'Free revenge trading report for crypto futures traders on Delta Exchange, CoinDCX and Shark. See every trade you opened right after a loss, what it cost, and your revenge score out of 100.',
    url: 'https://tradeguardx.com/revenge-report',
    image: ogImageFor('/revenge-report'),
    imageAlt: 'What does revenge trading actually cost you? — TradeGuardX',
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
          <h2 className="font-display text-[22px] font-bold">Get yours</h2>
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
        <h2 className="mt-20 font-display text-[28px] font-bold md:text-[34px]">Six questions it answers, from your own trades</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ANSWERS.map(([q, a], i) => (
            <div key={q} className="rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
              <span className="font-mono text-[11px] tracking-wider" style={{ color: '#ff9a87' }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="mt-2 font-display text-[17px] font-bold">{q}</div>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: '#a9b4c6' }}>{a}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <h2 className="mt-20 font-display text-[28px] font-bold md:text-[34px]">Questions</h2>
        <div className="mt-5 grid gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                {q}
                <span className="text-[20px] transition-transform group-open:rotate-45" style={{ color: '#7d8aa0' }}>+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: '#a9b4c6' }}>{a}</p>
            </details>
          ))}
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
