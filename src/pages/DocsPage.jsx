import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { HELP_ARTICLES } from '../lib/exchangeDocs';
import { VENUE_PAGE_LIST } from '../lib/venueSeo';
import ArticleBody from '../components/docs/ArticleBody';
import NotFoundPage from './NotFoundPage';

const SITE = 'https://tradeguardx.com';
// The docs live at /help (the navbar "Guides" link points here).
const BASE = '/help';

/**
 * /help — the seven articles that describe the engine.
 *
 * THE BROKER TOGGLE IS GONE. It used to pick a venue with React state, which
 * meant /help/getting-started was one URL serving three different articles and
 * only Delta's was ever crawled. The per-venue setup guides moved to
 * /exchanges/<venue>/api-key, one URL each; what remains here is identical on
 * every venue, so a selector would offer a choice that changes nothing on the
 * page. In its place is a link to /exchanges, which is where a venue question
 * actually gets answered now.
 */

/** Trim to a clean ~158-char meta description at a word boundary. */
function metaDesc(text) {
  if (!text) return undefined;
  if (text.length <= 158) return text;
  const cut = text.slice(0, 158);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
}

/** Strip a section's list/steps into plain answer text for FAQ/HowTo schema. */
function sectionText(section) {
  const parts = [];
  if (section.body) parts.push(section.body);
  (section.list || []).forEach((i) => parts.push(`${i.bold ? `${i.bold} ` : ''}${i.text}`));
  (section.steps || []).forEach((s) => parts.push([s.title, s.body, ...(s.sub || [])].filter(Boolean).join(' ')));
  if (section.note) parts.push(section.note);
  return parts.join(' ').trim();
}

/**
 * Page-specific structured data (JSON-LD) for the active article:
 *  - BreadcrumbList (always) — Home › Guides › Article
 *  - FAQPage — for troubleshooting (rich Q&A results)
 *  - TechArticle — for the concept articles
 *
 * The HowTo branch left with the setup guides: every article here is a concept
 * article or a troubleshooting list, and the step-by-step HowTo schema now sits
 * on the venue guide pages where the steps actually are.
 */
function buildDocsSchema(article, pageUrl, description) {
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}${BASE}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: pageUrl },
      ],
    },
  ];

  const faqList = article.slug === 'troubleshooting' ? (article.sections[0]?.list || []) : [];
  if (faqList.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqList.map((i) => ({
        '@type': 'Question',
        name: (i.bold || i.text).replace(/[:"]/g, '').trim(),
        acceptedAnswer: { '@type': 'Answer', text: i.text },
      })),
    });
  } else {
    graph.push({
      '@type': 'TechArticle',
      headline: article.title,
      description,
      url: pageUrl,
      inLanguage: 'en',
      articleBody: [article.intro, ...article.sections.map(sectionText)].filter(Boolean).join('\n\n'),
      isPartOf: { '@type': 'WebSite', name: 'TradeGuardX', url: SITE },
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export default function DocsPage() {
  const { slug } = useParams();
  const activeSlug = slug || HELP_ARTICLES[0].slug;
  const article = HELP_ARTICLES.find((a) => a.slug === activeSlug);

  /*
   * An unknown slug is a 404, not a redirect.
   *
   * This used to `navigate('/help', { replace: true })`, which answered 200
   * with the first article's content for every typo and every URL that ever
   * pointed at an article we renamed — a soft 404. Google keeps those URLs and
   * files them as duplicates of /help, so a handful of dead links quietly
   * became a handful of competing copies of the page we wanted to rank.
   *
   * NotFoundPage renders `noindex, nofollow`. The HTTP status is still 200,
   * because vercel.json rewrites every path to index.html and a static SPA has
   * no way to set a status per route — but noindex plus 404 content is what
   * actually gets the URL dropped from the index.
   */
  if (!article) return <NotFoundPage />;

  return <HelpArticle article={article} activeSlug={activeSlug} />;
}

function HelpArticle({ article, activeSlug }) {
  const pageUrl = `${SITE}${BASE}${article.slug === HELP_ARTICLES[0].slug ? '' : `/${article.slug}`}`;
  const description =
    metaDesc(article.intro) ||
    'How TradeGuardX protects your account — the kill switch, your rules, cooldowns, and troubleshooting.';
  const jsonLd = useMemo(() => buildDocsSchema(article, pageUrl, description), [article, pageUrl, description]);

  useSEO({
    title: article.title,
    description,
    url: pageUrl,
    jsonLd,
  });

  const liveVenues = VENUE_PAGE_LIST.filter((v) => v.status === 'live');

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Articles</p>
            <nav className="flex flex-col gap-1">
              {HELP_ARTICLES.map((a) => {
                const isActive = a.slug === activeSlug;
                return (
                  <Link
                    key={a.slug}
                    to={`${BASE}/${a.slug}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? 'rgba(0,212,170,0.10)' : 'transparent',
                      color: isActive ? '#00d4aa' : '#94a3b8',
                      border: `1px solid ${isActive ? 'rgba(0,212,170,0.20)' : 'transparent'}`,
                    }}
                  >
                    {a.navTitle ?? a.title}
                  </Link>
                );
              })}
            </nav>

            {/* Where the broker toggle used to be. Setting up a key is the one
                genuinely per-venue question, and it now has a page per venue. */}
            <div
              className="mt-8 rounded-xl border p-4"
              style={{ borderColor: 'rgba(0,212,170,0.18)', backgroundColor: 'rgba(0,212,170,0.04)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Setting up</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Connecting a key is different on each exchange.
              </p>
              <nav className="mt-3 flex flex-col gap-1.5">
                {liveVenues.map((v) => (
                  <Link
                    key={v.slug}
                    to={`/exchanges/${v.slug}/api-key`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {v.longName} setup →
                  </Link>
                ))}
              </nav>
            </div>

            <div
              className="mt-6 rounded-xl border p-4 text-xs leading-relaxed"
              style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)', color: '#64748b' }}
            >
              <p className="font-semibold text-slate-300">Need real help?</p>
              <p className="mt-1.5">
                Email{' '}
                <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
                  support@tradeguardx.com
                </a>
                {' '}— we read every message.
              </p>
            </div>
          </aside>

          <motion.main key={activeSlug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <ArticleBody article={article} />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
