import { describe, expect, it } from 'vitest';
import { MIN_FOR_RATING, REVIEW_FAQ, buildReviewsSchema } from './reviewsSchema';

const rv = (id, rating, extra = {}) => ({ id, rating, body: 'It works and it annoys me in the right way.', title: null, displayName: `User ${id}`, createdAt: '2026-10-25T08:00:00Z', hidden: null, ...extra });
const nodes = (s) => s['@graph'];
const app = (s) => nodes(s).find((n) => n['@type'] === 'SoftwareApplication');

describe('reviews page schema', () => {
  it('always has the page, breadcrumb and FAQ, matching the visible FAQ', () => {
    const s = buildReviewsSchema(null);
    expect(nodes(s).map((n) => [].concat(n['@type'])[0])).toEqual(['WebPage', 'BreadcrumbList', 'FAQPage']);
    const faq = nodes(s).find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity.map((q) => q.name)).toEqual(REVIEW_FAQ.map((f) => f.q));
  });

  it(`adds no rating until there are ${MIN_FOR_RATING} published reviews`, () => {
    const s = buildReviewsSchema({ stats: { count: 2, average: 5, hidden: 0 }, reviews: [rv('a', 5), rv('b', 5)] });
    expect(app(s)).toBeUndefined();
  });

  it('marks up the product (same @id as the site-wide schema), never the organisation', () => {
    const s = buildReviewsSchema({ stats: { count: 3, average: 3.7, hidden: 1 }, reviews: [rv('a', 5), rv('b', 2), rv('c', 4)] });
    expect(app(s)['@id']).toBe('https://tradeguardx.com/#software');
    expect(nodes(s).some((n) => n['@type'] === 'Organization')).toBe(false);
    expect(app(s).aggregateRating).toMatchObject({ ratingValue: 3.7, reviewCount: 3, bestRating: 5, worstRating: 1 });
  });

  it('keeps low ratings in, and leaves hidden reviews out', () => {
    const s = buildReviewsSchema({
      stats: { count: 3, average: 3.7, hidden: 1 },
      reviews: [rv('a', 5), rv('b', 1), rv('h', null, { hidden: { reason: 'Spam or advertising' }, body: null }), rv('c', 4)],
    });
    const ids = app(s).review.map((r) => r['@id']);
    expect(ids).toContain('https://tradeguardx.com/reviews#review-b');
    expect(ids.some((i) => i.endsWith('review-h'))).toBe(false);
  });
});
