/**
 * JSON-LD for /reviews.
 *
 * Reviews are marked up on the PRODUCT (the site-wide SoftwareApplication,
 * same @id as index.html so Google merges the two), not on the Organization.
 * Google's self-serving rule bars review stars for LocalBusiness/Organization
 * reviewed on its own site; software apps are a supported review-snippet type.
 *
 * Every number comes from the server's stats over ALL published reviews, so the
 * markup matches what the page shows. Hidden reviews are never marked up. No
 * rating markup until MIN_FOR_RATING reviews exist: one review is not an average.
 */
export const SITE = 'https://tradeguardx.com';
export const MIN_FOR_RATING = 3;
const MAX_REVIEWS_IN_SCHEMA = 10;

export const REVIEW_FAQ = [
  {
    q: 'Are TradeGuardX reviews real?',
    a: 'Yes. You can only leave a review after connecting an exchange account to TradeGuardX, and every review shows which exchange that person trades on. Reviews go live the moment they are posted, with no approval step.',
  },
  {
    q: 'Can TradeGuardX delete negative reviews?',
    a: 'No. We can hide a review only for abuse, spam, someone else’s personal information, being off-topic, or a legal request, and a hidden review stays on the page with that reason shown. Only the person who wrote a review can delete it.',
  },
  {
    q: 'Does TradeGuardX pay for reviews?',
    a: 'No. We don’t offer discounts, free months or anything else in return for a review.',
  },
  {
    q: 'Who can leave a review?',
    a: 'Anyone who has connected an exchange key to TradeGuardX, including people who have since stopped using it. Their reviews are the ones a new trader most needs to read.',
  },
  {
    q: 'Is TradeGuardX safe to connect to my exchange?',
    a: 'TradeGuardX uses an API key that can read and trade but cannot withdraw, so your funds stay in your own exchange wallet. On exchanges that support it, the key is locked to our server’s fixed IP address, and it is encrypted before it is stored.',
  },
];

export function buildReviewsSchema(data) {
  const url = `${SITE}/reviews`;
  const graph = [
    {
      '@type': ['WebPage', 'CollectionPage'],
      '@id': `${url}#webpage`,
      url,
      name: 'TradeGuardX reviews',
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${SITE}/#software` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Reviews', item: url },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: REVIEW_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  const stats = data?.stats;
  const published = (data?.reviews ?? []).filter((r) => !r.hidden && r.rating && r.body);
  if (stats && stats.count >= MIN_FOR_RATING && stats.average) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/#software`,
      name: 'TradeGuardX',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: SITE,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: stats.average,
        reviewCount: stats.count,
        bestRating: 5,
        worstRating: 1,
      },
      review: published.slice(0, MAX_REVIEWS_IN_SCHEMA).map((r) => ({
        '@type': 'Review',
        '@id': `${url}#review-${r.id}`,
        author: { '@type': 'Person', name: r.displayName },
        datePublished: r.createdAt?.slice(0, 10),
        ...(r.title ? { name: r.title } : {}),
        reviewBody: r.body,
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
