import { useEffect } from 'react';

const SITE_NAME = 'TradeGuardX';
const DEFAULT_TITLE = 'TradeGuardX — Protect Every Trade Automatically';
const DEFAULT_DESC = 'Enforce daily loss limits, drawdown rules, and hedging prevention in real time. Built for prop traders and self-funded accounts.';
const DEFAULT_URL = 'https://tradeguardx.com';

function setMeta(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

/**
 * Updates page title and meta tags for the current route.
 * @param {{ title?: string, description?: string, url?: string }} options
 *   title — page-level title; " — TradeGuardX" is appended automatically
 *   description — page-level description (max ~155 chars)
 *   url — canonical URL for this page (full https://... URL)
 */
export function useSEO({ title, description, url } = {}) {
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
    };
  }, [title, description, url]);
}
