import { resolveAmount } from '../components/dashboard/RuleStatusCards';

/**
 * Session selector — one source for today's figures.
 *
 * Given the live account row and the rules bundle, returns session P&L, the
 * loss limit, the profit target, and budget used. Everything on Overview and
 * Live guard that shows one of these reads it from here.
 */
export function ruleConfig(bundle, slug) {
  const inst = (bundle?.instances ?? bundle?.rules ?? []).find((r) => r.templateSlug === slug && r.enabled !== false);
  return inst?.config ?? null;
}

export function sessionOf(live, bundle) {
  if (!live) return { pnl: null, lossLimit: null, target: null, budgetUsed: 0, budgetPct: null, dayBase: null };
  const dp = live.dailyPnl;
  const dse = live.dailyStartingEquity;
  const ce = live.currentEquity;
  const pnl = dp != null ? dp : dse != null && ce != null ? ce - dse : null;
  const dayBase = dp != null && ce != null ? ce - dp : dse != null ? dse : live.accountSize;

  const lossLimit = resolveAmount(ruleConfig(bundle, 'daily-loss'), dayBase, 'dailyLossAmount', 'dailyLossPct');
  const target = resolveAmount(ruleConfig(bundle, 'daily-profit-target'), dayBase, 'dailyTargetAmount', 'dailyTargetPct');
  const drawdown = pnl != null && pnl < 0 ? -pnl : 0;
  const budgetPct = lossLimit && lossLimit > 0 ? Math.min((drawdown / lossLimit) * 100, 100) : null;

  return { pnl, lossLimit, target, budgetUsed: drawdown, budgetPct, dayBase, currency: live.accountCurrency || 'USD' };
}

/**
 * The symbol for an account's settlement currency.
 *
 * Exported because rule templates ship a hardcoded "$" prefix from the
 * database — one template serves every account — and the only thing that knows
 * an account settles in rupees is the account. Shark settles in INR: without
 * this, its daily-loss limit renders "$500" for a number the engine enforces
 * as ₹500, which is not a cosmetic difference at roughly eighty to one.
 */
export function currencySymbol(currency) {
  return currency === 'INR' ? '₹' : '$';
}

export function fmtMoney(v, currency = 'USD', { sign = false, decimals = 2 } = {}) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  // Anything that rounds to zero is zero — never a signed "−$0.00".
  const num = Math.abs(Number(v)) < 0.5 * 10 ** -decimals ? 0 : Number(v);
  const abs = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const sym = currencySymbol(currency);
  const s = num < 0 ? '−' : sign && num > 0 ? '+' : '';
  return `${s}${sym}${abs}`;
}

/** Split "1,234.56" into ["1,234", "56"] so the decimal can render small. */
export function splitDecimal(formatted) {
  const i = formatted.lastIndexOf('.');
  if (i < 0) return [formatted, null];
  return [formatted.slice(0, i), formatted.slice(i + 1)];
}
