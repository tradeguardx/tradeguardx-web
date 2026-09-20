import { Link } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { sx } from './sx';

/** Guard band — reference lines 382–392. Only while something is wrong; never dismissible. */
export default function GuardBand() {
  const { selected, loaded } = useGuard();
  if (!loaded || !selected.account) return null;
  const d = selected.describe;
  let { showBand, bandTitle, bandBody, cta, to, tone } = d;
  // Armed but silent: the alerts gap still needs a band (brief §4 gap 5).
  if (!showBand && selected.gap?.key === 'alerts') {
    showBand = true; tone = 'amber';
    bandTitle = selected.gap.title; bandBody = selected.gap.body; cta = selected.gap.cta; to = selected.gap.to;
  }
  if (!showBand) return null;
  const fg = `var(--${tone})`;
  return (
    <div data-tgx-band="1" data-tgx-stack="1" role="status" style={sx('display:flex;align-items:flex-start;gap:12px;padding:12px 24px', { borderTop: `1px solid var(--${tone}-line)`, background: `var(--${tone}-tint)` })}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none', marginTop: 1 }}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9.5v4M12 16.4h.01" /></svg>
      <div style={sx('flex:1;min-width:0')}>
        <div style={sx('font-size:13.5px;font-weight:700', { color: fg })}>{bandTitle}</div>
        <div style={sx('font-size:12.5px;color:var(--ink-2);margin-top:3px;max-width:96ch')}>{bandBody}</div>
      </div>
      <Link to={to} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700;text-decoration:none', { border: `1px solid var(--${tone}-line)`, color: fg })}>{cta}</Link>
    </div>
  );
}
