import { useEffect } from 'react';

const SITE_NAME = 'TradeGuardX';
const DEFAULT_TITLE = 'TradeGuardX — Protect Every Trade Automatically';
const DEFAULT_DESC = 'Enforce daily loss limits, drawdown rules, and hedging prevention in real time. Built for prop traders and self-funded accounts.';
const DEFAULT_URL = 'https://tradeguardx.com';

const PAGE_SCHEMA_ID = 'page-schema';

function setMeta(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
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
 * @param {object} [options.jsonLd] — page-specific JSON-LD; injected as a separate
 *   `<script id="page-schema">` and removed on route change. Site-wide schemas
 *   (Organization, WebSite, SoftwareApplication) live in index.html and stay put.
 */
export function useSEO({ title, description, url, jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const pageUrl = url || DEFAULT_URL;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', pageUrl);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);

    const canonical = document.getElementById('canonical');
    if (canonical) canonical.setAttribute('href', pageUrl);

    setPageSchema(jsonLd);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', DEFAULT_DESC);
      setMeta('meta[property="og:title"]', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', DEFAULT_DESC);
      setMeta('meta[property="og:url"]', DEFAULT_URL);
      setMeta('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', DEFAULT_DESC);
      const canon = document.getElementById('canonical');
      if (canon) canon.setAttribute('href', DEFAULT_URL);
      setPageSchema(null);
    };
  }, [title, description, url, jsonLd]);
}
