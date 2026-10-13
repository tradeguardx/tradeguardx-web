import { sx } from '../dashboard/shell/sx';
import { ago, istDay, LABEL, moneyOf } from './revengeFormat';

/**
 * The parts of setup's unlocked card that make someone want the rest:
 * their three worst numbers, the last time it happened, and the questions
 * the full report answers. Every figure is the server's; when one is
 * missing its piece is left out, never guessed.
 */

/** Three tiles: how often, how bad a day got, how much of the loss it was. */
export function DamageStrip({ report, periodLabel, delay = 0 }) {
  const money = moneyOf(report.currency);
  const cost = report.checks?.find((c) => c.id === 'cost' && c.value != null && c.value > 0);
  const tiles = [
    report.revengeTrades > 0 && { big: String(report.revengeTrades), small: `revenge trade${report.revengeTrades === 1 ? '' : 's'}`, sub: periodLabel ? `in the last ${periodLabel}` : null },
    report.worstDay?.pnl < 0 && { big: money(report.worstDay.pnl, { signed: true }), small: 'your worst day', sub: istDay(`${report.worstDay.date}T06:30:00Z`) },
    cost && { big: `${Math.round(cost.value)}%`, small: 'of your losses', sub: 'came from revenge trades' },
  ].filter(Boolean);
  if (!tiles.length) return null;
  return (
    <div style={sx('position:relative;margin:22px auto 0;max-width:640px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px')}>
      {tiles.map((t, i) => (
        <div key={t.small} className="rv-in" style={sx('padding:14px 12px 13px;border-radius:14px;border:1px solid var(--red-line, var(--line));background:var(--red-tint)', { animationDelay: `${delay + i * 0.12}s` })}>
          <div style={sx("font:700 26px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:var(--red);font-variant-numeric:tabular-nums")}>{t.big}</div>
          <div style={sx('margin-top:7px;font-size:12.5px;font-weight:700;color:var(--ink)')}>{t.small}</div>
          {t.sub && <div style={sx('margin-top:2px;font-size:11.5px;color:var(--ink-3)')}>{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** The most recent revenge moment the report found, replayed. */
export function LastTime({ report, delay = 0 }) {
  const money = moneyOf(report.currency);
  const latest = (report.checks ?? [])
    .filter((c) => c.id === 'reentry' || c.id === 'sameCoin')
    .flatMap((c) => c.evidence ?? [])
    .filter((e) => e?.at && e.at.length > 10)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (!latest) return null;
  return (
    <div className="rv-in" style={sx('position:relative;margin:12px auto 0;max-width:640px;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px dashed var(--line-strong);background:var(--surface-2);text-align:left', { animationDelay: `${delay}s` })}>
      <span aria-hidden className="rv-motion" style={sx('flex:none;width:9px;height:9px;border-radius:50%;background:var(--red);animation:rvBlink 1.6s ease-in-out infinite')} />
      <span style={sx('flex:1;min-width:0')}>
        <span style={sx(`${LABEL};display:block`)}>The last time it happened · {ago(latest.at)}</span>
        <span style={sx('display:block;margin-top:5px;font-size:13px;line-height:1.45;color:var(--ink-2)')}>{latest.text}</span>
      </span>
      {latest.pnl != null && (
        <span style={sx('flex:none;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums', { color: latest.pnl < 0 ? 'var(--red)' : 'var(--mint)' })}>{money(latest.pnl, { signed: true })}</span>
      )}
    </div>
  );
}

/** Honest urgency: the guard is off, so the next one is not stopped. */
export function GuardOffLine({ delay = 0 }) {
  return (
    <div className="rv-in" style={sx('position:relative;margin-top:20px;display:inline-flex;align-items:center;gap:9px;padding:8px 14px;border-radius:999px;background:var(--red-tint);color:var(--ink);font-size:12.5px;font-weight:600;line-height:1.35;text-align:left', { animationDelay: `${delay}s` })}>
      <span aria-hidden className="rv-motion" style={sx('flex:none;width:8px;height:8px;border-radius:50%;background:var(--red);animation:rvBlink 1.2s ease-in-out infinite')} />
      <span><b style={sx('color:var(--red)')}>Your guard is off.</b> If it happens again today, nothing stops it.</span>
    </div>
  );
}

/** Questions the full report answers — the answer stays behind the tap. */
export function MoreInReport({ report, onOpen, delay = 0 }) {
  const p = report.profile ?? {};
  const s = report.streaks ?? {};
  const qs = [
    p.worstTime && 'Your worst hour to trade',
    p.worstSymbol && 'The coin that costs you most',
    s.longestLoss && 'Your longest losing streak',
    report.worstDay && 'Your worst day, trade by trade',
  ].filter(Boolean);
  if (!qs.length) return null;
  return (
    <div className="rv-in" style={sx('position:relative;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)', { animationDelay: `${delay}s` })}>
      <span style={sx(LABEL)}>Also in your report</span>
      <div style={sx('margin-top:10px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap')}>
        {qs.map((q) => (
          <button key={q} type="button" onClick={onOpen} className="rv-q" style={sx('display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border-radius:12px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer')}>
            {q} <span aria-hidden style={sx('color:var(--mint)')}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
