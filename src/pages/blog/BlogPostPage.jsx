import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { SITE } from '../../lib/publicRoutes';
import { categoryFor, categoryPath, plannedIn, postFor, postPath, postsIn } from '../../content/blog/posts';
import { ARTICLES } from './articles';
import { BlogBackdrop, PlannedCard, PostCard } from '../../components/blog/BlogBits';
import { fmtDate } from '../../components/blog/visuals/format';
import NotFoundPage from '../NotFoundPage';

/**
 * One blog post. The article body is a JSX module (see ./articles.js) that
 * also exports its `toc` and `faq`, so the FAQPage schema is generated from
 * the same text the reader sees — schema that disagrees with the page is a
 * manual-action risk, not a ranking trick.
 */
export default function BlogPostPage() {
  const { slug } = useParams();
  const post = postFor(slug);
  const mod = ARTICLES[slug];
  if (!post || !mod) return <NotFoundPage />;
  return <PostView post={post} mod={mod} />;
}

const AUTHOR = { '@type': 'Organization', name: 'TradeGuardX', url: SITE };

function PostView({ post, mod }) {
  const { default: Article, toc = [], faq = [] } = mod;
  const cat = categoryFor(post.category);
  const url = `${SITE}${postPath(post.slug)}`;

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          datePublished: post.published,
          dateModified: post.updated,
          author: AUTHOR,
          publisher: { ...AUTHOR, logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` } },
          mainEntityOfPage: url,
          image: `${SITE}/og-image.png`,
          articleSection: cat?.name,
          inLanguage: 'en-IN',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE}/blog` },
            { '@type': 'ListItem', position: 2, name: cat?.name, item: `${SITE}${categoryPath(post.category)}` },
            { '@type': 'ListItem', position: 3, name: post.title, item: url },
          ],
        },
        ...(faq.length
          ? [
              {
                '@type': 'FAQPage',
                mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
              },
            ]
          : []),
      ],
    }),
    [post, cat, url, faq],
  );

  useSEO({ title: post.seoTitle, rawTitle: true, description: post.description, url, jsonLd });

  const related = postsIn(post.category).filter((p) => p.slug !== post.slug);
  const planned = plannedIn(post.category).slice(0, 3);

  return (
    <BlogBackdrop>
      <ReadingProgress />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-24 xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-14">
        <article className="mx-auto min-w-0 max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
            <Link to="/blog" className="hover:text-slate-300">Blog</Link>
            <span className="mx-2">/</span>
            <Link to={categoryPath(post.category)} className="hover:text-slate-300">{cat?.name}</Link>
          </nav>

          <header className="mt-5">
            <Link
              to={categoryPath(post.category)}
              className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent"
            >
              {cat?.name}
            </Link>
            <h1 className="mt-4 font-display text-[34px] font-bold leading-[1.12] text-white md:text-5xl">{post.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">{post.dek}</p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
              <span className="font-semibold text-slate-300">TradeGuardX Research</span>
              <span aria-hidden>·</span>
              <time dateTime={post.updated}>Updated {fmtDate(post.updated)}</time>
              <span aria-hidden>·</span>
              <span>{post.readMins} min read</span>
            </p>
          </header>

          {toc.length > 0 && (
            <details className="mt-8 rounded-xl border px-5 py-4 xl:hidden" style={{ borderColor: 'rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)' }}>
              <summary className="cursor-pointer list-none text-[14px] font-semibold text-slate-200 marker:hidden">
                In this article <span className="text-slate-500">({toc.length})</span>
              </summary>
              <TocList toc={toc} />
            </details>
          )}

          <div className="mt-8">
            <Article />
          </div>

          {faq.length > 0 && (
            <section className="mt-16" aria-labelledby="faq">
              <h2 id="faq" className="mb-6 scroll-mt-28 font-display text-[26px] font-bold text-white">
                Frequently asked questions
              </h2>
              <div className="space-y-3">
                {faq.map((f) => (
                  <details
                    key={f.q}
                    className="group rounded-xl border px-5 py-4 transition-colors open:border-white/15"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-semibold text-slate-100 marker:hidden">
                      {f.q}
                      <span className="mt-0.5 text-accent transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section
            className="bv-glow relative mt-16 overflow-hidden rounded-2xl border px-6 py-8 text-center sm:px-10"
            style={{ borderColor: 'rgba(0,212,170,.25)', background: 'linear-gradient(160deg, rgba(0,212,170,.10), rgba(255,255,255,.01) 60%)' }}
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent">Stop relying on willpower</p>
            <h2 className="mx-auto mt-3 max-w-lg font-display text-2xl font-bold text-white md:text-3xl">
              Set your daily loss limit once. Let the engine hold the line.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
              Orders cancelled, positions closed and the account locked until your reset, on Delta Exchange, CoinDCX and
              Shark Exchange.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]">
                Try free for 3 days
              </Link>
              <Link to="/crypto-kill-switch" className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20">
                How the kill switch works
              </Link>
            </div>
          </section>

          {(related.length > 0 || planned.length > 0) && (
            <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="mb-5 font-display text-lg font-bold text-white">More on {cat?.name.toLowerCase()}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
                {planned.map((p) => (
                  <PlannedCard key={p.title} item={p} />
                ))}
              </div>
              <Link to="/blog" className="mt-6 inline-block text-[14px] font-semibold text-accent hover:underline">
                All articles →
              </Link>
            </section>
          )}
        </article>

        {toc.length > 0 && (
          <aside className="hidden xl:block">
            <div className="sticky top-28">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">In this article</p>
              <TocList toc={toc} />
            </div>
          </aside>
        )}
      </div>
    </BlogBackdrop>
  );
}

function TocList({ toc }) {
  return (
    <ol className="mt-3 space-y-2 border-l border-white/10 text-[13px]">
      {toc.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 leading-snug text-slate-400 transition-colors hover:border-accent hover:text-white">
            {t.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** A 2px bar under the navbar that fills as you read. Writes to the DOM directly: a re-render per scroll event is waste. */
function ReadingProgress() {
  const bar = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, el.scrollTop / max) : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed left-0 right-0 z-[60] h-0.5" style={{ top: 'var(--tg-promo-h, 0px)' }} aria-hidden>
      <div ref={bar} className="bv-progress h-full bg-accent" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}
