import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGuard } from '../../../context/GuardContext';
import { sx } from './sx';
import { initialsOf } from './format';

/** Avatar menu + sign-out confirm — reference lines 351–380 and 432–445. */

const MENU = [
  { to: '/dashboard/preferences', label: 'Preferences', note: 'Display, currency, defaults', d1: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z', d2: 'M19.4 14.4l.9 1.6-2.3 2.3-1.6-.9a7 7 0 01-1.7 1l-.4 1.8h-3.3l-.4-1.8a7 7 0 01-1.7-1l-1.6.9-2.3-2.3.9-1.6a7 7 0 01-.4-1.9L3.7 12l.5-1.9 1.8-.4a7 7 0 01.9-1.7l-.9-1.6L8.3 4l1.6.9a7 7 0 011.7-.9l.4-1.8h3.3' },
  { to: '/dashboard/account/security', label: 'Security', note: 'Password, sessions, keys', d1: 'M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z', d2: 'M9.5 12l1.9 1.9 3.4-3.6' },
  { to: '/dashboard/account/billing', label: 'Plan & billing', note: null, d1: 'M3 7h18v11H3z', d2: 'M3 11h18M7 15h4' },
  { to: '/dashboard/alerts', label: 'Alert channels', note: 'Telegram, email, mobile', d1: 'M12 4a5.2 5.2 0 00-5.2 5.2c0 5-2 6.3-2 6.3h14.4s-2-1.3-2-6.3A5.2 5.2 0 0012 4z', d2: 'M10.2 18.4a2 2 0 003.6 0' },
];

export default function AvatarMenu() {
  const { user, logout } = useAuth();
  const { all } = useGuard();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open && !confirm) return undefined;
    const onDoc = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (confirm) setConfirm(false); else setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    if (open) setTimeout(() => firstRef.current?.focus(), 20);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, confirm]);

  const locked = all.filter((s) => s.guard === 'locked');
  const armedN = all.filter((s) => s.enforcement === 'armed').length;
  const signOutNote = locked.length
    ? `A kill switch is still running on ${locked[0].account?.name}. Signing out does not stop it — the clock keeps going and the engine keeps enforcing without you logged in.`
    : armedN
      ? `Your rules keep running. ${armedN}${armedN === 1 ? ' account stays' : ' accounts stay'} protected while you are signed out — enforcement is server-side, not browser-side.`
      : 'Nothing is being enforced on any account right now, so signing out changes nothing.';

  const planNote = user?.planKnown ? (user.planLabel ? `${user.planLabel} · billed monthly` : 'Free') : '';
  const initials = initialsOf(user?.name, user?.email);
  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <div style={sx('position:relative;flex:none')} ref={ref}>
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="dav-btn" style={sx("display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);font:600 12px/1 'Space Grotesk',sans-serif;color:var(--ink-2);padding:0")}>{initials}</button>

      {open && (
        <div role="menu" style={sx('position:absolute;top:calc(100% + 8px);right:0;z-index:40;width:286px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .16s ease-out')}>
          <div style={sx('display:flex;align-items:center;gap:11px;padding:15px 16px;border-bottom:1px solid var(--line)')}>
            <span style={sx("flex:none;width:38px;height:38px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);display:grid;place-items:center;font:600 13px/1 'Space Grotesk',sans-serif;color:var(--ink-2)")}>{initials}</span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:13.5px;font-weight:600;letter-spacing:-.01em')}>{user?.name || 'Trader'}</span>
              <span style={sx('display:block;font-size:12px;color:var(--ink-3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{user?.email}</span>
            </span>
          </div>
          <div style={sx('padding:6px')}>
            {MENU.map((m, i) => (
              <button key={m.to} ref={i === 0 ? firstRef : undefined} type="button" role="menuitem" className="dav-item" onClick={() => go(m.to)} style={sx('width:100%;display:flex;align-items:center;gap:11px;padding:9px 10px;border:0;border-radius:9px;background:transparent;color:var(--ink);text-align:left')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d={m.d1} /><path d={m.d2} /></svg>
                <span style={sx('flex:1;min-width:0')}>
                  <span style={sx('display:block;font-size:13px;font-weight:500')}>{m.label}</span>
                  <span style={sx('display:block;font-size:11.5px;color:var(--ink-3);margin-top:1px')}>{m.note ?? planNote}</span>
                </span>
              </button>
            ))}
          </div>
          <div style={sx('padding:6px;border-top:1px solid var(--line)')}>
            <button type="button" role="menuitem" className="dav-item" onClick={() => { setOpen(false); setConfirm(true); }} style={sx('width:100%;display:flex;align-items:center;gap:11px;padding:9px 10px;border:0;border-radius:9px;background:transparent;color:var(--ink);text-align:left;font-size:13px;font-weight:500')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M15 17l5-5-5-5" /><path d="M20 12H9M11 4H5v16h6" /></svg>
              Sign out
            </button>
          </div>
        </div>
      )}

      {confirm && createPortal(
        <div data-tgx-modal="1" onClick={() => setConfirm(false)} role="presentation" style={sx('position:fixed;inset:0;z-index:70;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px')}>
          <div role="dialog" aria-modal="true" aria-labelledby="so-title" onClick={(e) => e.stopPropagation()} style={sx('width:100%;max-width:420px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .18s ease-out')}>
            <div style={sx('padding:21px 23px 17px')}>
              <h2 id="so-title" style={sx("margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Sign out of TradeGuardX?</h2>
              <p style={sx('margin:9px 0 0;font-size:13px;line-height:1.6;color:var(--ink-2)')}>{signOutNote}</p>
            </div>
            <div style={sx('display:flex;gap:9px;padding:15px 23px;border-top:1px solid var(--line);background:var(--surface-2)')}>
              <button type="button" autoFocus onClick={() => { setConfirm(false); logout(); }} style={sx('flex:1;padding:11px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Sign out</button>
              <button type="button" onClick={() => setConfirm(false)} style={sx('padding:11px 15px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Stay signed in</button>
            </div>
          </div>
        </div>
      , document.querySelector('[data-tgx]') ?? document.body)}
    </div>
  );
}
