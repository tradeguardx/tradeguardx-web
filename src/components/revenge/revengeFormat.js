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
