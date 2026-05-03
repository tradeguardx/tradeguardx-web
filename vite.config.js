import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prerender from '@prerenderer/rollup-plugin';

// Public, statically-renderable routes. Auth-gated routes (`/dashboard`,
// `/influencer`) are deliberately excluded — Puppeteer would land on the
// login redirect and snapshot that, which is worse than letting the SPA
// render normally on first visit. Dynamic routes like `/help/:slug` would
// need an explicit slug enumeration; skipping for now.
const PRERENDER_ROUTES = [
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/support',
  '/beta-traders',
  '/privacy',
  '/terms',
  '/refund',
  '/risk-disclosure',
  '/partner-with-us',
  '/help',
  '/help/getting-started',
  '/help/pairing',
  '/help/setting-your-first-rule',
  '/help/common-issues',
  '/help/account-questions',
  '/security',
  '/roadmap',
];

export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: PRERENDER_ROUTES,
      renderer: '@prerenderer/renderer-puppeteer',
      rendererOptions: {
        // App.jsx has an artificial 1.2s loader timeout before BrowserRouter
        // mounts. Wait long enough for that to clear plus initial paint.
        renderAfterTime: 2500,
        maxConcurrentRoutes: 4,
        headless: true,
      },
      postProcess(rendered) {
        // Strip noisy script/style attribute mismatches that cause hydration
        // warnings if we ever switch to hydrateRoot. Currently we use
        // createRoot so this is defensive.
        rendered.html = rendered.html
          .replace(/<script (?:type="module" )?crossorigin="" /g, '<script type="module" crossorigin ');
        return rendered;
      },
    }),
  ],
});
