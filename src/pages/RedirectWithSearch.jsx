import { Navigate, useLocation } from 'react-router-dom';

/** Preserves ?query when redirecting legacy dashboard paths. */
export default function RedirectWithSearch({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}
