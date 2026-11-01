import { sx } from './sx';

/**
 * A step list for a phone: "Step 5 of 5 · Start free trial" over five slim
 * segments. Five numbered steps with connectors do not fit a 390px screen —
 * they wrapped, and lost their labels — so under 560px the full list hides
 * (.steps-lg) and this shows (.steps-sm). Tokens only: follows theme and accent.
 */
export default function StepsBar({ names, at, done = [], style }) {
  return (
    <div className="steps-sm" style={sx('margin:0 0 18px', style ?? {})}>
      <div style={sx("font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)")}>
        Step {at + 1} of {names.length} · <span style={sx('color:var(--ink)')}>{names[at]}</span>
      </div>
      <ol aria-label="Setup progress" style={sx('margin:10px 0 0;padding:0;list-style:none;display:flex;gap:5px')}>
        {names.map((name, i) => {
          const isDone = done[i] && i !== at;
          const here = i === at;
          return (
            <li key={name} aria-current={here ? 'step' : undefined} style={sx('flex:1;height:5px;border-radius:999px', { background: isDone ? 'var(--mint-solid)' : here ? 'var(--mint)' : 'var(--surface-3)', opacity: here && !isDone ? 0.55 : 1 })}>
              <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>{name}{isDone ? ' — done' : here ? ' — current' : ''}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
