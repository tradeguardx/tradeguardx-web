import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { founderTelegramUrl, FOUNDER_TELEGRAM_CONFIGURED } from '../lib/founderContact';

/**
 * /about — who is behind TradeGuardX.
 *
 * Deliberately OUT of the SEO effort: it is listed in publicRoutes with
 * `sitemap: false`, so it is prerendered (anyone who opens or shares the link
 * gets a real page, not an empty shell) but never submitted. It exists to be
 * read by someone deciding whether to hand an API key to a stranger, not to
 * rank for anything.
 *
 * Nothing here is invented. The email and the founder's name are the ones
 * given; the product claims are the same ones the rest of the site makes and
 * the tests guard. The LinkedIn link renders only once a real URL is
 * configured — same pattern as the Telegram handle in founderContact.js —
 * because an About page with a dead link to a founder is worse than one with
 * no link at all.
 */

const FOUNDER_EMAIL = 'prashant.pathak@tradeguardx.com';

/**
 * The public profile URL. The `?isSelfProfile=true` parameter that LinkedIn
 * adds when you are looking at your own page is stripped — it is meaningless
 * to a visitor and tells them they are reading someone's own view of it.
 *
 * Overridable at build time, and the link hides itself if ever emptied, so
 * this page cannot ship a dead link to its own founder.
 */
const FOUNDER_LINKEDIN = (
  import.meta.env.VITE_FOUNDER_LINKEDIN ?? 'https://www.linkedin.com/in/prashant-pathak-b0088311a/'
).trim();

function Glyph({ d }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function AboutPage() {
  useSEO({
    title: 'About',
    description:
      'Who builds TradeGuardX, and how to reach them. Founded by Prashant Pathak — a server-side risk engine for Indian crypto futures traders.',
    url: 'https://tradeguardx.com/about',
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
        <header className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">About</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Who builds TradeGuardX
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            You are being asked to connect an API key to software written by someone you have never
            met. That is a real thing to ask, so here is who is asking.
          </p>
        </header>

        <div className="space-y-12">
          <motion.section initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
            <h2 className="mb-3 font-display text-2xl font-bold text-white">Prashant Pathak</h2>
            <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
              Founder of TradeGuardX. He writes the product, answers the support email, and is the
              person on the other end if something goes wrong with your account.
            </p>
            <p className="mb-5 text-[15px] leading-relaxed text-slate-300">
              There is no support queue between you and him. If you have a question about what the
              guard did, why a rule fired, or whether you should trust this with a live key, write
              directly — the address below is his, not a shared inbox.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${FOUNDER_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold text-slate-200 transition-colors hover:border-white/25"
                style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <Glyph d="M3 7l9 6 9-6M3 7v10h18V7H3z" />
                {FOUNDER_EMAIL}
              </a>

              {FOUNDER_LINKEDIN && (
                <a
                  href={FOUNDER_LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold text-slate-200 transition-colors hover:border-white/25"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <Glyph d="M6.5 8v9M6.5 5v.01M11 17v-5a2.5 2.5 0 015 0v5M11 17V8" />
                  LinkedIn
                </a>
              )}

              {FOUNDER_TELEGRAM_CONFIGURED && (
                <a
                  href={founderTelegramUrl('Hi Prashant — I have a question about TradeGuardX.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-colors hover:border-white/25"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)', color: '#5ec2ee' }}
                >
                  <Glyph d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15z" />
                  Telegram
                </a>
              )}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
            <h2 className="mb-3 font-display text-2xl font-bold text-white">What TradeGuardX is</h2>
            <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
              A risk-management layer that sits on top of your own exchange account. You set limits
              while you are calm — a daily loss cap, a trade count, a losing-streak cooldown — and a
              server-side engine enforces them when you are not. Break one and it cancels your open
              orders, closes your positions, and locks the account until a clock says otherwise.
            </p>
            <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
              It runs on our servers rather than in your browser, so it works whether you traded
              from the exchange website, its phone app, or a script. It is live on Delta Exchange,
              CoinDCX futures and Shark Exchange, and it keeps a tax centre that rebuilds your
              Indian financial-year result from raw exchange fills.
            </p>
            <p className="text-[15px] leading-relaxed text-slate-300">
              It never holds your money. The API key it uses can read your account and place trades
              and nothing else — none of the exchanges we support even offer a withdrawal permission
              on an API key, so there is no option to give away.
            </p>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
            <h2 className="mb-3 font-display text-2xl font-bold text-white">How we talk about it</h2>
            <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
              Three of the seven rules never close a position — they only alert you, and the product
              says so on the page where you switch them on rather than in a footnote. We cannot stop
              an order reaching the exchange; no exchange hands a third party that switch. What we do
              is close the position immediately afterwards and then verify you are actually flat.
            </p>
            <p className="text-[15px] leading-relaxed text-slate-300">
              If you already stop at your daily limit without help, you do not need this. That is a
              strange thing for a company to write on its own About page, and it is the whole reason
              the rest of it can be believed.
            </p>
          </motion.section>
        </div>

        <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="mb-4 font-display text-lg font-bold text-white">More</h2>
          <ul className="space-y-2.5 text-[15px]">
            <li><Link to="/security" className="text-accent hover:underline">How your API key is stored and scoped</Link></li>
            <li><Link to="/exchanges" className="text-accent hover:underline">The exchanges we support</Link></li>
            <li><Link to="/roadmap" className="text-accent hover:underline">What we are building next</Link></li>
            <li><Link to="/support" className="text-accent hover:underline">Support</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
