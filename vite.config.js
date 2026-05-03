import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prerender from '@prerenderer/rollup-plugin';

// Public, statically-renderable routes. Auth-gated routes (`/dashboard`,
// `/influencer`) are deliberately excluded — Puppeteer would land on the
// login redirect and snapshot that, which is worse than letting the SPA
// render normally on first visit. Help slug pages enumerated explicitly.
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

// Vercel's build environment (Amazon Linux 2023) doesn't ship the system
// libs Puppeteer's bundled Chromium needs (libnspr4, libnss3, libdrm, etc.).
// On Vercel we swap in @sparticuz/chromium, which bundles a serverless-
// friendly Chromium binary that doesn't need those system deps. Locally we
// keep the default (Puppeteer downloads its own Chromium via npm install).
async function getLaunchOptions() {
  if (!process.env.VERCEL) return undefined;
  const { default: chromium } = await import('@sparticuz/chromium');
  return {
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  };
}

export default defineConfig(async () => {
  const launchOptions = await getLaunchOptions();

  return {
    plugins: [
      react(),
      prerender({
        routes: PRERENDER_ROUTES,
        renderer: '@prerenderer/renderer-puppeteer',
        rendererOptions: {
          renderAfterTime: 2500,
          maxConcurrentRoutes: 4,
          headless: true,
          ...(launchOptions ? { launchOptions } : {}),
        },
        postProcess(rendered) {
          // Strip noisy script attribute mismatches that would cause
          // hydration warnings if we ever switch to hydrateRoot. Currently
          // we use createRoot so this is defensive.
          rendered.html = rendered.html.replace(
            /<script (?:type="module" )?crossorigin="" /g,
            '<script type="module" crossorigin '
          );
          return rendered;
        },
      }),
    ],
  };
});
