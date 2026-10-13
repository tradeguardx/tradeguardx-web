import { Link } from 'react-router-dom';
import { sx } from '../dashboard/shell/sx';
import { CARD, LABEL, RULE_NAME, rulesFrom, toneBg, toneFg } from './revengeFormat';

// "Close after N losses: stop trading…" → "Stop trading…"
const whatItDoes = (text) => {
  const i = text?.indexOf(': ') ?? -1;
  const s = i > 0 ? text.slice(i + 2) : text ?? '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Just the names, for the short unlocked card in setup. */
export function RuleChips({ report }) {
  const { rules } = rulesFrom(report);
  if (!rules.length) return null;
  return (
    <div style={sx('display:flex;flex-direction:column;align-items:center;gap:9px')}>
      <span style={sx(LABEL)}>The rules that fix this</span>
      <div style={sx('display:flex;justify-content:center;gap:7px;flex-wrap:wrap')}>
        {rules.map((r) => (
          <span key={r.rule} style={sx('display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;border:1px solid var(--line-strong);background:var(--surface-2);font-size:12.5px;font-weight:700;color:var(--ink)')}>
            <Shield /> {RULE_NAME[r.rule] ?? r.rule}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The end of the report: "here is what to switch on", then the one ask.
 * `cta` — { label, onClick } or { label, to }, plus an optional `note`
 * under it. Without one, the plan stands alone.
 */
export default function RulePlan({ report, cta, enterProps = {} }) {
  const { calm, rules } = rulesFrom(report);
  if (!rules.length) return null;
  const btn = 'display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border:0;border-radius:13px;background:var(--mint-solid);color:#02241d;font-size:15px;font-weight:800;text-decoration:none;cursor:pointer;box-shadow:var(--glow-mint)';
  return (
    <section {...enterProps} style={sx(`margin-top:28px;${CARD};overflow:hidden;position:relative`, enterProps.style ?? {})}>
      <div style={sx('position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 50% at 50% 0%,var(--mint-tint),transparent 70%)')} />
      <div style={sx('position:relative;padding:24px 22px 6px')}>
        <span style={sx(LABEL)}>Your rule plan</span>
        <h2 style={sx("margin:9px 0 0;font:600 22px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>
          {calm ? 'Keep it this way with two rules' : `${rules.length === 1 ? 'One rule' : `${rules.length} rules`} that stop this`}
        </h2>
        <p style={sx('margin:7px 0 0;max-width:60ch;font-size:13.5px;line-height:1.6;color:var(--ink-3)')}>
          {calm
            ? 'You don’t trade on tilt today. Most traders who blow up didn’t either — until one bad day. These two hold the line on that day.'
            : 'Picked from your own trades above. Set them while you’re calm — they hold when you’re not.'}
        </p>
      </div>

      <ol style={sx('position:relative;margin:14px 0 0;padding:0 22px;list-style:none;display:grid;gap:10px')}>
        {rules.map((r, i) => (
          <li key={r.rule} style={sx('display:flex;gap:13px;padding:14px 15px;border-radius:14px;border:1px solid var(--line);background:var(--surface)')}>
            <span style={sx("flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;font:700 13px/1 'Space Grotesk',sans-serif", { background: toneBg(r.status === 'good' ? 'mint' : r.status === 'problem' ? 'red' : 'amber'), color: toneFg(r.status === 'good' ? 'mint' : r.status === 'problem' ? 'red' : 'amber') })}>
              {i + 1}
            </span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:14.5px;font-weight:700;color:var(--ink)')}>{RULE_NAME[r.rule] ?? r.rule}</span>
              <span style={sx('display:block;margin-top:3px;font-size:13px;line-height:1.55;color:var(--ink-2)')}>{whatItDoes(r.text)}</span>
              {r.because.length > 0 && (
                <span style={sx('display:block;margin-top:6px;font-size:12px;line-height:1.45;color:var(--ink-3)')}>
                  Fixes: {r.because.join(' · ')}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {cta && (
        <div style={sx('position:relative;margin-top:18px;padding:20px 22px 22px;border-top:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;align-items:center;text-align:center')}>
          <p style={sx('margin:0 0 14px;max-width:52ch;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>
            <b style={sx('color:var(--ink)')}>TradeGuardX switches these on for your exchange account</b> and enforces them on every trade, on our servers — even when you’re away from the screen, even on a bad day.
          </p>
          {cta.to
            ? <Link to={cta.to} style={sx(btn)}>{cta.label}</Link>
            : <button type="button" onClick={cta.onClick} style={sx(btn)}>{cta.label}</button>}
          {cta.note && <span style={sx('margin-top:9px;font-size:11.5px;color:var(--ink-faint)')}>{cta.note}</span>}
        </div>
      )}
      {!cta && <div style={sx('height:22px')} />}
    </section>
  );
}

function Shield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
