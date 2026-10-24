import { sx } from '../dashboard/shell/sx';
import { dateKeyDay, moneyOf } from './revengeFormat';

/**
 * Setup's unlocked card, kept short: their worst numbers in one row, and
 * that the guard is off. The detail is one tap away in the full report. Every figure is the server's; when one is
 * missing its piece is left out, never guessed.
 */

/** Three tiles: how often, how bad a day got, how much of the loss it was. */
export function DamageStrip({ report, periodLabel, delay = 0 }) {
  const money = moneyOf(report.currency);
  const cost = report.checks?.find((c) => c.id === 'cost' && c.value != null && c.value > 0);
  const tiles = [
    report.revengeTrades > 0 && { big: String(report.revengeTrades), small: `revenge trade${report.revengeTrades === 1 ? '' : 's'}`, sub: periodLabel ? `in the last ${periodLabel}` : null },
    report.worstDay?.pnl < 0 && { big: money(report.worstDay.pnl, { signed: true }), small: 'your worst day', sub: dateKeyDay(report.worstDay.date) },
    cost && { big: `${Math.round(cost.value)}%`, small: 'of your losses', sub: 'came from revenge trades' },
  ].filter(Boolean);
  if (!tiles.length) return null;
  return (
    <div style={sx('position:relative;margin:14px auto 0;display:flex;justify-content:center;flex-wrap:wrap;gap:8px')}>
      {tiles.map((t, i) => (
        <span key={t.small} className="rv-in" title={t.sub ?? undefined} style={sx('display:inline-flex;align-items:baseline;gap:7px;padding:7px 12px;border-radius:999px;background:var(--red-tint);font-size:12.5px;color:var(--ink-2)', { animationDelay: `${delay + i * 0.1}s` })}>
          <b style={sx("font:700 15px/1 'Space Grotesk',sans-serif;color:var(--red);font-variant-numeric:tabular-nums")}>{t.big}</b>
          {t.small}{t.sub && t.small === 'your worst day' ? ` · ${t.sub}` : ''}
        </span>
      ))}
    </div>
  );
}

/** Honest urgency: the guard is off, so the next one is not stopped. */
export function GuardOffLine({ delay = 0 }) {
  return (
    <div className="rv-in" style={sx('position:relative;margin-top:12px;text-align:center;color:var(--ink-3);font-size:12px;line-height:1.45', { animationDelay: `${delay}s` })}>
      <span aria-hidden className="rv-motion" style={sx('display:inline-block;vertical-align:middle;margin:-2px 7px 0 0;width:8px;height:8px;border-radius:50%;background:var(--red);animation:rvBlink 1.2s ease-in-out infinite')} />
      <span><b style={sx('color:var(--red);font-weight:700')}>Your guard is off.</b> If it happens again today, nothing stops it.</span>
    </div>
  );
}

