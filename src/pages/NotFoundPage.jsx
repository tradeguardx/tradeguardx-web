import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * 404 page. Replaces the previous catch-all `<Navigate to="/" replace />`
 * which silently redirected unknown URLs — bad for SEO (Google saw soft-404s
 * as 200 home page). This page renders with a meta noindex so search engines
 * don't index it, and gives users a friendly recovery path.
 */
export default function NotFoundPage() {
  useSEO({
    title: 'Page not found',
    description: "The page you're looking for doesn't exist. Try the links below or head home.",
    url: 'https://tradeguardx.com/404',
  });

  // Add noindex for this page so it doesn't get indexed.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(244,63,94,0.05), transparent 65%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative max-w-lg text-center"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#fb7185' }}>
          404 · Not found
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-white md:text-6xl">
          That page doesn't exist
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-400">
          The link might be broken, or the page might have moved. Try one of these instead.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-[#07090f] transition hover:bg-accent/90"
          >
            Back to home
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/[0.15] hover:text-white"
          >
            See pricing
          </Link>
          <Link
            to="/help"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/[0.15] hover:text-white"
          >
            Read the docs
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Found a broken link? Email{' '}
          <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
            support@tradeguardx.com
          </a>{' '}
          and we'll fix it.
        </p>
      </motion.div>
    </div>
  );
}
