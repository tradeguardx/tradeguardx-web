import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { HELP_ARTICLES } from '../lib/helpArticles';

const DEFAULT_SLUG = HELP_ARTICLES[0].slug;

/**
 * Build Schema.org FAQPage JSON-LD from the article's sections so search
 * engines can render rich expandable Q&A in the SERP. Each section heading
 * becomes the question; body + list items become the answer text.
 */
function buildFaqSchema(article) {
  if (!article?.sections?.length) return null;
  const faqs = article.sections
    .filter((s) => s.heading && (s.body || s.list))
    .map((s) => {
      const listText = (s.list || [])
        .map((item) => `${item.bold ? item.bold + ' ' : ''}${item.text}`)
        .join(' ');
      const noteText = s.note ? ` Note: ${s.note}` : '';
      return {
        '@type': 'Question',
        name: s.heading,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${s.body || ''} ${listText}${noteText}`.trim(),
        },
      };
    });
  if (faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs,
  };
}

function FaqSchemaTag({ schema }) {
  if (!schema) return null;
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function ArticleBody({ article }) {
  return (
    <article className="max-w-2xl">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Docs</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-400">{article.intro}</p>
      </header>

      <div className="space-y-8">
        {article.sections.map((s, i) => (
          <motion.section
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            {s.heading && (
              <h2 className="mb-3 font-display text-lg font-bold text-white sm:text-xl">{s.heading}</h2>
            )}
            {s.body && (
              <p className="text-sm leading-relaxed text-slate-300 sm:text-[15px]">{s.body}</p>
            )}
            {s.list && (
              <ul className="mt-3 space-y-2.5">
                {s.list.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent/60" />
                    <span>
                      {item.bold && <strong className="text-slate-200">{item.bold} </strong>}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {s.note && (
              <p
                className="mt-4 rounded-xl border px-4 py-3 text-xs leading-relaxed text-slate-300"
                style={{
                  borderColor: 'rgba(0,212,170,0.20)',
                  backgroundColor: 'rgba(0,212,170,0.05)',
                }}
              >
                <strong className="text-accent">Note: </strong>
                {s.note}
              </p>
            )}
          </motion.section>
        ))}
      </div>

      <div
        className="mt-12 rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: 'var(--dash-border, rgba(255,255,255,0.08))', backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        <p className="text-sm font-semibold text-white">Still stuck?</p>
        <p className="mt-1 text-sm text-slate-400">
          Email <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">support@tradeguardx.com</a> with what you're seeing — we usually reply within a business day.
        </p>
      </div>
    </article>
  );
}

export default function HelpPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const activeSlug = slug || DEFAULT_SLUG;
  const article = HELP_ARTICLES.find((a) => a.slug === activeSlug);

  useSEO({
    title: article ? `${article.title} · Docs` : 'Docs',
    description: article?.intro || 'TradeGuardX documentation — getting started, pairing, rules, account, troubleshooting.',
    url: `https://tradeguardx.com/help${slug ? `/${slug}` : ''}`,
  });

  const faqSchema = useMemo(() => buildFaqSchema(article), [article]);

  // If slug doesn't match any article, redirect to default. Avoids broken
  // pages when someone shares a typo'd /help/foo URL.
  useEffect(() => {
    if (slug && !article) navigate('/help', { replace: true });
  }, [slug, article, navigate]);

  if (!article) return null;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <FaqSchemaTag schema={faqSchema} />
      {/* Ambient background — same vibe as other static pages */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Articles</p>
            <nav className="flex flex-col gap-1">
              {HELP_ARTICLES.map((a) => {
                const isActive = a.slug === activeSlug;
                return (
                  <Link
                    key={a.slug}
                    to={`/help/${a.slug}`}
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
          <main>
            <ArticleBody article={article} />
          </main>
        </div>
      </div>
    </div>
  );
}
