import { Link, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { sx } from './sx';

/** Guard band — reference lines 382–392. Only while something is wrong; never dismissible. */
export default function GuardBand() {
  const { selected, loaded } = useGuard();
  const { pathname } = useLocation();
  if (!loaded || !selected.account) return null;
  const d = selected.describe;
  let { showBand, bandTitle, bandBody, cta, to, tone } = d;
  // Armed but silent: the alerts gap still needs a band (brief §4 gap 5).
  if (!showBand && selected.gap?.key === 'alerts') {
    showBand = true; tone = 'amber';
    bandTitle = selected.gap.title; bandBody = selected.gap.body; cta = selected.gap.cta; to = selected.gap.to;
  }
  if (!showBand) return null;
  /**
   * The band exists to point somewhere. On the page it points AT, it is
   * just a louder copy of what is already on screen — the lockout band sat
   * above the Live guard countdown offering to show you the countdown.
   * If the destination is where you already are, the page is the message.
   */
  if (to && pathname.startsWith(to)) return null;
  const fg = `var(--${tone})`;
  return (
    /*
     * NOT data-tgx-stack. That shared rule stacks every child and gives each
     * width:100%, which on a phone stretched the 17px warning triangle across
     * the band — reading as a centred icon above left-aligned text — and blew
     * the link up into a full-width button. The icon belongs beside the title,
     * so it is nested with it and the band handles its own stacking.
     */
    <div data-tgx-band="1" className="guard-band" role="status" style={sx('display:flex;align-items:flex-start;gap:12px;padding:12px 24px', { borderTop: `1px solid var(--${tone}-line)`, background: `var(--${tone}-tint)` })}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;display:flex;align-items:flex-start;gap:10px')}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none', marginTop: 2 }}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9.5v4M12 16.4h.01" /></svg>
        <div style={sx('flex:1;min-width:0')}>
          <div style={sx('font-size:13.5px;font-weight:700;line-height:1.35', { color: fg })}>{bandTitle}</div>
          <div style={sx('font-size:12.5px;line-height:1.5;color:var(--ink-2);margin-top:3px;max-width:96ch')}>{bandBody}</div>
        </div>
      </div>
      <Link className="guard-band__cta" to={to} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap', { border: `1px solid var(--${tone}-line)`, color: fg })}>{cta}</Link>
    </div>
  );
}
