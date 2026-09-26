/**
 * Writes public/sitemap.xml from src/lib/publicRoutes.js, and fails the build if
 * App.jsx and that manifest disagree about what the site contains.
 *
 * The sitemap used to be hand-maintained. It had 23 URLs, one of which was
 * /login, and it listed /help/getting-started as though that were one page when
 * it was three articles sharing a URL. Hand-maintaining a list that has to match
 * a route table is a promise to keep two files in sync forever, and the way that
 * promise breaks is silent: a page ships, nothing links to it, nobody notices
 * for a month.
 *
 * So this runs before `vite build` and THROWS. A route in App.jsx that is
 * neither in PUBLIC_ROUTES nor in EXCLUDED_ROUTES stops the build with the path
 * printed, because the only two acceptable states are "submitted" and
 * "deliberately not submitted, for this reason".
 *
 * Run standalone with: node scripts/gen-sitemap.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SITE,
  PUBLIC_ROUTES,
  SITEMAP_ROUTES,
  EXCLUDED_ROUTES,
  PRIVATE_PREFIXES,
} from '../src/lib/publicRoutes.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'src/App.jsx');
const OUT = path.join(ROOT, 'public/sitemap.xml');

/**
 * Pull the route tree out of App.jsx.
 *
 * Regex rather than a JSX parse: the file is a flat, hand-written list of
 * `<Route path="x" element={...} />` inside two nesting levels, and adding a
 * parser dependency to read it would be more machinery than the problem needs.
 * The trade-off is that this only understands the shape App.jsx actually has —
 * which is why an unrecognised line has to fail loudly rather than be skipped.
 */
async function routesFromApp() {
  const src = await fs.readFile(APP, 'utf8');
  const found = [];

  // Each <Route ...> up to its closing bracket, with the parent it sits under.
  // The public tree is the one whose parent element is <Layout />.
  const layoutStart = src.indexOf('<Route path="/" element={<Layout />}>');
  if (layoutStart === -1) throw new Error('gen-sitemap: could not find the <Layout /> route block in App.jsx');
  const layoutEnd = src.indexOf('</Route>', layoutStart);
  const layoutBlock = src.slice(layoutStart, layoutEnd);

  for (const m of layoutBlock.matchAll(/<Route\s+path="([^"]+)"/g)) {
    found.push(`/${m[1]}`.replace(/\/+/g, '/'));
  }
  // The index route is "/" itself.
  if (/<Route index element=/.test(layoutBlock)) found.push('/');

  return [...new Set(found)];
}

function isPrivate(p) {
  return PRIVATE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * A `:param` route is satisfied by the concrete URLs enumerated for it in the
 * manifest. `/exchanges/:venue` is covered by /exchanges/delta and the rest;
 * what is NOT acceptable is a param route with nothing enumerated under it,
 * which is a whole section of the site invisible to search.
 */
function paramRouteCovered(routePath, manifestPaths) {
  const depth = routePath.split('/').length;
  const prefix = routePath.slice(0, routePath.indexOf('/:'));
  return manifestPaths.some((p) => p.startsWith(`${prefix}/`) && p.split('/').length === depth);
}

async function main() {
  const appRoutes = await routesFromApp();
  const manifestPaths = PUBLIC_ROUTES.map((r) => r.path);
  const problems = [];

  for (const route of appRoutes) {
    if (route === '/*' || route === '*') continue; // catch-all 404
    if (isPrivate(route)) continue;

    // An excluded param route is a redirect, not a section of the site.
    if (route in EXCLUDED_ROUTES) continue;

    if (route.includes('/:')) {
      if (!paramRouteCovered(route, manifestPaths)) {
        problems.push(
          `${route} is a parameterised public route with no concrete URLs in PUBLIC_ROUTES. ` +
            `Enumerate them, or the whole section is unreachable by search.`,
        );
      }
      continue;
    }

    if (manifestPaths.includes(route)) continue;

    problems.push(
      `${route} is a public route in App.jsx but is in neither PUBLIC_ROUTES nor EXCLUDED_ROUTES ` +
        `in src/lib/publicRoutes.js. Add it to one: PUBLIC_ROUTES to submit it, EXCLUDED_ROUTES with a reason to skip it.`,
    );
  }

  // The reverse direction matters just as much: a manifest entry with no route
  // behind it is a sitemap URL that serves the 404 page.
  for (const p of manifestPaths) {
    const segments = p.split('/').filter(Boolean);
    const matched =
      appRoutes.includes(p) ||
      appRoutes.some((r) => {
        const rs = r.split('/').filter(Boolean);
        if (rs.length !== segments.length) return false;
        return rs.every((seg, i) => seg.startsWith(':') || seg === segments[i]);
      });
    if (!matched) problems.push(`${p} is in PUBLIC_ROUTES but no route in App.jsx serves it.`);
  }

  if (problems.length) {
    console.error('\n✖ sitemap check failed:\n');
    for (const p of problems) console.error(`  • ${p}`);
    console.error('');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_ROUTES.map(
    (r) =>
      `  <url>\n` +
      `    <loc>${SITE}${r.path === '/' ? '/' : r.path}</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${r.changefreq}</changefreq>\n` +
      `    <priority>${r.priority}</priority>\n` +
      `  </url>`,
  ).join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- GENERATED by scripts/gen-sitemap.mjs from src/lib/publicRoutes.js. Do not edit by hand. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  await fs.writeFile(OUT, xml);
  console.log(
    `✔ sitemap.xml — ${SITEMAP_ROUTES.length} URLs (${PUBLIC_ROUTES.length} prerendered, ` +
      `${PUBLIC_ROUTES.length - SITEMAP_ROUTES.length} non-canonical, ${Object.keys(EXCLUDED_ROUTES).length} excluded)`,
  );
}

await main();
