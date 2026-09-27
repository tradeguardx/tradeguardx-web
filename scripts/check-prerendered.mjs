/**
 * Runs AFTER `vite build` and checks the HTML that was actually produced.
 *
 * gen-sitemap.mjs checks that the route table and the manifest agree. It
 * cannot check what a page renders, because it runs before the build. That gap
 * is where a real bug lived: /privacy, /terms and /refund never called useSEO
 * at all, so they inherited index.html's head — the homepage title, the
 * homepage description and, the expensive one, the homepage canonical. Three
 * URLs in the submitted sitemap were telling Google they were duplicates of
 * "/", which drops them from the index on the first crawl. Nothing in the repo
 * would have said so; the pages looked fine and the build passed.
 *
 * Every submitted URL must, in its own prerendered file:
 *   - exist at all
 *   - carry a canonical that points at itself
 *   - not be noindex
 *   - have a title that is not the site-wide default
 *
 * Fails the build rather than warning, because a warning at the end of a build
 * log is a warning nobody reads.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE, SITEMAP_ROUTES } from '../src/lib/publicRoutes.js';

const DIST = path.resolve(import.meta.dirname, '../dist');
const DEFAULT_TITLE = "India's First Crypto Trading Kill Switch — TradeGuardX";

const pick = (html, re) => (html.match(re) || [])[1];

async function main() {
  const problems = [];

  for (const { path: route } of SITEMAP_ROUTES) {
    const file = path.join(DIST, route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`);

    let html;
    try {
      html = await fs.readFile(file, 'utf8');
    } catch {
      problems.push(`${route} is in the sitemap but was not prerendered (${path.relative(DIST, file)} missing). A crawler gets the SPA shell.`);
      continue;
    }

    const canonical = pick(html, /rel="canonical" href="([^"]*)"/);
    const title = pick(html, /<title>([^<]*)<\/title>/);
    const expected = `${SITE}${route === '/' ? '' : route}`;

    if (!canonical) {
      problems.push(`${route} has no canonical link.`);
    } else if (canonical.replace(/\/$/, '') !== expected.replace(/\/$/, '')) {
      problems.push(
        `${route} canonicalises to ${canonical} instead of itself. A submitted URL that points its canonical somewhere else asks Google to drop it.`,
      );
    }

    if (/name="robots" content="[^"]*noindex/.test(html)) {
      problems.push(`${route} is noindex but is in the sitemap. Pick one.`);
    }

    if (!title) {
      problems.push(`${route} has no <title>.`);
    } else if (title === DEFAULT_TITLE && route !== '/') {
      problems.push(`${route} still has the site-wide default title — it is not calling useSEO, so its description and canonical are the homepage's too.`);
    }
  }

  if (problems.length) {
    console.error('\n✖ prerender check failed:\n');
    for (const p of problems) console.error(`  • ${p}`);
    console.error('');
    process.exit(1);
  }

  console.log(`✔ prerender check — ${SITEMAP_ROUTES.length} submitted URLs, each self-canonical and indexable`);
}

await main();
