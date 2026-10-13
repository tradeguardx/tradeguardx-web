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
 *
 * Kept short — a headline, one compact card per rule carrying the trader's
 * own number, and the ask on one row. It stands out by the accent (tinted
 * panel, accent border, glow), in the page's own theme, so it reads as the
 * offer on both light and dark. When the ask is the trial (`cta.trial`),
 * hovering its button slides every rule's switch on.
 * `cta` — { label, onClick } or { label, to }, `note`, `trial`.
 */
export default function RulePlan({ report, cta, enterProps = {} }) {
  const { calm, rules } = rulesFrom(report);
  if (!rules.length) return null;
  const n = rules.length;
  const switches = Boolean(cta?.trial);
  /* Honest: the trial switches the guard on; each rule is still set on the
     Rules page. Nothing here says the trial creates them. */
  const label = switches ? 'Start my 3-day free trial →' : cta?.label;
  const lead = !calm && report.revengeTrades > 0
    ? <><span style={sx('color:var(--red)')}>{report.revengeTrades} revenge trade{report.revengeTrades === 1 ? '' : 's'}.</span> {n === 1 ? 'One rule' : `${n} rules`} stop them.</>
    : calm ? 'Keep it this way with two rules' : `${n === 1 ? 'One rule' : `${n} rules`} that stop this`;
  const btn = 'flex:none;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;padding:11px 20px;border:0;border-radius:12px;background:var(--mint-solid);color:var(--on-mint);font-size:14.5px;font-weight:800;text-decoration:none;cursor:pointer;box-shadow:var(--glow-mint);white-space:nowrap';
  const btnInner = <>{switches && <Power />}{label}</>;

  return (
    <section {...enterProps} className={`rv-plan ${enterProps.className ?? ''}`} style={sx('margin-top:28px;border:1px solid var(--mint-line);border-radius:18px;overflow:hidden;position:relative;color:var(--ink);box-shadow:var(--glow-mint),var(--shadow-card)', { background: 'linear-gradient(180deg,var(--mint-tint),transparent 70%),var(--surface)', ...(enterProps.style ?? {}) })}>
      <div style={sx('position:relative;padding:18px 20px 0')}>
        <span style={sx(LABEL)}>{calm ? 'Your rule plan' : 'Your rule plan · picked from your trades'}</span>
        <h2 style={sx("margin:7px 0 0;font:600 20px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{lead}</h2>
      </div>

      {/* 1 to 4 rules side by side — whatever this trader's checks call for. */}
      <ol className="rv-rules" style={sx('position:relative;margin:14px 0 0;padding:0 20px;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px')}>
        {rules.map((r, i) => <RuleCard key={r.rule} r={r} n={i + 1} switches={switches} />)}
      </ol>

      {cta ? (
        <div style={sx('position:relative;margin-top:16px;padding:14px 20px 16px;border-top:1px solid var(--mint-line);display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
          <p style={sx('flex:1;min-width:min(260px,100%);margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)')}>
            <b style={sx('color:var(--ink)')}>TradeGuardX runs {n === 1 ? 'this' : 'these'} on your exchange account</b> — every trade, even on a bad day.
            {cta.note && <span style={sx('display:block;margin-top:2px;font-size:11.5px;color:var(--ink-3)')}>{cta.note}</span>}
          </p>
          {cta.to
            ? <Link to={cta.to} className="rv-plan__cta" style={sx(btn)}>{btnInner}</Link>
            : <button type="button" onClick={cta.onClick} className="rv-plan__cta" style={sx(btn)}>{btnInner}</button>}
        </div>
      ) : <div style={sx('height:18px')} />}
    </section>
  );
}

const TONE = { problem: 'red', warning: 'amber', good: 'mint' };
const SEVERITY = { problem: 'Problem', warning: 'Warning', good: 'Safety net' };
// One picture per rule, so a row of cards reads at a glance.
const RULE_ICON = {
  'close-after-losses': 'M10 9v6M14 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'risk-per-trade': 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0zM8 21h8',
  'daily-loss': 'M8 3v3M16 3v3M4 9h16M5 5h14v15H5zM10 14.5h4',
  'max-trades-day': 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
};

function RuleCard({ r, n, switches }) {
  const tone = TONE[r.status] ?? 'mint';
  return (
    <li className="rv-rule rv-in" title={whatItDoes(r.text)} style={sx('position:relative;display:flex;flex-direction:column;gap:9px;min-width:0;padding:13px 14px;border-radius:13px;border:1px solid var(--line);background:var(--surface);overflow:hidden', { animationDelay: `${0.1 + n * 0.08}s` })}>
      <span aria-hidden style={sx('position:absolute;left:0;top:0;bottom:0;width:3px', { background: toneFg(tone) })} />
      <span style={sx('display:flex;align-items:center;gap:10px')}>
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:10px', { background: toneBg(tone), color: toneFg(tone) })}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={RULE_ICON[r.rule] ?? RULE_ICON['daily-loss']} /></svg>
        </span>
        <span style={sx('flex:1;min-width:0')}>
          <span style={sx("display:block;font:600 15px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.01em;color:var(--ink)")}>{RULE_NAME[r.rule] ?? r.rule}</span>
          <span style={sx("display:block;margin-top:3px;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase", { color: toneFg(tone) })}>{SEVERITY[r.status] ?? SEVERITY.good}</span>
        </span>
        {switches && (
          <span className="rv-toggle" role="img" aria-label="Not running — your guard is off">
            <span className="rv-toggle__knob" />
          </span>
        )}
      </span>
      {/* Why it's here: their own number, in one line. */}
      <span style={sx('display:flex;align-items:baseline;gap:8px;font-size:12px;line-height:1.35;color:var(--ink-2)')}>
        {r.proof ? (
          <>
            <b style={sx("flex:none;font:700 17px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: toneFg(tone) })}>{r.proof.big}</b>
            <span>{r.proof.caption}</span>
          </>
        ) : <span>{whatItDoes(r.text)}</span>}
      </span>
    </li>
  );
}

function Power() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v8M6.4 7a8 8 0 1011.2 0" />
    </svg>
  );
}

function Shield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
