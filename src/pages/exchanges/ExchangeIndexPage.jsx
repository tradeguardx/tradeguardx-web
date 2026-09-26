import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { SITE, ogImageFor } from '../../lib/publicRoutes';
import { VENUE_PAGE_LIST } from '../../lib/venueSeo';
import { guidesFor } from '../../lib/venueGuides';

/**
 * /exchanges — the venue index.
 *
 * Its job is to be the one page that links to every venue, so the venue pages
 * are not orphans depending on the sitemap to be discovered. It is also
 * where /help/getting-started now lands: that URL is indexed, and the honest
 * replacement for "the setup guide" once there is one per venue is the list of
 * them, not an arbitrary one of the three.
 */

const STATUS = {
  live: { label: 'Live', color: '#00d4aa', bg: 'rgba(0,212,170,0.12)', border: 'rgba(0,212,170,0.3)' },
};

export default function ExchangeIndexPage() {
  const url = `${SITE}/exchanges`;
  const live = VENUE_PAGE_LIST.filter((v) => v.status === 'live');

  useSEO({
    title: 'Supported Exchanges — Kill Switch for Indian Crypto',
    rawTitle: true,
    description:
      'TradeGuardX enforces your daily loss limit on Delta Exchange, CoinDCX futures and Shark Exchange. Pick your venue for setup steps and exactly which rules it can enforce.',
    url,
    image: ogImageFor('/exchanges'),
    imageAlt: 'Exchanges supported by TradeGuardX',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Exchanges', item: url },
          ],
        },
        {
          '@type': 'ItemList',
          name: 'Exchanges supported by TradeGuardX',
          itemListElement: VENUE_PAGE_LIST.map((v, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: v.longName,
            url: `${SITE}/exchanges/${v.slug}`,
          })),
        },
      ],
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
        <header className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Exchanges</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Which exchanges TradeGuardX protects
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            {live.length} Indian venues are live today, all futures. You connect an API key scoped to
            trade — never to withdraw — and enforcement runs from our servers, so it applies whether
            the order came from the exchange website, its phone app, or a script you wrote.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            One subscription covers every exchange you connect. Spot is not covered on any venue.
          </p>
        </header>

        <div className="space-y-4">
          {VENUE_PAGE_LIST.map((v, i) => {
            const st = STATUS[v.status];
            const guides = guidesFor(v.slug);
            return (
              <motion.div
                key={v.slug}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Link
                  to={`/exchanges/${v.slug}`}
                  className="block rounded-2xl border px-6 py-5 transition-colors hover:border-white/20"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-xl font-bold text-white">{v.longName}</h2>
                    <span
                      className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: st.color, backgroundColor: st.bg, borderColor: st.border }}
                    >
                      {st.label}
                    </span>
                    {v.beta && (
                      <span
                        className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)' }}
                      >
                        Beta
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-slate-400">{v.description}</p>
                  {guides.length > 0 && (
                    <p className="mt-3 text-[13px] text-slate-500">
                      Also: {guides.map((g) => g.navLabel).join(' · ')}
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="mb-4 font-display text-lg font-bold text-white">Read next</h2>
          <ul className="space-y-2.5 text-[15px]">
            <li>
              <Link to="/crypto-kill-switch" className="text-accent hover:underline">
                What a crypto kill switch is, and how to judge one
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
              <Link to="/crypto-tax-india" className="text-accent hover:underline">
                Crypto tax in India: F&amp;O vs VDA, and why they stay separate
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
