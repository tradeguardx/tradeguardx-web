import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { SITE, ogImageFor } from '../../lib/publicRoutes';
import { venuePageFor } from '../../lib/venueSeo';
import { guideFor, guidesFor } from '../../lib/venueGuides';
import { venueFor } from '../../lib/venues';
import ArticleBody from '../../components/docs/ArticleBody';
import NotFoundPage from '../NotFoundPage';

/**
 * /exchanges/<venue>/<guide> — the setup guides that used to share the single
 * URL /help/getting-started, where only the first venue's copy was ever served
 * to a crawler.
 *
 * Nesting stops here. Two levels is the whole structure: the venue, and the
 * thing about that venue that is genuinely a different question.
 */

/**
 * The walkthrough screenshots, every one on the page rather than in a carousel.
 *
 * The dashboard shows these in a slider because someone mid-connect wants one
 * step at a time. A crawler cannot advance a slider, and neither can someone
 * who wants to scan the whole flow before starting — so here they are all
 * rendered, each as a figure whose caption IS the instruction. That is also
 * what shows if an image fails to load, which is why the captions say what to
 * DO rather than describing the picture.
 */
/**
 * How tall a single walkthrough step renders inline.
 *
 * Deliberately smaller than "readable at a glance", because these captures are
 * not all the same thing. Delta's are single portrait phone screens; CoinDCX's
 * are tall composites that carry their own numbered header band and more than
 * one panel per file. There is no one height that shows a composite's detail
 * AND leaves the page scannable — at 700px a single step filled the viewport
 * and you scrolled past a picture to reach the sentence explaining it.
 *
 * So inline is a preview and the full-size image is one click away. That also
 * keeps the detail reachable without a lightbox: it is a plain link to the
 * image, which works with JS off and gives a crawler another route to the file.
 */
const GUIDE_MAX_H = 520;

function GuideShots({ steps, venueName }) {
  const [dead, setDead] = useState({});
  if (!steps?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-white md:text-2xl">
        The {venueName} screens, in order
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
        Captions are the instruction — if an image has not loaded, the caption alone is enough to
        follow. Tap any screenshot to open it full size.
      </p>
      <ol className="mt-6 space-y-8">
        {steps.map((s, i) => {
          const src = dead[i] && s.fallbackSrc ? s.fallbackSrc : s.src;
          const broken = dead[i] && !s.fallbackSrc;
          return (
            <li key={s.alt}>
              <figure
                className="m-0 overflow-hidden rounded-xl border"
                style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {/*
                 * The caption goes ABOVE the picture, and the picture is capped
                 * by HEIGHT rather than stretched to the column width.
                 *
                 * Delta's walkthrough is four portrait phone screenshots; the
                 * other two venues are desktop captures. At `w-full` in a 3xl
                 * column a portrait shot rendered about 1400px tall — you had
                 * to scroll past a phone screen to reach the instruction that
                 * explained it. Capping the height lets both shapes sit at a
                 * sane size without the component needing to know which it has.
                 */}
                <figcaption className="flex items-start gap-3 px-4 py-3.5">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.35)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-relaxed text-slate-300">{s.alt}</span>
                </figcaption>
                {!broken && (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    {/*
                     * Sized by HEIGHT, not width: the venues' captures are
                     * different shapes — portrait phone screens on Delta,
                     * desktop composites on CoinDCX and Shark — and a width
                     * that suits one makes the other wrong.
                     */}
                    <img
                      src={src}
                      alt={s.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="mx-auto block w-full object-contain"
                      style={{ maxHeight: GUIDE_MAX_H }}
                      onError={() => setDead((d) => (d[i] ? d : { ...d, [i]: true }))}
                    />
                    <span
                      className="pointer-events-none absolute bottom-3 right-3 rounded-md border px-2 py-1 text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(7,9,15,0.85)', color: '#cbd5e1' }}
                    >
                      Open full size ↗
                    </span>
                  </a>
                )}
              </figure>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function ExchangeGuidePage() {
  const { venue: venueSlug, guide: guideSlug } = useParams();
  const venue = venuePageFor(venueSlug);
  const guide = venue ? guideFor(venueSlug, guideSlug) : null;

  if (!venue || !guide) return <NotFoundPage />;

  const url = `${SITE}/exchanges/${venue.slug}/${guide.slug}`;
  const shots = guide.imagesFrom ? venueFor(guide.imagesFrom)?.appGuide : null;
  const siblings = guidesFor(venue.slug).filter((g) => g.slug !== guide.slug);

  return (
    <>
      <GuideHead venue={venue} guide={guide} url={url} shots={shots} />
      <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
            style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-slate-500">
            <Link to="/exchanges" className="hover:text-accent">Exchanges</Link>
            <span className="px-2">/</span>
            <Link to={`/exchanges/${venue.slug}`} className="hover:text-accent">{venue.longName}</Link>
            <span className="px-2">/</span>
            <span className="text-slate-400">{guide.navLabel}</span>
          </nav>

          {/* The venue's own step list is the article; the screenshots slot in
              after the intro, before the numbered steps, so the page reads
              "here is the flow" then "here is each step in words". */}
          <ArticleBody article={guide} showDemo={Boolean(guide.imagesFrom)}>
            <GuideShots steps={shots} venueName={venue.name} />
          </ArticleBody>

          <section className="mt-14 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <h2 className="mb-4 font-display text-lg font-bold text-white">Read next</h2>
            <ul className="space-y-2.5 text-[15px]">
              <li>
                <Link to={`/exchanges/${venue.slug}`} className="text-accent hover:underline">
                  {venue.h1} — what it does when you breach a limit
                </Link>
              </li>
              {siblings.map((g) => (
                <li key={g.slug}>
                  <Link to={`/exchanges/${venue.slug}/${g.slug}`} className="text-accent hover:underline">
                    {g.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/help/rules" className="text-accent hover:underline">
                  Every rule you can set, and what each one prevents
                </Link>
              </li>
              <li>
                <Link to="/help/troubleshooting" className="text-accent hover:underline">
                  Troubleshooting a rejected key
                </Link>
              </li>
              <li>
                <Link to="/security" className="text-accent hover:underline">
                  Security: how your API key is stored and scoped
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

/** Head + HowTo/Breadcrumb schema. Separate component so hooks run after the
 *  unknown-guide 404 check without changing hook order. */
function GuideHead({ venue, guide, url, shots }) {
  const stepsSection = guide.sections.find((s) => s.steps);
  useSEO({
    title: guide.seoTitle,
    rawTitle: true,
    description: guide.description,
    url,
    image: ogImageFor(`/exchanges/${venue.slug}/${guide.slug}`),
    imageAlt: `${guide.title} — TradeGuardX`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Exchanges', item: `${SITE}/exchanges` },
            { '@type': 'ListItem', position: 3, name: venue.longName, item: `${SITE}/exchanges/${venue.slug}` },
            { '@type': 'ListItem', position: 4, name: guide.navLabel, item: url },
          ],
        },
        stepsSection
          ? {
              '@type': 'HowTo',
              name: guide.title,
              description: guide.description,
              ...(shots?.length ? { image: shots.map((s) => s.src) } : {}),
              step: stepsSection.steps.map((s, i) => ({
                '@type': 'HowToStep',
                position: i + 1,
                name: s.title,
                text: [s.body, ...(s.sub || [])].filter(Boolean).join(' '),
                url: `${url}#step-${i + 1}`,
              })),
            }
          : {
              '@type': 'TechArticle',
              headline: guide.title,
              description: guide.description,
              url,
              inLanguage: 'en',
              isPartOf: { '@type': 'WebSite', name: 'TradeGuardX', url: SITE },
            },
      ],
    },
  });
  return null;
}
