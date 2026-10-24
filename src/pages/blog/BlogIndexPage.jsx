import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { SITE } from '../../lib/publicRoutes';
import { CATEGORIES, PLANNED, POSTS, categoryPath, postPath, postsIn } from '../../content/blog/posts';
import { BlogBackdrop, CategoryNav, PlannedCard, PostCard } from '../../components/blog/BlogBits';

/**
 * /blog. Leads with the newest post as a feature, then the categories as
 * doors, then what is being written next. While the blog is young the
 * "in the works" list is most of the page — that is deliberate: it shows a
 * returning reader there is a plan, without pretending unwritten posts exist.
 */
export default function BlogIndexPage() {
  const [lead, ...rest] = POSTS;

  useSEO({
    title: 'Crypto Futures Risk Management Blog for Indian Traders',
    rawTitle: true,
    description:
      'Daily loss limits, overtrading, revenge trading and leverage, explained for Indian crypto futures traders. Calculators, worked rupee examples, no hype.',
    url: `${SITE}/blog`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'TradeGuardX Blog',
      url: `${SITE}/blog`,
      inLanguage: 'en-IN',
      blogPost: POSTS.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${SITE}${postPath(p.slug)}`,
        datePublished: p.published,
        dateModified: p.updated,
      })),
    },
  });

  return (
    <BlogBackdrop>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-24">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">TradeGuardX Blog</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Risk management for crypto futures traders
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Most accounts aren’t lost on a bad setup. They’re lost on the fourth trade of a bad morning. These guides
            are about that part: limits, leverage and the habits that keep a losing day small. Written for Indian
            traders, in rupees.
          </p>
        </header>

        <div className="mt-10">
          <CategoryNav active={null} />
        </div>

        {lead && (
          <section className="mt-8" aria-label="Latest article">
            <PostCard post={lead} big />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="More articles">
            {rest.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </section>
        )}

        <section className="mt-20" aria-labelledby="topics">
          <h2 id="topics" className="font-display text-2xl font-bold text-white">Browse by topic</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const n = postsIn(c.slug).length;
              return (
                <Link
                  key={c.slug}
                  to={categoryPath(c.slug)}
                  className="group rounded-2xl border px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-white/20"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <p className="flex items-center justify-between">
                    <span className="font-display text-[17px] font-bold text-white group-hover:text-accent">{c.name}</span>
                    <span className="text-[12px] text-slate-500">{n ? `${n} article${n > 1 ? 's' : ''}` : 'Coming soon'}</span>
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{c.blurb}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-20" aria-labelledby="next">
          <h2 id="next" className="font-display text-2xl font-bold text-white">Being written now</h2>
          <p className="mt-2 text-[15px] text-slate-400">One at a time, each researched properly. These are next.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLANNED.slice(0, 6).map((p) => (
              <PlannedCard key={p.title} item={p} />
            ))}
          </div>
        </section>
      </div>
    </BlogBackdrop>
  );
}
