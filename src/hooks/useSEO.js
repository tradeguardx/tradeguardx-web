import { useEffect } from 'react';

const SITE_NAME = 'TradeGuardX';
const DEFAULT_TITLE = "India's First Crypto Trading Kill Switch — TradeGuardX";
const DEFAULT_DESC = "India's first crypto trading kill switch for Delta Exchange. Block new orders, close open positions, and lock your account the moment you break your daily-loss or risk limits.";
const DEFAULT_URL = 'https://tradeguardx.com';
const DEFAULT_IMAGE = 'https://tradeguardx.com/og-image.png';
const DEFAULT_IMAGE_ALT =
  "TradeGuardX — India's first crypto trading kill switch for Delta Exchange and CoinDCX";

const PAGE_SCHEMA_ID = 'page-schema';
const PAGE_ROBOTS_ID = 'page-robots';

function setMeta(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

/**
 * noindex for a page that must resolve but must never rank: the soft-404 for an
 * unknown /help slug, and /home-classic (a second copy of the homepage).
 *
 * This is a separate <meta id="page-robots"> rather than a rewrite of the
 * site-wide `robots` tag in index.html, because the prerenderer snapshots the
 * DOM per route — mutating the shared tag would leave whichever route rendered
 * last holding the wrong value in its own HTML file.
 */
function setPageRobots(noindex) {
  document.getElementById(PAGE_ROBOTS_ID)?.remove();
  if (!noindex) return;
  const meta = document.createElement('meta');
  meta.id = PAGE_ROBOTS_ID;
  meta.name = 'robots';
  meta.content = 'noindex, follow';
  document.head.appendChild(meta);
}

function setPageSchema(jsonLd) {
  document.getElementById(PAGE_SCHEMA_ID)?.remove();
  if (!jsonLd) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = PAGE_SCHEMA_ID;
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

/**
 * Updates page title and meta tags for the current route.
 * @param {object} options
 * @param {string} [options.title] — page-level title; " — TradeGuardX" appended automatically
 * @param {string} [options.description] — page-level description (max ~155 chars)
 * @param {string} [options.url] — canonical URL for this page (full https://... URL)
 * @param {string} [options.image] — absolute og:image URL for this page (1200x630).
 *   Falls back to the site-wide card. A page pointing at an image that does not
 *   exist yet gets NO preview card at all, which is worse than a generic one —
 *   so unshipped artwork must fall back here rather than 404.
 * @param {string} [options.imageAlt] — alt text for that image.
 * @param {boolean} [options.noindex] — keep the page crawlable but out of the index.
 * @param {boolean} [options.rawTitle] — use `title` verbatim instead of appending
 *   " — TradeGuardX". Needed where the brand suffix would push the title tag past
 *   the ~60 chars Google renders, which is every venue page.
 * @param {object} [options.jsonLd] — page-specific JSON-LD; injected as a separate
 *   `<script id="page-schema">` and removed on route change. Site-wide schemas
 *   (Organization, WebSite, SoftwareApplication) live in index.html and stay put.
 */
export function useSEO({ title, description, url, image, imageAlt, noindex, rawTitle, jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? (rawTitle ? title : `${title} — ${SITE_NAME}`) : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const pageUrl = url || DEFAULT_URL;
    const img = image || DEFAULT_IMAGE;
    const imgAlt = imageAlt || DEFAULT_IMAGE_ALT;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', pageUrl);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[property="og:image"]', img);
    setMeta('meta[property="og:image:alt"]', imgAlt);
    setMeta('meta[name="twitter:image"]', img);
    setMeta('meta[name="twitter:image:alt"]', imgAlt);

    const canonical = document.getElementById('canonical');
    if (canonical) canonical.setAttribute('href', pageUrl);

    setPageSchema(jsonLd);
    setPageRobots(noindex);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', DEFAULT_DESC);
      setMeta('meta[property="og:title"]', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', DEFAULT_DESC);
      setMeta('meta[property="og:url"]', DEFAULT_URL);
      setMeta('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', DEFAULT_DESC);
      setMeta('meta[property="og:image"]', DEFAULT_IMAGE);
      setMeta('meta[property="og:image:alt"]', DEFAULT_IMAGE_ALT);
      setMeta('meta[name="twitter:image"]', DEFAULT_IMAGE);
      setMeta('meta[name="twitter:image:alt"]', DEFAULT_IMAGE_ALT);
      const canon = document.getElementById('canonical');
      if (canon) canon.setAttribute('href', DEFAULT_URL);
      setPageSchema(null);
      setPageRobots(false);
    };
  }, [title, description, url, image, imageAlt, noindex, rawTitle, jsonLd]);
}
