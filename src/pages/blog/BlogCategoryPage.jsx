import { Link, useParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { SITE } from '../../lib/publicRoutes';
import { categoryFor, categoryIndexable, categoryPath, plannedIn, postsIn } from '../../content/blog/posts';
import { BlogBackdrop, CategoryNav, PlannedCard, PostCard } from '../../components/blog/BlogBits';
import NotFoundPage from '../NotFoundPage';

/**
 * /blog/category/:category. NOINDEX until the category holds enough posts to
 * be more than a duplicate of its one article's card (see MIN_POSTS_TO_INDEX).
 * publicRoutes.js reads the same predicate to keep it out of the sitemap, so
 * the two cannot disagree.
 */
export default function BlogCategoryPage() {
  const { category } = useParams();
  const cat = categoryFor(category);
  if (!cat) return <NotFoundPage />;
  return <CategoryView cat={cat} />;
}

function CategoryView({ cat }) {
  const posts = postsIn(cat.slug);
  const planned = plannedIn(cat.slug);

  useSEO({
    title: `${cat.name} — Crypto Trading Blog`,
    description: `${cat.blurb} Guides for Indian crypto futures traders from TradeGuardX.`,
    url: `${SITE}${categoryPath(cat.slug)}`,
    noindex: !categoryIndexable(cat.slug),
  });

  return (
    <BlogBackdrop>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-24">
        <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
          <Link to="/blog" className="hover:text-slate-300">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">{cat.name}</span>
        </nav>
        <header className="mt-5 max-w-3xl">
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">{cat.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">{cat.blurb}</p>
        </header>

        <div className="mt-10">
          <CategoryNav active={cat.slug} />
        </div>

        {posts.length > 0 ? (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${cat.name} articles`}>
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </section>
        ) : (
          <p className="mt-10 max-w-xl text-[15px] leading-relaxed text-slate-400">
            The first article in this topic is being written. Until then, the{' '}
            <Link to="/blog/daily-loss-limit-crypto-futures" className="text-accent hover:underline">
              daily loss limit guide
            </Link>{' '}
            is the best place to start.
          </p>
        )}

        {planned.length > 0 && (
          <section className="mt-14" aria-labelledby="planned">
            <h2 id="planned" className="font-display text-xl font-bold text-white">Next in {cat.name.toLowerCase()}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planned.map((p) => (
                <PlannedCard key={p.title} item={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </BlogBackdrop>
  );
}
