import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { sx } from './sx';

/**
 * The dashboard's one notice shape: a card in the page, not a strip across
 * it. Eyebrow, title, a line or two, and one solid button on the right
 * (under the text on a phone). Every colour is a token, so it follows the
 * user's theme and accent.
 *
 * `tone` — 'red' for real danger (payment failed, key disconnected, a rule
 * breached); anything else uses the accent.
 * `cta` — { label, to } or { label, onClick, disabled?, arrow? }; omit for a
 * notice with no action (the page itself is the action).
 */
const NoticeCard = forwardRef(function NoticeCard({ tone = 'mint', eyebrow, title, body, cta, onDismiss, children, className = '', style, ...rest }, ref) {
  const t = tone === 'red' ? 'red' : 'mint';
  const btn = sx(
    'flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:11px 18px;border:0;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap;cursor:pointer',
    t === 'red'
      ? { background: 'var(--red-btn, var(--red-solid))', color: '#fff' }
      : { background: 'var(--mint-solid)', color: 'var(--on-mint)', boxShadow: 'var(--glow-mint)' },
  );
  return (
    <section
      {...rest}
      ref={ref}
      role="status"
      className={`tgx-notice ${className}`}
      style={sx(`position:relative;padding:18px 22px;border:1px solid var(--${t}-line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden`, style ?? {})}
    >
      <div aria-hidden style={sx(`position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 90% at 0% 0%,var(--${t}-tint),transparent 70%)`)} />
      <div style={sx('position:relative;display:flex;align-items:center;gap:18px;flex-wrap:wrap', onDismiss ? { paddingRight: 26 } : {})}>
        <div style={sx('flex:1;min-width:min(280px,100%)')}>
          {eyebrow && <div style={sx(`font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--${t});margin-bottom:9px`)}>{eyebrow}</div>}
          <div style={sx("font:600 18px/1.3 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink)")}>{title}</div>
          {body && <p style={sx('margin:5px 0 0;max-width:70ch;font-size:13px;line-height:1.55;color:var(--ink-2)')}>{body}</p>}
          {children}
        </div>
        {cta && (cta.to
          ? <Link to={cta.to} className="tgx-notice__cta" style={btn}>{cta.label} →</Link>
          : <button type="button" onClick={cta.onClick} disabled={cta.disabled} className="tgx-notice__cta" style={{ ...btn, ...(cta.disabled ? { opacity: 0.5, cursor: 'default' } : {}) }}>{cta.label}{cta.arrow === false ? '' : ' →'}</button>)}
        {onDismiss && (
          <button type="button" aria-label="Dismiss" onClick={onDismiss} style={sx('position:absolute;top:-6px;right:-10px;display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--ink-3);cursor:pointer')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
    </section>
  );
});

export default NoticeCard;
