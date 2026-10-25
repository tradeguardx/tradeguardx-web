import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { listPublicReviews } from '../../api/reviewsApi';
import ReviewCard from '../../components/reviews/ReviewCard';
import { StarRow } from '../../components/reviews/Stars';
import '../../components/reviews/reviews.css';
import { REVIEW_FAQ, buildReviewsSchema } from './reviewsSchema';

/**
 * /reviews — every review, as written.
 *
 * SEO: reviews are marked up on the SoftwareApplication (see reviewsSchema.js
 * for why the product and not the Organization), from the UNFILTERED first
 * load so a visitor's filter never changes what the page tells Google. The
 * prerender snapshots whatever the API returns at build time; the visible FAQ
 * and its FAQPage markup come from one array so they cannot disagree.
 *
 * The FAQ (reviewsSchema.js) states the policy enforced in the referral
 * service (src/reviews/review.ts). If one changes, change both.
 */
const PAGE = 20;

export default function ReviewsPage() {
  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const jsonLd = useMemo(() => buildReviewsSchema(baseline), [baseline]);

  useSEO({
    title: 'TradeGuardX Reviews from Verified Crypto Traders',
    rawTitle: true,
    description:
      'Is TradeGuardX legit? Read unfiltered reviews from traders who connected Delta Exchange, CoinDCX or Shark Exchange. Every review published as written.',
    url: 'https://tradeguardx.com/reviews',
    jsonLd,
  });

  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [exchange, setExchange] = useState('');
  const [rating, setRating] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    listPublicReviews({ exchange, rating, limit: PAGE, offset: 0, signal: ctrl.signal })
      .then((res) => {
        setError('');
        setData(res);
        setItems(res.reviews);
        if (!exchange && !rating) setBaseline(res);
      })
      .catch((e) => e?.name !== 'AbortError' && setError('Reviews couldn’t load just now. Try again in a minute.'));
    return () => ctrl.abort();
  }, [exchange, rating]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const res = await listPublicReviews({ exchange, rating, limit: PAGE, offset: items.length });
      setData(res);
      setItems((prev) => [...prev, ...res.reviews]);
    } finally {
      setLoadingMore(false);
    }
  };

  const stats = data?.stats;
  const max = stats ? Math.max(1, ...Object.values(stats.histogram)) : 1;

  return (
    <div className="rvw relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]" style={{ background: 'radial-gradient(ellipse, rgba(245,179,1,0.06), transparent 65%)' }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6">
        <header className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Reviews</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">What traders say, unfiltered</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            Every review here is from someone who connected a real exchange account, and every one is published as
            they wrote it. Including the ones we don’t enjoy reading.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Summary + filters */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rvw-card" style={{ padding: 20 }}>
              {stats ? (
                <>
                  <div className="flex items-end gap-3">
                    <span className="font-display text-5xl font-bold text-white">{stats.average ?? '–'}</span>
                    <div className="pb-1.5">
                      {stats.average ? <StarRow value={Math.round(stats.average)} size={18} /> : null}
                      <p className="mt-1 text-[12.5px] text-slate-500">
                        {stats.count} review{stats.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {[5, 4, 3, 2, 1].map((n, i) => {
                      const c = stats.histogram[n] ?? 0;
                      const on = rating === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(on ? 0 : n)}
                          aria-pressed={on}
                          className={`grid w-full grid-cols-[2.2rem_1fr_2rem] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[12.5px] transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                        >
                          <span className="text-slate-300">{n} ★</span>
                          <span className="h-2 rounded-full bg-white/[0.06]">
                            {c > 0 && <span className="rvw-bar block" style={{ width: `${(c / max) * 100}%`, '--d': `${i * 0.08}s` }} />}
                          </span>
                          <span className="text-right text-slate-500">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                  {stats.hidden > 0 && (
                    <p className="mt-4 text-[12.5px] text-slate-500">
                      {stats.hidden} hidden, each with its reason shown below. Not counted in the average.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-slate-500">{error || 'Loading…'}</p>
              )}
            </div>

            {data?.exchanges?.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Exchange</p>
                <div className="flex flex-wrap gap-2">
                  {[{ name: '', count: null }, ...data.exchanges].map((e) => (
                    <button
                      key={e.name || 'all'}
                      type="button"
                      onClick={() => setExchange(e.name)}
                      aria-pressed={exchange === e.name}
                      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        exchange === e.name ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {e.name || 'All'}
                      {e.count != null && <span className="ml-1 opacity-60">{e.count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Link
              to="/dashboard/review"
              className="block rounded-2xl border px-5 py-4 transition-colors hover:border-white/20"
              style={{ borderColor: 'rgba(0,212,170,.3)', background: 'rgba(0,212,170,.05)' }}
            >
              <p className="text-[14px] font-bold text-white">Trade with TradeGuardX?</p>
              <p className="mt-1 text-[13px] text-slate-400">Leave your review. It goes up as written. →</p>
            </Link>
          </aside>

          {/* The reviews */}
          <section aria-labelledby="all-reviews">
            <h2 id="all-reviews" className="mb-4 font-display text-lg font-bold text-white">
              {data?.total ? `All ${data.total} review${data.total === 1 ? '' : 's'}` : 'All reviews'}
            </h2>
            {(rating || exchange) && (
              <p className="mb-4 text-[13px] text-slate-400">
                Showing {data?.total ?? 0} {rating ? `${rating}-star ` : ''}review{data?.total === 1 ? '' : 's'}
                {exchange ? ` from ${exchange} traders` : ''}.{' '}
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => { setRating(0); setExchange(''); }}>
                  Show all
                </button>
              </p>
            )}

            {data && items.length === 0 && (
              <div className="rvw-card" style={{ padding: 24 }}>
                <p className="text-[16px] font-bold text-white">{rating || exchange ? 'Nothing here yet.' : 'No reviews yet.'}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-400">
                  {rating || exchange
                    ? 'Try another filter.'
                    : 'We’re new, and we’d rather show an empty page than a made-up one. If you trade with us, yours can be the first.'}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {items.map((r, i) => (
                <ReviewCard key={r.id} review={r} delay={Math.min(i % PAGE, 8) * 0.06} />
              ))}
            </div>

            {data && items.length < data.total && (
              <button
                type="button"
                onClick={more}
                disabled={loadingMore}
                className="mt-6 w-full rounded-xl border border-white/10 py-3 text-[14px] font-semibold text-slate-300 transition-colors hover:border-white/20 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Show more (${data.total - items.length} left)`}
              </button>
            )}

            <div className="mt-14">
              <h2 className="font-display text-xl font-bold text-white">Questions about these reviews</h2>
              <div className="mt-4 space-y-3">
                {REVIEW_FAQ.map((f) => (
                  <details key={f.q} className="group rounded-xl border px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-semibold text-slate-100 marker:hidden">
                      {f.q}
                      <span className="mt-0.5 text-accent transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
                      {f.a}
                      {f.q.startsWith('Is TradeGuardX safe') && (
                        <>
                          {' '}
                          <Link to="/security" className="text-accent hover:underline">How we store and scope your key →</Link>
                        </>
                      )}
                    </p>
                  </details>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] text-slate-500">
                Think a review shouldn’t be here, or that we got one wrong? Email{' '}
                <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">support@tradeguardx.com</a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
