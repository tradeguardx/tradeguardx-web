import { useGuard } from '../../../context/GuardContext';
import { sx } from './sx';

/** Guard pill — reference lines 327–330. */
export default function GuardPill() {
  const { selected } = useGuard();
  if (!selected.account) return null;
  // Until the guard state is known the pill shows a neutral placeholder: a
  // coloured verdict here was the first thing people saw on login, and it was
  // wrong for the half-second before the fetch landed.
  if (selected.describe.loading) {
    return (
      <div data-tgx-mdhide="1" aria-hidden style={sx('display:flex;align-items:center;gap:9px;padding:7px 13px 7px 11px;border-radius:999px;white-space:nowrap;flex:none;border:1px solid var(--line);background:var(--surface-2)')}>
        <span style={sx('flex:none;width:7px;height:7px;border-radius:50%;background:var(--surface-3);animation:tgxPulse 1.4s ease-in-out infinite')} />
        <span style={sx('width:52px;height:8px;border-radius:999px;background:var(--surface-3);animation:tgxPulse 1.4s ease-in-out infinite')} />
      </div>
    );
  }
  const t = selected.describe.tone;
  return (
    <div data-tgx-mdhide="1" title={selected.describe.title} style={sx('display:flex;align-items:center;gap:9px;padding:7px 13px 7px 11px;border-radius:999px;white-space:nowrap;flex:none', { border: `1px solid var(--${t}-line)`, background: `var(--${t}-tint)` })}>
      <span style={sx('flex:none;width:7px;height:7px;border-radius:50%;animation:tgxPulse 2.1s ease-in-out infinite', { background: `var(--${t}-solid)`, boxShadow: `0 0 0 3px var(--${t}-tint)` })} />
      <span style={sx("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase", { color: `var(--${t})` })}>{selected.describe.pill}</span>
    </div>
  );
}
