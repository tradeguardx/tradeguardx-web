/* global process */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXCLUDED_ROUTES, PRIVATE_PREFIXES, PUBLIC_ROUTES } from './publicRoutes';

/**
 * THE SPA REWRITE DECIDES WHAT RETURNS 200.
 *
 * vercel.json used to rewrite `/((?!assets/).*)` to index.html — everything
 * except /assets/. So every path on the domain returned 200 with the app
 * shell: a typo'd URL, a dead link, a deleted image. We watched a removed
 * narrative.png come back 200 with content-type text/html and 89,761 bytes,
 * which is index.html wearing a .png name.
 *
 * To a crawler that is a soft 404 — a page that says "not found" in a 200
 * response — and Google treats a site full of them as a site it cannot trust
 * the shape of.
 *
 * The rewrite now names the route segments the app actually owns, so anything
 * else falls through to Vercel's 404.html with a real 404. The cost of that
 * trade is drift: a route added to App.jsx and forgotten here would 404 a live
 * page. This test is what makes that loud instead of silent, anchored to
 * publicRoutes.js — which gen-sitemap.mjs already fails the build over.
 */
// process.cwd() is the project root under vitest; import.meta.url is not a
// file URL in the jsdom environment.
const rewrites = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')).rewrites;

const servedBySpa = (path) => rewrites.some((r) => new RegExp(`^${r.source}$`).test(path));

describe('every route the app owns is still served', () => {
  it('covers every public route in the sitemap source', () => {
    for (const r of PUBLIC_ROUTES) {
      expect(servedBySpa(r.path), `${r.path} would 404`).toBe(true);
    }
  });

  it('covers the routes deliberately kept out of the sitemap', () => {
    // Excluded from indexing is not the same as excluded from existing.
    // /login, /reset-password and the redirect stubs all have to resolve.
    for (const path of Object.keys(EXCLUDED_ROUTES)) {
      expect(servedBySpa(path), `${path} would 404`).toBe(true);
    }
  });

  it('covers the authenticated areas and everything under them', () => {
    for (const prefix of PRIVATE_PREFIXES) {
      expect(servedBySpa(prefix), `${prefix} would 404`).toBe(true);
      expect(servedBySpa(`${prefix}/overview`), `${prefix}/overview would 404`).toBe(true);
    }
    // Dynamic segments the router resolves at runtime, which are never
    // prerendered and so depend entirely on this rewrite.
    expect(servedBySpa('/dashboard/trades/abc-123')).toBe(true);
    expect(servedBySpa('/exchanges/shark/api-key')).toBe(true);
    expect(servedBySpa('/help/kill-switch')).toBe(true);
  });
});

describe('everything else gets a real 404', () => {
  it('does not hand the app shell to an unknown path', () => {
    for (const path of ['/nonsense', '/wp-admin', '/old-landing-page', '/.env']) {
      expect(servedBySpa(path), `${path} should 404`).toBe(false);
    }
  });

  it('does not answer a deleted asset with an HTML page', () => {
    // The exact case this started from: these were removed from public/ and
    // kept returning 200 text/html.
    for (const path of ['/narrative.png', '/story.png', '/vite.svg']) {
      expect(servedBySpa(path), `${path} should 404`).toBe(false);
    }
  });

  it('never swallows a real static asset', () => {
    // These exist on disk and Vercel serves them before any rewrite, but the
    // rewrite must not claim them either.
    for (const path of ['/favicon.svg', '/og-image.png', '/assets/index-abc123.js', '/sitemap.xml', '/robots.txt']) {
      expect(servedBySpa(path), `${path} must not be rewritten`).toBe(false);
    }
  });
});
