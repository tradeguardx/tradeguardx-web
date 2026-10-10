import { Link } from 'react-router-dom';
import { sx } from './sx';

/**
 * A locked page: rendered underneath, blurred and out of reach, with one card
 * that says why and where to go (lifecycle spec, reference/03_lock-overlay).
 *
 * The page stays visible on purpose — it shows what switches back on, which
 * a blank wall never did. `inert` takes it out of the tab order and the
 * pointer, so focus can only land on the card; the browser's back button is
 * untouched.
 *
 * This replaces UpgradeWall, which covered EVERY page for any lapsed user,
 * Trades and Tax included — the two the spec keeps readable in every state.
 */
export default function LifecycleLock({ lock, from, children }) {
  /* Keep where they were trying to go, so paying can bring them back.
     The billing page reads `return` when it supports it. */
  const to = from && lock.to.startsWith('/dashboard/account/billing')
    ? `${lock.to}?return=${encodeURIComponent(from)}`
    : lock.to;
  return (
    <div style={{ position: 'relative' }}>
      <div inert aria-hidden="true" style={sx('filter:blur(6px);pointer-events:none;user-select:none;max-height:calc(100vh - 140px);overflow:hidden')}>
        {children}
      </div>
      <div style={sx('position:absolute;inset:0;z-index:20;background:color-mix(in srgb,var(--bg) 62%,transparent)')}>
        <div style={sx('position:sticky;top:120px;display:grid;place-items:center;padding:40px 16px')}>
          <div role="dialog" aria-modal="false" aria-labelledby="tgx-lock-title" style={sx('width:100%;max-width:420px;padding:26px;border-radius:20px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-card);text-align:center;animation:tgxSlide .25s ease-out both')}>
            <span style={sx('margin:0 auto;display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2)')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0110 0v3" /><path d="M5 11h14v9H5z" /></svg>
            </span>
            <div id="tgx-lock-title" style={sx("margin-top:14px;font:600 19px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{lock.title}</div>
            <p style={sx('margin:8px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>{lock.body}</p>
            <Link to={to} style={sx('display:inline-block;margin-top:16px;min-height:44px;padding:12px 18px;border:0;border-radius:11px;background:var(--mint-solid);color:#02241d;font-size:13.5px;font-weight:800;text-decoration:none')}>{lock.cta}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
