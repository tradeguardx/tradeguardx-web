/**
 * Every public URL this site owns, in one list.
 *
 * Three things used to disagree about what the site contains, and all three had
 * to be edited by hand: the route table in App.jsx, PRERENDER_ROUTES in
 * vite.config.js, and public/sitemap.xml. A route added to the first and
 * forgotten in the second is an empty shell to a crawler — the one failure mode
 * that makes an SEO page pointless — and forgotten in the third it is a page
 * nothing links to. This file is the source; the other two read it.
 *
 * `scripts/gen-sitemap.mjs` writes the sitemap from this and FAILS THE BUILD if
 * App.jsx declares a public route that is neither listed here nor explicitly
 * excluded below. "Explicitly" is the point: an unrecognised route is an error,
 * not a silent omission, because silence is how the old sitemap drifted.
 *
 * Plain ESM with no JSX and no React imports — vite.config.js and a bare
 * `node scripts/...` both have to load it.
 */

export const SITE = 'https://tradeguardx.com';

/**
 * Indexable pages. `priority` and `changefreq` are sitemap hints only; Google
 * largely ignores them, so they are set once by page class and not tuned.
 *
 * `og` is this page's share card: a bare filename is served from /og/, and an
 * absolute URL is used as given. The venue cards are absolute because they live
 * in the same Supabase bucket as the connect walkthrough screenshots, and for
 * the same reason — a card that names a venue can be corrected without shipping
 * a build. All three were verified 1200x630 and serving 200 before being listed.
 *
 * Cards that do not exist yet are left null and fall back to the site-wide image
 * in useSEO. A page pointing at a missing image gets no preview card at all,
 * which is worse than a generic one.
 *
 * The venue cards (killswitch-for-*) double as the hero art on their page; the
 * guide cards (og-guide-*) do not, because those pages already open with the
 * venue's own walkthrough screenshots and a second picture above them would
 * push the first instruction below the fold.
 *
 * `sitemap: false` means "prerender it, do not submit it". The only case is
 * /help/how-it-works: /help renders that same first article, so the two paths
 * are one page and the article canonicalises to /help. It still has to be
 * prerendered, because the sidebar links to it and an unprerendered internal
 * link is an empty shell to a crawler — but submitting a non-canonical URL in
 * the sitemap is asking Google to index a duplicate.
 */
export const PUBLIC_ROUTES = [
  // Core
  { path: '/', priority: '1.0', changefreq: 'weekly', og: null },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly', og: null },
  { path: '/signup', priority: '0.8', changefreq: 'monthly', og: null },

  // Venue pages — the reason this file exists. Every venue is reachable by URL
  // with no JS state involved in routing.
  { path: '/exchanges', priority: '0.9', changefreq: 'weekly', og: null },
  { path: '/exchanges/delta', priority: '0.9', changefreq: 'weekly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/killswitch-for-delta-exchange.png' },
  { path: '/exchanges/delta/api-key', priority: '0.7', changefreq: 'monthly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/og-guide-delta.png' },
  { path: '/exchanges/coindcx', priority: '0.9', changefreq: 'weekly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/killswitch-for-coindcx.png' },
  { path: '/exchanges/coindcx/api-key', priority: '0.7', changefreq: 'monthly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/og-guide-coindcx.png' },
  { path: '/exchanges/coindcx/margin', priority: '0.6', changefreq: 'monthly', og: null },
  { path: '/exchanges/shark', priority: '0.9', changefreq: 'weekly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/killswitch-for-shark-exchange.png' },
  { path: '/exchanges/shark/api-key', priority: '0.7', changefreq: 'monthly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/og-guide-shark.png' },
  { path: '/exchanges/bybit', priority: '0.5', changefreq: 'monthly', og: null },
  { path: '/exchanges/bitget', priority: '0.5', changefreq: 'monthly', og: null },

  // Head-term landing pages. Both are indexed under these exact paths — they
  // are NOT moved into /exchanges/, whatever the tidier structure would be.
  { path: '/crypto-kill-switch', priority: '0.9', changefreq: 'monthly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/the-crypto-killswitch-for-indian-traders.png' },
  { path: '/crypto-tax-india', priority: '0.8', changefreq: 'monthly', og: 'https://pniimryjmmqykjmumpbe.supabase.co/storage/v1/object/public/media/og-tax.png' },

  // Help centre — the seven shared articles. Nothing venue-specific lives here
  // any more; that all moved under /exchanges/<venue>/.
  { path: '/help', priority: '0.8', changefreq: 'monthly', og: null },
  { path: '/help/how-it-works', priority: '0.7', changefreq: 'monthly', og: null, sitemap: false },
  { path: '/help/kill-switch', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/help/cooldowns', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/help/rules', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/help/changing-rules', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/help/live-dashboard', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/help/troubleshooting', priority: '0.7', changefreq: 'monthly', og: null },

  // Company
  { path: '/security', priority: '0.7', changefreq: 'monthly', og: null },
  { path: '/roadmap', priority: '0.6', changefreq: 'weekly', og: null },
  { path: '/support', priority: '0.6', changefreq: 'monthly', og: null },
  { path: '/partner-with-us', priority: '0.6', changefreq: 'monthly', og: null },

  // Legal
  { path: '/privacy', priority: '0.3', changefreq: 'yearly', og: null },
  { path: '/terms', priority: '0.3', changefreq: 'yearly', og: null },
  { path: '/refund', priority: '0.3', changefreq: 'yearly', og: null },
  { path: '/risk-disclosure', priority: '0.3', changefreq: 'yearly', og: null },
];

/**
 * Public routes deliberately kept OUT of the sitemap, each with the reason.
 *
 * The reason string is not decoration — it is what stops the next person
 * "fixing" an omission that was a decision. `/login` is the example: it was in
 * the sitemap, and submitting a login form as indexable content invites Google
 * to rank it for the brand name instead of the homepage.
 */
export const EXCLUDED_ROUTES = {
  '/login': 'A login form is not content. Indexing it competes with / for brand queries.',
  '/forgot-password': 'Transactional auth step.',
  '/verify-email': 'Transactional auth step, reached from an email link.',
  '/reset-password': 'Transactional auth step, reached from a tokenised link.',
  '/beta-traders': 'Redirects to /signup.',
  '/beta-testers': 'Redirects to /signup.',
  '/prop-firm': 'Redirects to / — the prop-firm product is not part of this launch.',
  '/docs': 'Redirects to /help.',
  '/docs/:slug': 'Redirects to /help/:slug, keeping the slug. A redirect is not content.',
  '/home-classic': 'A second copy of the homepage. Rendered noindex; kept only as a reference layout.',
};

/**
 * The 301s that back the entries above live in vercel.json, because they have
 * to run at the edge. A client-side <Navigate> is not a redirect to a crawler:
 * it answers 200 with the old URL's content, and Google keeps the old URL as a
 * duplicate of wherever it landed.
 *
 *   /help/getting-started  -> /exchanges     the per-venue guide became three
 *   /docs/getting-started  -> /exchanges     listed first; see below
 *   /docs/:slug            -> /help/:slug    used to drop the slug entirely
 *   /docs                  -> /help
 *
 * Order matters: Vercel matches redirects top to bottom, so
 * /docs/getting-started is listed before /docs/:slug. Without it that URL would
 * 301 to /help/getting-started and then 301 again to /exchanges — a two-hop
 * chain for a URL with one correct destination.
 *
 * This note is here rather than in vercel.json because that file is validated
 * against a schema with `additionalProperties: false`, at the top level AND
 * inside each redirect. JSON has no comments, and a "//" key added as one makes
 * the whole file invalid — Vercel then rejects the deployment before it builds,
 * which looks exactly like a slow deploy and shipped nothing for a day.
 * checkVercelConfig() in scripts/gen-sitemap.mjs now fails the build for it.
 */

/** Route prefixes that are never public at all. */
export const PRIVATE_PREFIXES = ['/dashboard', '/influencer'];

/** Every public path gets a snapshot, including the non-canonical ones. */
export const PRERENDER_ROUTES = PUBLIC_ROUTES.map((r) => r.path);

/** The canonical set, which is what the sitemap submits. */
export const SITEMAP_ROUTES = PUBLIC_ROUTES.filter((r) => r.sitemap !== false);

/** Absolute og:image URL for a route, or undefined to use the site-wide card. */
export function ogImageFor(path) {
  const og = PUBLIC_ROUTES.find((r) => r.path === path)?.og;
  if (!og) return undefined;
  return og.startsWith('http') ? og : `${SITE}/og/${og}`;
}
