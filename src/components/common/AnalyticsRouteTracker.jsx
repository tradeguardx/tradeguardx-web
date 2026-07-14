import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../../lib/analytics';

/**
 * Emits a `pageview` to our own analytics service on every SPA navigation
 * (React Router). No-op unless VITE_ANALYTICS_INGEST_URL is set. Sits alongside
 * VercelRouteAnalytics — Vercel for quick stats, this for the owned funnel.
 */
export default function AnalyticsRouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
