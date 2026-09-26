import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { SITE, ogImageFor } from '../../lib/publicRoutes';
import { ENFORCED_RULES, VENUE_ORDER, venuePageFor, VENUE_PAGES } from '../../lib/venueSeo';
import { guidesFor } from '../../lib/venueGuides';
import NotFoundPage from '../NotFoundPage';

/**
 * /exchanges/<venue> — the venue's kill-switch page.
 *
 * THE HUB IS THE KILL-SWITCH PAGE. There is no child page for the kill switch,
 * because a /exchanges/delta/kill-switch would target the same query as its own
 * parent and split the internal links between them. What lives underneath are
 * the things that are genuinely a different question: how to make the key, and
 * on CoinDCX, what the margin toggle does.
 *
 * One component renders all five venues from venueSeo.js rather than five page
 * files. Five files would be five places to forget a canonical, five title tags
 * drifting past 60 characters independently, and five FAQ schemas of varying
 * correctness. The data is per venue; the head, the schema and the rules table
 * are written once.
 */

/** Colour and wording for the rules table's honest column. */
const FIRES = {
  full: { label: 'Closes & locks', color: '#00d4aa', bg: 'rgba(0,212,170,0.12)', border: 'rgba(0,212,170,0.3)' },
  'one position': { label: 'Closes one position', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.28)' },
  'alert only': { label: 'Alert only', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
};

function FiresPill({ kind }) {
  const f = FIRES[kind];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold"
      style={{ color: f.color, backgroundColor: f.bg, borderColor: f.border }}
    >
      {f.label}
    </span>
  );
}

/**
 * The rules table. `Closes & locks` vs `Alert only` is the column that matters:
 * three of these seven never close anything, and a trader who thinks Max
 * Drawdown is a floor has bought a floor that does not exist. Stacking the
 * cards on a phone rather than scrolling a table horizontally — a rule you
 * cannot read is the same as a rule you were not told.
 */
function RulesTable() {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {ENFORCED_RULES.map((r, i) => (
        <div
          key={r.name}
          className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5"
          style={{
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            backgroundColor: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
          }}
        >
          <div className="sm:w-[190px] sm:shrink-0">
            <p className="text-[14px] font-bold text-white">{r.name}</p>
            <div className="mt-2">
              <FiresPill kind={r.fires} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-relaxed text-slate-300">{r.does}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{r.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExchangeHubPage() {
  const { venue: slug } = useParams();
  const venue = venuePageFor(slug);

  // An unknown venue is a 404, not a redirect to the index. A redirect that
  // answers 200 with the index's content is a soft 404: Google keeps the URL
  // and treats it as a duplicate of /exchanges.
  if (!venue) return <NotFoundPage />;

  const url = `${SITE}/exchanges/${venue.slug}`;
  // Same asset as the og:image, deliberately. It is a 1200x630 card naming the
  // venue, which is exactly what belongs at the top of the venue's page — and
  // declaring it in one place means the picture someone sees when the link is
  // shared is the picture they land on.
  const hero = ogImageFor(`/exchanges/${venue.slug}`);
  const guides = guidesFor(venue.slug);
  const others = VENUE_ORDER.filter((s) => s !== venue.slug).map((s) => VENUE_PAGES[s]);

  return (
    <>
      <VenueHead venue={venue} url={url} />
      <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
            style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 65%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-slate-500">
            <Link to="/exchanges" className="hover:text-accent">Exchanges</Link>
            <span className="px-2">/</span>
            <span className="text-slate-400">{venue.longName}</span>
          </nav>

          <header className={hero ? 'mb-8' : 'mb-14'}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{venue.longName}</p>
              {venue.beta && (
                <span
                  className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)' }}
                >
                  Beta
                </span>
              )}
              {venue.status === 'waitlist' && (
                <span
                  className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.25)', backgroundColor: 'rgba(148,163,184,0.08)' }}
                >
                  Not live yet
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">{venue.h1}</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">{venue.lede}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
              >
                {venue.status === 'waitlist' ? 'Join the waitlist' : 'Try free for 7 days'}
              </Link>
              {guides.length > 0 && (
                <Link
                  to={`/exchanges/${venue.slug}/${guides[0].slug}`}
                  className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
                >
                  {venue.name} setup guide
                </Link>
              )}
            </div>
          </header>

          {hero && (
            <img
              src={hero}
              alt={`${venue.h1} — TradeGuardX`}
              width={1200}
              height={630}
              /* Eager and not lazy: it is the first thing below the H1, so a
                 lazy load here is a visible pop-in on every visit. */
              loading="eager"
              className="mb-14 w-full rounded-2xl border"
              style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
            />
          )}

          <div className="space-y-12">
            {venue.sections.map((s, i) => (
              <motion.section
                key={s.h}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <h2 className="mb-3 font-display text-2xl font-bold text-white">{s.h}</h2>
                {(s.p ?? []).map((para) => (
                  <p key={para.slice(0, 24)} className="mb-3 text-[15px] leading-relaxed text-slate-300">
                    {para}
                  </p>
                ))}
                {s.rulesTable && <RulesTable />}
                {s.guideLink && (
                  <Link
                    to={`/exchanges/${venue.slug}/${s.guideLink}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-accent hover:underline"
                  >
                    {s.guideLink === 'api-key'
                      ? `Read the ${venue.name} key setup guide`
                      : `Read: ${venue.name} INR vs USDT margin`}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </motion.section>
            ))}
          </div>

          <section className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-bold text-white">
              {venue.longName} questions
            </h2>
            <div className="space-y-3">
              {venue.faq.map((f) => (
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

          {/* Cross-links between venue pages. Each one is a different query, so
              passing authority around the set beats leaving five isolated pages. */}
          <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <h2 className="mb-4 font-display text-lg font-bold text-white">Other exchanges</h2>
            <ul className="space-y-2.5 text-[15px]">
              {others.map((v) => (
                <li key={v.slug}>
                  <Link to={`/exchanges/${v.slug}`} className="text-accent hover:underline">
                    Kill switch for {v.longName}
                  </Link>
                  {v.status === 'waitlist' && <span className="ml-2 text-[13px] text-slate-500">not live yet</span>}
                </li>
              ))}
              <li className="pt-2">
                <Link to="/crypto-kill-switch" className="text-accent hover:underline">
                  What a crypto kill switch is, in general
                </Link>
              </li>
              <li>
                <Link to="/help/kill-switch" className="text-accent hover:underline">
                  How the kill switch works, step by step
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * Head and structured data. Split into its own component so the hooks run
 * unconditionally — the early `return <NotFoundPage />` above for an unknown
 * venue would otherwise change the hook order between renders.
 */
function VenueHead({ venue, url }) {
  useSEO({
    title: venue.title,
    rawTitle: true,
    description: venue.description,
    url,
    image: ogImageFor(`/exchanges/${venue.slug}`),
    imageAlt: `${venue.h1} — TradeGuardX`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: venue.h1,
          description: venue.description,
          url,
          ...(ogImageFor(`/exchanges/${venue.slug}`)
            ? { primaryImageOfPage: { '@type': 'ImageObject', url: ogImageFor(`/exchanges/${venue.slug}`), width: 1200, height: 630 } }
            : {}),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Exchanges', item: `${SITE}/exchanges` },
            { '@type': 'ListItem', position: 3, name: venue.longName, item: url },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: venue.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
      ],
    },
  });
  return null;
}
