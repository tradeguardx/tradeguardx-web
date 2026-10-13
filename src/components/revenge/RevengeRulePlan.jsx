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

      {/* Side by side: 1 to 4 rules, whatever this trader's checks call for —
          three across on a desktop, one per row on a phone. */}
      <ol className="rv-rules" style={sx('position:relative;margin:18px 0 0;padding:0 22px;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,232px),1fr));gap:12px')}>
        {rules.map((r, i) => <RuleCard key={r.rule} r={r} n={i + 1} />)}
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

const TONE = { problem: 'red', warning: 'amber', good: 'mint' };
const SEVERITY = { problem: 'Fixes a problem', warning: 'Fixes a warning', good: 'Safety net' };
// One picture per rule, so a row of cards reads at a glance.
const RULE_ICON = {
  'close-after-losses': 'M10 9v6M14 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'risk-per-trade': 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0zM8 21h8',
  'daily-loss': 'M8 3v3M16 3v3M4 9h16M5 5h14v15H5zM10 14.5l4 0',
  'max-trades-day': 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
};

function RuleCard({ r, n }) {
  const tone = TONE[r.status] ?? 'mint';
  return (
    <li className="rv-rule rv-in" style={sx('position:relative;display:flex;flex-direction:column;min-width:0;padding:18px 18px 16px;border-radius:16px;border:1px solid var(--line);background:var(--surface);overflow:hidden', { animationDelay: `${0.1 + n * 0.08}s` })}>
      <span aria-hidden style={sx('position:absolute;left:0;right:0;top:0;height:3px', { background: toneFg(tone) })} />
      <span style={sx('display:flex;align-items:center;gap:10px')}>
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:12px', { background: toneBg(tone), color: toneFg(tone) })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={RULE_ICON[r.rule] ?? RULE_ICON['daily-loss']} /></svg>
        </span>
        <span style={sx("flex:1;min-width:0;font:600 10px/1.2 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase", { color: toneFg(tone) })}>
          {SEVERITY[r.status] ?? SEVERITY.good}
        </span>
        <span aria-hidden style={sx("flex:none;font:600 22px/1 'Space Grotesk',sans-serif;color:var(--line-strong)")}>{String(n).padStart(2, '0')}</span>
      </span>

      <span style={sx("display:block;margin-top:14px;font:600 17px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.015em;color:var(--ink)")}>{RULE_NAME[r.rule] ?? r.rule}</span>
      <span style={sx('display:block;margin-top:6px;font-size:13px;line-height:1.55;color:var(--ink-2)')}>{whatItDoes(r.text)}</span>

      <span style={sx('flex:1;min-height:14px')} />
      <span style={sx('display:block;padding-top:12px;border-top:1px dashed var(--line)')}>
        {r.because.length > 0 ? (
          <>
            <span style={sx(`${LABEL};display:block;margin-bottom:8px`)}>Fixes</span>
            <span style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
              {r.because.map((b) => (
                <span key={b} style={sx('padding:5px 9px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font-size:11.5px;font-weight:600;line-height:1.2;color:var(--ink-2)')}>{b}</span>
              ))}
            </span>
          </>
        ) : (
          <span style={sx('font-size:12px;line-height:1.45;color:var(--ink-3)')}>Holds the line on your worst day.</span>
        )}
      </span>
    </li>
  );
}

function Shield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
