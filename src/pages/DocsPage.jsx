import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { DOCS, DOC_BROKERS } from '../lib/exchangeDocs';

const SITE = 'https://tradeguardx.com';
// The docs live at /help (the navbar "Guides" link points here).
const BASE = '/help';

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
 *  - BreadcrumbList (always) — Home › Docs › Article
 *  - HowTo — for the step-by-step setup article (rich "how-to" results)
 *  - FAQPage — for troubleshooting (rich Q&A results)
 *  - TechArticle — for concept articles
 */
function buildDocsSchema(doc, article, pageUrl, description) {
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

  const stepsSection = article.sections.find((s) => s.steps);
  if (stepsSection) {
    graph.push({
      '@type': 'HowTo',
      name: `Set up ${doc.label} with TradeGuardX`,
      description,
      step: stepsSection.steps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: [s.body, ...(s.sub || [])].filter(Boolean).join(' '),
        url: `${pageUrl}#step-${i + 1}`,
      })),
    });
  }

  const faqList = article.slug === 'troubleshooting'
    ? (article.sections[0]?.list || [])
    : [];
  if (faqList.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqList.map((i) => ({
        '@type': 'Question',
        name: (i.bold || i.text).replace(/[:"]/g, '').trim(),
        acceptedAnswer: { '@type': 'Answer', text: i.text },
      })),
    });
  }

  if (!stepsSection && !faqList.length) {
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

/** Renders a single doc article: intro + sections (body / steps / list / note). */
function ArticleBody({ article }) {
  return (
    <article className="min-w-0">
      <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">{article.title}</h1>
      {article.intro && <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{article.intro}</p>}

      <div className="mt-8 space-y-10">
        {article.sections.map((s, si) => (
          <section key={si}>
            {s.heading && <h2 className="font-display text-xl font-bold text-white md:text-2xl">{s.heading}</h2>}
            {s.body && <p className={`${s.heading ? 'mt-3' : ''} text-[15px] leading-relaxed text-slate-400`}>{s.body}</p>}

            {s.steps && (
              <ol className="mt-6 space-y-6">
                {s.steps.map((step, i) => (
                  <li key={i} id={`step-${i + 1}`} className="relative flex scroll-mt-24 gap-4">
                    {i < s.steps.length - 1 && (
                      <span className="absolute left-[15px] top-9 bottom-[-24px] w-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} aria-hidden />
                    )}
                    <span
                      className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.35)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-[15px] font-semibold text-white">{step.title}</p>
                      {step.body && <p className="mt-1 text-[14px] leading-relaxed text-slate-400">{step.body}</p>}
                      {step.sub && (
                        <ul className="mt-2.5 space-y-1.5">
                          {step.sub.map((x, j) => (
                            <li key={j} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-400">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {step.note && (
                        <p
                          className="mt-2.5 rounded-lg border px-3 py-2 text-[13px] leading-relaxed text-slate-300"
                          style={{ borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.05)' }}
                        >
                          {step.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {s.list && (
              <ul className={`${s.heading || s.body ? 'mt-4' : ''} space-y-2.5`}>
                {s.list.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="text-[15px] leading-relaxed text-slate-400">
                      {item.bold && <span className="font-semibold text-slate-200">{item.bold} </span>}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {s.note && (
              <p
                className="mt-4 rounded-xl border px-4 py-3 text-[13px] leading-relaxed text-slate-300"
                style={{ borderColor: 'rgba(0,212,170,0.18)', backgroundColor: 'rgba(0,212,170,0.05)' }}
              >
                <span className="font-semibold text-accent">Note: </span>
                {s.note}
              </p>
            )}
          </section>
        ))}
      </div>

      <div
        className="mt-12 rounded-2xl border px-5 py-5 text-sm text-slate-400"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        Still stuck? Email{' '}
        <a href="mailto:support@tradeguardx.com" className="font-semibold text-accent hover:underline">
          support@tradeguardx.com
        </a>{' '}
        and we&apos;ll help you get protected.
      </div>
    </article>
  );
}

/**
 * Exchange documentation with a broker toggle and a /help-style article sidebar.
 * Only Delta Exchange ships today; more brokers appear automatically as they're
 * added to DOC_BROKERS / DOCS. Routed as /docs and /docs/:slug.
 */
export default function DocsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [broker, setBroker] = useState(DOC_BROKERS[0].id);
  const [pickerOpen, setPickerOpen] = useState(false);

  const doc = DOCS[broker] || DOCS[DOC_BROKERS[0].id];
  const articles = doc.articles;
  const activeSlug = slug || articles[0].slug;
  const article = articles.find((a) => a.slug === activeSlug);

  const pageUrl = `${SITE}${BASE}${slug ? `/${slug}` : ''}`;
  const description =
    metaDesc(article?.intro) ||
    `How TradeGuardX protects your ${doc.label} account — setup, the kill switch, your rules, cooldowns, and troubleshooting.`;
  const jsonLd = useMemo(
    () => (article ? buildDocsSchema(doc, article, pageUrl, description) : null),
    [doc, article, pageUrl, description],
  );

  useSEO({
    title: article ? `${article.title} · ${doc.label} Docs` : `${doc.label} Documentation`,
    description,
    url: pageUrl,
    jsonLd,
  });

  // Unknown slug → bounce to the docs home (first article).
  useEffect(() => {
    if (slug && !article) navigate(BASE, { replace: true });
  }, [slug, article, navigate]);

  const switchBroker = (id) => {
    setBroker(id);
    navigate(BASE);
  };

  if (!article) return null;

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
          {/* Article sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* Exchange selector — defaults to Delta Exchange; scales to more brokers */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Exchange</p>
            <div className="relative mb-6">
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#e6edf3' }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,170,0.7)]" />
                  {doc.label}
                </span>
                <svg className="h-4 w-4 transition-transform" style={{ color: '#9aa6b2', transform: pickerOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {pickerOpen && (
                <>
                  <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setPickerOpen(false)} />
                  <ul
                    role="listbox"
                    className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border py-1 shadow-xl"
                    style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: '#0d1117' }}
                  >
                    {DOC_BROKERS.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={b.id === broker}
                          onClick={() => { switchBroker(b.id); setPickerOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-white/[0.05]"
                          style={{ color: b.id === broker ? '#00d4aa' : '#cbd5e1' }}
                        >
                          {b.id === broker && (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                          <span className={b.id === broker ? '' : 'pl-[22px]'}>{b.label}</span>
                        </button>
                      </li>
                    ))}
                    <li className="px-3 py-2 text-[11px] font-medium text-slate-600">More exchanges soon</li>
                  </ul>
                </>
              )}
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Articles</p>
            <nav className="flex flex-col gap-1">
              {articles.map((a) => {
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
                    {a.title}
                  </Link>
                );
              })}
            </nav>

            <div
              className="mt-8 rounded-xl border p-4 text-xs leading-relaxed"
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

          {/* Article */}
          <motion.main key={`${broker}/${activeSlug}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <ArticleBody article={article} />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
