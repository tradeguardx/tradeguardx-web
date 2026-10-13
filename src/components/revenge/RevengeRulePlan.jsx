import { useLayoutEffect, useRef, useState } from 'react';
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
 * Each rule is a card that carries the trader's own number — the reason it
 * is on this list — and a switch, off. When the ask is the trial
 * (`cta.trial`), hovering its button slides every switch on: the plan, seen
 * working, one click before it is. Without `cta`, the plan stands alone.
 * `cta` — { label, onClick } or { label, to }, `note`, `trial`.
 */
export default function RulePlan({ report, cta, enterProps = {} }) {
  const { ref, scope } = useOppositeTheme();
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
  const btn = 'display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:13px 26px;border:0;border-radius:14px;background:var(--mint-solid);color:#02241d;font-size:15.5px;font-weight:800;text-decoration:none;cursor:pointer;box-shadow:var(--glow-mint)';
  const btnInner = <>{switches && <Power />}{label}</>;

  return (
    /* The offer, in the page's opposite theme — a light panel on the dark
       dashboard, a dark one on the light — so it reads as the thing being
       offered, not one more section of the report. */
    <section ref={ref} {...scope} {...enterProps} className={`rv-plan ${enterProps.className ?? ''}`} style={sx(`margin-top:32px;${CARD};overflow:hidden;position:relative;color:var(--ink);box-shadow:0 30px 70px -30px rgba(0,0,0,.55),0 0 0 1px var(--mint-line)`, enterProps.style ?? {})}>
      <div style={sx('position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 50% at 50% 0%,var(--mint-tint),transparent 70%)')} />
      <div style={sx('position:relative;padding:26px 24px 4px')}>
        <span style={sx(LABEL)}>Your rule plan</span>
        <h2 style={sx("margin:10px 0 0;font:600 clamp(21px,2.4vw,25px)/1.2 'Space Grotesk',sans-serif;letter-spacing:-.025em")}>{lead}</h2>
        <p style={sx('margin:8px 0 0;max-width:60ch;font-size:13.5px;line-height:1.6;color:var(--ink-3)')}>
          {calm
            ? 'You don’t trade on tilt today. Most traders who blow up didn’t either — until one bad day. These two hold the line on that day.'
            : 'Each one picked from your own trades above. Set them while you’re calm — they hold when you’re not.'}
        </p>
      </div>

      {/* Side by side: 1 to 4 rules, whatever this trader's checks call for —
          three across on a desktop, one per row on a phone. */}
      <ol className="rv-rules" style={sx('position:relative;margin:20px 0 0;padding:0 24px;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px')}>
        {rules.map((r, i) => <RuleCard key={r.rule} r={r} n={i + 1} switches={switches} />)}
      </ol>

      {cta ? (
        <div style={sx('position:relative;margin-top:22px;padding:24px 24px 26px;border-top:1px solid var(--line);background:var(--surface-2);display:flex;flex-direction:column;align-items:center;text-align:center')}>
          <p style={sx('margin:0 0 16px;max-width:54ch;font-size:13.5px;line-height:1.6;color:var(--ink-2)')}>
            <b style={sx('color:var(--ink)')}>Start your trial and TradeGuardX runs {n === 1 ? 'this rule' : 'these rules'} on your exchange account</b>, on our servers — on every trade, even when you’re away from the screen, even on a bad day.
          </p>
          {cta.to
            ? <Link to={cta.to} className="rv-plan__cta" style={sx(btn)}>{btnInner}</Link>
            : <button type="button" onClick={cta.onClick} className="rv-plan__cta" style={sx(btn)}>{btnInner}</button>}
          {cta.note && <span style={sx('margin-top:10px;font-size:12px;color:var(--ink-3)')}>{cta.note}</span>}
        </div>
      ) : <div style={sx('height:24px')} />}
    </section>
  );
}

/* Flip the nearest dashboard theme for one subtree. The tokens are scoped by
   [data-dash-theme] (and the accent by [data-accent] beside it), so setting
   both on the section re-themes everything inside it. Read before paint; with
   no dashboard above (tests, a bare page) nothing changes. */
function useOppositeTheme() {
  const ref = useRef(null);
  const [scope, setScope] = useState({});
  useLayoutEffect(() => {
    const host = ref.current?.parentElement?.closest('[data-dash-theme]');
    if (!host) return;
    const flipped = host.getAttribute('data-dash-theme') === 'light' ? 'dark' : 'light';
    const accent = host.getAttribute('data-accent');
    setScope({ 'data-dash-theme': flipped, ...(accent ? { 'data-accent': accent } : {}) });
  }, []);
  return { ref, scope };
}

const TONE = { problem: 'red', warning: 'amber', good: 'mint' };
const SEVERITY = { problem: 'Fixes a problem', warning: 'Fixes a warning', good: 'Safety net' };
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
    <li className="rv-rule rv-in" style={sx('position:relative;display:flex;flex-direction:column;min-width:0;padding:18px 18px 16px;border-radius:16px;border:1px solid var(--line);background:var(--surface);overflow:hidden', { animationDelay: `${0.1 + n * 0.08}s` })}>
      <span aria-hidden style={sx('position:absolute;left:0;right:0;top:0;height:3px', { background: toneFg(tone) })} />
      <span aria-hidden style={sx('position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;pointer-events:none;filter:blur(30px);opacity:.55', { background: toneBg(tone) })} />

      <span style={sx('position:relative;display:flex;align-items:center;gap:10px')}>
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:12px', { background: toneBg(tone), color: toneFg(tone) })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={RULE_ICON[r.rule] ?? RULE_ICON['daily-loss']} /></svg>
        </span>
        <span style={sx("flex:1;min-width:0;font:600 10px/1.2 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase", { color: toneFg(tone) })}>
          {SEVERITY[r.status] ?? SEVERITY.good}
        </span>
        {switches && (
          <span className="rv-toggle" role="img" aria-label="Not running — your guard is off">
            <span className="rv-toggle__knob" />
          </span>
        )}
      </span>

      <span style={sx("position:relative;display:block;margin-top:14px;font:600 17px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.015em;color:var(--ink)")}>{RULE_NAME[r.rule] ?? r.rule}</span>
      <span style={sx('position:relative;display:block;margin-top:6px;font-size:13px;line-height:1.55;color:var(--ink-2)')}>{whatItDoes(r.text)}</span>

      <span style={sx('flex:1;min-height:14px')} />

      {/* Why it's here: their own number, then every check it answers. */}
      <span style={sx('position:relative;display:block;padding:13px 14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line)')}>
        {r.proof ? (
          <span style={sx('display:flex;align-items:baseline;gap:10px')}>
            <span style={sx("flex:none;font:700 26px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;font-variant-numeric:tabular-nums", { color: toneFg(tone) })}>{r.proof.big}</span>
            <span style={sx('font-size:12px;line-height:1.4;color:var(--ink-2)')}>{r.proof.caption}</span>
          </span>
        ) : (
          <span style={sx('font-size:12.5px;line-height:1.45;color:var(--ink-2)')}>Holds the line on your worst day.</span>
        )}
        {r.because.length > 0 && (
          <span style={sx('display:flex;flex-wrap:wrap;gap:5px;margin-top:11px')}>
            {r.because.map((b) => (
              <span key={b} style={sx('padding:4px 8px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:11px;font-weight:600;line-height:1.2;color:var(--ink-3)')}>{b}</span>
            ))}
          </span>
        )}
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
