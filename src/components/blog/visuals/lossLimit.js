/*
 * The method from the daily-loss-limit article, as functions:
 *   1R          = capital × risk per trade
 *   daily limit = R × losing trades allowed
 *   runway      = back-to-back max-loss days before the account is down 20%,
 *                 with each day's limit taken on that morning's balance:
 *                 floor(ln 0.8 / ln(1 − d))
 *
 * The verdict bands are the article's argument, not a universal truth, and the
 * copy under the gauge says why each band is called what it is. blog.test.jsx
 * pins these to the numbers quoted in the article text.
 */
export function computeLimit({ capital, riskPct, losses }) {
  const r = capital * (riskPct / 100);
  const limit = r * losses;
  const d = limit / capital;
  const runway = d > 0 && d < 1 ? Math.floor(Math.log(0.8) / Math.log(1 - d)) : 0;
  return { r, limit, pct: d * 100, runway, warnAt: limit * 0.6 };
}

export function verdictFor(pct) {
  if (pct < 1) return { label: 'Tight', color: '#f59e0b', note: 'Likely to fire on fees and ordinary noise. Fine for a new strategy; restrictive for an established one.' };
  if (pct <= 3) return { label: 'Balanced', color: '#00d4aa', note: 'Room for a normal losing streak, and still a long runway before real damage.' };
  if (pct <= 5) return { label: 'Loose', color: '#f59e0b', note: 'A handful of bad days does serious damage. Common in prop-firm rules, which also cap the account as a whole.' };
  return { label: 'Too wide', color: '#f43f5e', note: 'At this size the limit only fires after the day is already a disaster. Lower the risk per trade before anything else.' };
}
