/**
 * Shared by the revenge report page, the setup step and the locked preview.
 * Every figure comes from the server (trade-service services/revengeReport);
 * this only formats it.
 */

export const PERIODS = [
  { months: 1, label: '1 month' },
  { months: 2, label: '2 months' },
  { months: 3, label: '3 months' },
];

export const GRADE = {
  calm: { label: 'Calm', tone: 'mint' },
  someTilt: { label: 'Some tilt', tone: 'amber' },
  revengeProne: { label: 'Revenge-prone', tone: 'amber' },
  onTilt: { label: 'On tilt', tone: 'red' },
};

export const STATUS = {
  good: { label: 'Good', tone: 'mint' },
  warning: { label: 'Warning', tone: 'amber' },
  problem: { label: 'Problem', tone: 'red' },
  na: { label: 'Nothing to judge', tone: 'neutral' },
};

export const RULE_NAME = {
  'close-after-losses': 'Close after N losses',
  'risk-per-trade': 'Risk per trade',
  'daily-loss': 'Daily loss limit',
  'max-trades-day': 'Max trades per day',
};

export const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)';
export const LABEL = "font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)";
export const GRID = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px';

export const toneFg = (t) => (t === 'neutral' ? 'var(--ink-3)' : `var(--${t})`);
export const toneBg = (t) => (t === 'neutral' ? 'var(--surface-2)' : `var(--${t}-tint)`);

export function moneyOf(currency) {
  const cur = String(currency || '').toUpperCase();
  const sym = cur === 'INR' ? '₹' : cur === 'USD' ? '$' : '';
  return (n, { signed = false } = {}) => {
    if (n == null || !Number.isFinite(n)) return '—';
    const a = Math.abs(n);
    const body = cur !== 'INR' && a < 100
      ? a.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(a).toLocaleString('en-IN');
    const sign = signed ? (n < 0 ? '−' : '+') : n < 0 ? '−' : '';
    return `${sign}${sym}${body}`;
  };
}

export const ist = (iso, opts) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts }) : '');
export const istDay = (iso) => ist(iso, { day: 'numeric', month: 'short' });
export const istTime = (iso) => ist(iso, { hour: '2-digit', minute: '2-digit', hour12: false });

export function ago(iso, now = Date.now()) {
  if (!iso) return null;
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** The period a snapshot actually covered, as the 1/2/3-month picker reads it. */
export const monthsForDays = (days) => (days >= 90 ? 3 : days >= 60 ? 2 : 1);

/**
 * What the locked page shows, blurred, behind "Unlock your report". Made-up
 * numbers that are never readable — only the shape of what is coming.
 */
export const DEMO_REPORT = {
  currency: 'INR', trades: 64, enoughData: true, minTrades: 10, score: 41, grade: 'revengeProne',
  verdict: 'Losses regularly pull you back in.', revengeTrades: 14, insights: ['When you win, you win ₹2,400 a streak. When you lose, you lose ₹3,900 a streak.'],
  profile: { wins: 28, losses: 33, breakeven: 3, winRate: 45.9, netPnl: -12840, avgWin: 1820, avgLoss: 2210, rr: 0.82, expectancy: -362, biggestWin: { pnl: 6100, symbol: 'BTCUSD', at: '2026-09-21T10:00:00Z' }, biggestLoss: { pnl: -7400, symbol: 'ETHUSD', at: '2026-09-28T16:00:00Z' }, bestTime: { label: '09:00–12:00', trades: 14, pnl: 8200, winRate: 64 }, worstTime: { label: '21:00–24:00', trades: 17, pnl: -14100, winRate: 24 }, bestSymbol: { label: 'BTCUSD', trades: 22, pnl: 5400, winRate: 55 }, worstSymbol: { label: 'ETHUSD', trades: 19, pnl: -11600, winRate: 32 } },
  streaks: { longestWin: { length: 5, pnl: 7300, to: '2026-09-21T10:00:00Z' }, longestLoss: { length: 7, pnl: -13200, to: '2026-09-28T16:00:00Z' }, avgWinLength: 2.1, avgWinPnl: 2400, avgLossLength: 2.6, avgLossPnl: -3900 },
  checks: [
    { id: 'reentry', title: 'Re-entry speed after a loss', weight: 25, status: 'problem', value: 48, unit: '%', finding: 'After 16 of your 33 losing trades, you opened a new trade within 15 minutes.', evidence: [], fix: { rule: 'close-after-losses', text: '' } },
    { id: 'sizeUp', title: 'Size after a loss', weight: 20, status: 'warning', value: 1.4, unit: 'x', finding: 'Right after a loss, your trades are 1.4× your usual size.', evidence: [], fix: { rule: 'risk-per-trade', text: '' } },
    { id: 'tiltDays', title: 'Tilt days', weight: 15, status: 'problem', value: 4, unit: 'days', finding: 'On 4 days, the trades after your first loss made the day worse.', evidence: [], fix: { rule: 'daily-loss', text: '' } },
  ],
  worstDay: null,
};
