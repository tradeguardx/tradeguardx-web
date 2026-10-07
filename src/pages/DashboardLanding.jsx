import { Navigate, useLocation } from 'react-router-dom';
import { useTradingAccounts } from '../context/TradingAccountContext';

/**
 * Where /dashboard actually goes.
 *
 * A user with no trading account has nothing for the Overview to overview —
 * every figure on it is zero, the guard band says "nothing is protected", and
 * the only useful thing on the page is a prompt to go somewhere else. Sending
 * them straight into setup skips a screen whose entire content is "this screen
 * does not apply to you yet".
 *
 * ONLY FROM THE INDEX ROUTE, and only when there are no accounts at all. This
 * is a redirect, not a gate: every other route stays reachable, the sidebar
 * works, and someone who wants to look around can. A setup flow you cannot
 * leave is how people who were merely curious end up stuck, and they do not
 * come back.
 *
 * `accountsLoading` is honoured so a pending fetch never reads as "no
 * accounts" — that would bounce an existing user into setup on every cold
 * load, which is the kind of thing you only hear about from the person it
 * happened to.
 */
export default function DashboardLanding() {
  const { accounts, accountsLoading } = useTradingAccounts();
  const { search } = useLocation();

  if (accountsLoading) return null;

  const hasAccount = Array.isArray(accounts) && accounts.length > 0;
  return <Navigate to={hasAccount ? `/dashboard/overview${search}` : `/dashboard/setup${search}`} replace />;
}
