import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGuard } from '../../../context/GuardContext';
import { IcPrefs, IcSecurity, IcBilling, IcBell, IcSignOut, IcClose } from './icons';
import { initialsOf } from './format';

/**
 * Avatar menu — the only home for account actions. Sign out confirms with
 * copy derived from guard state, so the user is told what keeps running.
 */
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

  const lockedAccount = all.find((s) => s.guard === 'locked');
  const armedCount = all.filter((s) => s.guard === 'armed').length;
  let signOutCopy;
  if (lockedAccount) {
    signOutCopy = `A kill switch is still running on ${lockedAccount.account?.name}. Signing out does not stop it — the clock keeps going and the engine keeps enforcing without you logged in.`;
  } else if (armedCount > 0) {
    signOutCopy = `Your rules keep running. ${armedCount} account${armedCount === 1 ? '' : 's'} stay${armedCount === 1 ? 's' : ''} protected while you are signed out — enforcement is server-side, not browser-side.`;
  } else {
    signOutCopy = 'Nothing is being enforced on any account right now, so signing out changes nothing.';
  }

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <div className="dav" ref={ref}>
      <button ref={btnRef} type="button" className="dav-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        {initialsOf(user?.name, user?.email)}
      </button>

      {open && (
        <div className="dav-menu dsh-card" role="menu">
          <div className="dav-head">
            <span className="dav-head__avatar">{initialsOf(user?.name, user?.email)}</span>
            <div style={{ minWidth: 0 }}>
              <p className="dav-name">{user?.name || 'Trader'}</p>
              <p className="dav-email">{user?.email}</p>
            </div>
          </div>
          <button ref={firstRef} type="button" role="menuitem" className="dav-item" onClick={() => go('/dashboard/preferences')}><IcPrefs size={15} />Preferences</button>
          <button type="button" role="menuitem" className="dav-item" onClick={() => go('/dashboard/account/security')}><IcSecurity size={15} />Security</button>
          <button type="button" role="menuitem" className="dav-item" onClick={() => go('/dashboard/account/billing')}><IcBilling size={15} />Plan &amp; billing</button>
          <button type="button" role="menuitem" className="dav-item" onClick={() => go('/dashboard/alerts')}><IcBell size={15} />Alert channels</button>
          <div className="dav-sep" />
          <button type="button" role="menuitem" className="dav-item dav-item--danger" onClick={() => { setOpen(false); setConfirm(true); }}><IcSignOut size={15} />Sign out</button>
        </div>
      )}

      {confirm && (
        <div className="dmo-backdrop" data-tgx-modal onClick={() => setConfirm(false)} role="presentation">
          <div className="dmo dsh-card" role="dialog" aria-modal="true" aria-labelledby="dso-title" onClick={(e) => e.stopPropagation()}><div className="dmo__body">
            <button type="button" className="dmo-close dsh-btn dsh-btn--ghost dsh-btn--icon" onClick={() => setConfirm(false)} aria-label="Close"><IcClose size={16} /></button>
            <h2 id="dso-title" className="dsh-h2 dmo-title">Sign out?</h2>
            <p className="dsh-body">{signOutCopy}</p>
            <div className="dmo-actions">
              <button type="button" className="dsh-btn dsh-btn--primary" autoFocus onClick={() => { setConfirm(false); logout(); }}>Sign out</button>
              <button type="button" className="dsh-btn" onClick={() => setConfirm(false)}>Stay</button>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}
