/**
 * Who sees the review popup, and when. Pure, so it is tested on its own
 * (ReviewPrompt.test.jsx). See ReviewPrompt.jsx for the reasoning.
 */
export const MIN_DAYS = 3;
export const SKIP_PATHS = ['/dashboard/setup', '/dashboard/review', '/dashboard/account/billing'];
const DAY = 86_400_000;

/** Local calendar day, e.g. "2026-11-24". */
export const dayOf = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const askedToday = (memo, now) => memo.lastDay === dayOf(now);

export function shouldAsk({ me, memo, now, pathname }) {
  if (!me?.eligible || me.review) return false;
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return false;
  const since = me.traderSince ? Date.parse(me.traderSince) : NaN;
  if (!Number.isFinite(since) || now - since < MIN_DAYS * DAY) return false;
  if (memo.never) return false;
  if (askedToday(memo, now)) return false;
  return true;
}
