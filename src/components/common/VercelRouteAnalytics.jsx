import { Analytics } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';

/** Tracks SPA navigations (React Router) for Vercel Web Analytics. */
export default function VercelRouteAnalytics() {
  const { pathname, search } = useLocation();
  return <Analytics path={pathname + search} route={pathname} />;
}
