import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sx } from '../dashboard/shell/sx';
import { CARD, LABEL, RULE_NAME, STATUS, userDay, userTime, toneBg, toneFg } from './revengeFormat';

/**
 * The revenge report's keyframes, once per screen. Scoped `rv-` names so
 * nothing leaks into the rest of the dashboard. Reduced motion: no movement
 * at all, everything simply appears.
 */
export function RevengeStyles() {
  return (
    <style>{`
@keyframes rvFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rvUnblur{from{filter:blur(14px);opacity:.35}to{filter:blur(0);opacity:1}}
@keyframes rvSweep{to{transform:rotate(360deg)}}
@keyframes rvBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
@keyframes rvPulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes rvBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes rvShine{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes rvPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
.rv-in{animation:rvFadeUp .55s cubic-bezier(.2,.7,.2,1) both}
.rv-unblur{animation:rvUnblur .9s cubic-bezier(.2,.7,.2,1) both}
.rv-pop{animation:rvPop .5s cubic-bezier(.2,.7,.2,1) both}
@media (prefers-reduced-motion: reduce){.rv-in,.rv-unblur,.rv-pop{animation:none!important}.rv-motion{animation:none!important}}
.rv-show-sm{display:none}
@media (max-width:560px){
  .rv-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
  .rv-stat{padding:12px 13px!important}
  .rv-stat__v{font-size:17px!important;margin-top:8px!important}
  .rv-pad{padding:22px 16px!important}
  .rv-full-sm{width:100%}
  .rv-hide-sm{display:none}
  .rv-show-sm{display:inline}
  .rv-check-weight{display:none}
  .rv-score-head{flex-direction:column;text-align:center;gap:16px!important;padding:22px 16px!important}
  .rv-score-head__meta{justify-content:center}
}
`}</style>
  );
}

export function Chip({ tone, children }) {
  return (
    <span style={sx("flex:none;display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;font:700 10.5px/1.2 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase", { background: toneBg(tone), color: toneFg(tone) })}>
      {children}
    </span>
  );
}

/** Counts up to `score` when `animate`, so the reveal lands on the number. */
export function ScoreRing({ score, tone, animate = false, size = 132 }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(animate && !reduce ? 0 : score ?? 0);
  useEffect(() => {
    if (!animate || reduce || score == null) return undefined;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 1100);
      setShown(Math.round(score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, reduce, score]);
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(100, animate ? shown : score));
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" role="img" aria-label={score == null ? 'No score' : `Revenge score ${score} out of 100`} style={{ flex: 'none' }}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
      <circle cx="66" cy="66" r={r} fill="none" stroke={score == null ? 'var(--surface-3)' : toneFg(tone)} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 66 66)" />
      <text x="66" y="64" textAnchor="middle" style={{ font: "600 36px 'Space Grotesk',sans-serif", fill: 'var(--ink)' }}>{score == null ? '—' : animate ? shown : score}</text>
      <text x="66" y="86" textAnchor="middle" style={{ font: "500 11px 'JetBrains Mono',monospace", fill: 'var(--ink-faint)', letterSpacing: '.1em' }}>OF 100</text>
    </svg>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="rv-stat" style={sx(`padding:16px 17px;${CARD};min-width:0`)}>
      <div style={sx(LABEL)}>{label}</div>
      <div className="rv-stat__v" style={sx("margin-top:10px;font:600 21px/1.15 'Space Grotesk',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere", { color: tone ? toneFg(tone) : 'var(--ink)' })}>{value}</div>
      {sub && <div style={sx('margin-top:6px;font-size:12px;line-height:1.45;color:var(--ink-3)')}>{sub}</div>}
    </div>
  );
}

export function Section({ title, note, children, className, style }) {
  return (
    <section className={className} style={sx('margin-top:26px', style)}>
      <div style={sx('display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:11px')}>
        <h2 style={sx("margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.015em")}>{title}</h2>
        {note && <span style={sx('font-size:12.5px;color:var(--ink-3)')}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function CheckCard({ check, money }) {
  const [open, setOpen] = useState(check.status === 'problem');
  const st = STATUS[check.status] ?? STATUS.na;
  const value = check.value == null ? null : check.unit === '%' ? `${Math.round(check.value)}%` : check.unit === 'x' ? `${check.value}×` : `${check.value} day${check.value === 1 ? '' : 's'}`;
  return (
    <div style={sx(`${CARD};overflow:hidden`, { borderLeft: `3px solid ${toneFg(st.tone)}` })}>
      <div style={sx('padding:16px 18px')}>
        <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
          <Chip tone={st.tone}>{st.label}</Chip>
          <span style={sx('font-size:14.5px;font-weight:700;letter-spacing:-.005em')}>{check.title}</span>
          <span style={{ flex: 1 }} />
          {value && <span style={sx("font:600 15px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: toneFg(st.tone) })}>{value}</span>}
          <span className="rv-check-weight" style={sx('font-size:11.5px;color:var(--ink-faint)')}>{check.weight}% of score</span>
        </div>
        <p style={sx('margin:9px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>{check.finding}</p>

        {check.evidence?.length > 0 && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={sx('margin-top:10px;padding:0;border:0;background:none;color:var(--ink-3);font-size:12.5px;font-weight:600;cursor:pointer')}>
              {open ? 'Hide the trades' : `Show the trades (${check.evidence.length})`}
            </button>
            {open && (
              <ul style={sx('margin:9px 0 0;padding:0;list-style:none;display:grid;gap:6px')}>
                {check.evidence.map((e, i) => (
                  <li key={i} style={sx('display:flex;gap:10px;align-items:baseline;padding:8px 11px;border-radius:10px;background:var(--surface-2);font-size:12.5px;line-height:1.45')}>
                    <span style={sx("flex:none;font:500 11px/1.4 'JetBrains Mono',monospace;color:var(--ink-faint)")}>{e.at.length === 10 ? e.at.slice(5) : `${userDay(e.at)} ${userTime(e.at)}`}</span>
                    <span style={sx('flex:1;min-width:0;color:var(--ink-2)')}>{e.text}</span>
                    {e.pnl != null && <span style={sx('flex:none;font-weight:700;font-variant-numeric:tabular-nums', { color: e.pnl < 0 ? 'var(--red)' : 'var(--mint)' })}>{money(e.pnl, { signed: true })}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {check.status !== 'good' && check.status !== 'na' && check.fix?.text && (
        <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 18px;border-top:1px solid var(--line);background:var(--surface-2)')}>
          <span style={sx('flex:1;min-width:min(240px,100%);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
            <b style={sx('color:var(--ink)')}>Fix: </b>{check.fix.text}
          </span>
          <Link to="/dashboard/rules" style={sx('flex:none;padding:7px 12px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none')}>
            Set up {RULE_NAME[check.fix.rule] ?? 'this rule'}
          </Link>
        </div>
      )}
    </div>
  );
}
