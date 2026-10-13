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

const RULE_RANK = { problem: 0, warning: 1, good: 2, na: 3 };
// Calm traders still get a plan: the two rules that keep a calm month calm.
const BASELINE = ['daily-loss', 'risk-per-trade'];

/**
 * The rules this report asks for — one per rule, worst finding first, each
 * with the checks it answers. Every word comes from the server's own `fix`
 * on each check; nothing here invents a setting or a saving.
 */
export function rulesFrom(report) {
  const checks = [...(report?.checks ?? [])].sort((a, b) => RULE_RANK[a.status] - RULE_RANK[b.status] || b.weight - a.weight);
  const byRule = new Map();
  for (const c of checks) {
    if (!c.fix?.rule || (c.status !== 'problem' && c.status !== 'warning')) continue;
    const r = byRule.get(c.fix.rule) ?? { rule: c.fix.rule, text: c.fix.text, status: c.status, because: [], proof: proofOf(c) };
    r.because.push(c.title);
    byRule.set(c.fix.rule, r);
  }
  if (byRule.size) return { calm: false, rules: [...byRule.values()] };
  const rules = BASELINE.map((rule) => {
    const c = checks.find((x) => x.fix?.rule === rule);
    return c ? { rule, text: c.fix.text, status: 'good', because: [], proof: null } : null;
  }).filter(Boolean);
  return { calm: true, rules };
}

/* The trader's own number behind a rule, from the worst check it answers —
   the server's measured value, worded the way its finding words it. */
const PROOF = {
  reentry: (v) => [`${Math.round(v)}%`, 'of your losses, you traded again within 15 minutes'],
  sizeUp: (v) => [`${v}×`, 'your usual size, right after a loss'],
  sameCoin: (v) => [`${Math.round(v)}%`, 'of your losses, you went straight back into the same coin'],
  streaks: (v) => [`${Math.round(v)}%`, 'of the time, you kept trading after 2 losses in a row'],
  tiltDays: (v) => [String(v), v === 1 ? 'day where trading after a loss made it worse' : 'days where trading after a loss made them worse'],
  cost: (v) => [`${Math.round(v)}%`, 'of everything you lost came from revenge trades'],
};
export function proofOf(check) {
  if (check?.value == null || !PROOF[check.id]) return null;
  const [big, caption] = PROOF[check.id](check.value);
  return { big, caption };
}
