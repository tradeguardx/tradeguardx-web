import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGuard } from '../../../context/GuardContext';
import { useToast } from '../../common/ToastProvider';
import { armLockout, LOCKOUT_HOUR_OPTIONS } from '../../../api/userApi';
import { IcPower, IcClose } from './icons';
import { formatRemaining, formatResumes } from './format';

/**
 * Manual kill switch — user-armed, no undo.
 *
 * The header button is always present. While a lockout runs it BECOMES the
 * countdown. Opening it while locked shows the running state; otherwise the
 * two-stage arm flow. Refuses to arm, with the specific reason, when a
 * position is open (server says POSITION_OPEN) or when nothing could enforce
 * it (no key / read-only / setup incomplete) — a lockout you can walk around
 * is not a commitment.
 */

export function KillSwitchButton({ onOpen }) {
  const { selected } = useGuard();
  const locked = selected.guard === 'locked';
  return (
    <button
      type="button"
      className={`dks-btn${locked ? ' dks-btn--locked' : ''}`}
      data-tgx-ks
      data-armed={locked ? '1' : '0'}
      onClick={onOpen}
      title={locked ? 'Lockout running' : 'Lock yourself out of trading'}
      aria-label={locked ? 'Kill switch running' : 'Kill switch'}
    >
      <IcPower size={15} />
      <span data-tgx-kslabel>{locked ? formatRemaining(selected.lockRemainingMs) : 'Kill switch'}</span>
    </button>
  );
}

export function KillSwitchModal({ open, onClose, returnFocusRef }) {
  const { session } = useAuth();
  const { selected, refresh, now } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const [hours, setHours] = useState(3);
  const [stage, setStage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState('');
  const firstRef = useRef(null);
  const cardRef = useRef(null);

  const { account, guard, enforcement, gap, lockUntil, lockRemainingMs, lockReason } = selected;
  const locked = guard === 'locked';

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = returnFocusRef?.current;
    const t = setTimeout(() => firstRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && cardRef.current) {
        const f = cardRef.current.querySelectorAll('button:not(:disabled), [href], input, select');
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); returnTo?.querySelector?.('button')?.focus?.(); };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  // Nothing could enforce it → name the missing step, offer the fix.
  const cannot = enforcement !== 'armed' && !locked;
  const cannotWhy = gap && gap.key !== 'alerts' ? gap : null;

  const arm = async () => {
    setBusy(true); setBlocked('');
    try {
      await armLockout({ accessToken: session?.access_token, tradingAccountId: account.id, hours });
      await refresh();
      toast.success(`Locked out for ${hours} hours`, 'Any position you open before it ends will be closed automatically.');
      setStage(1);
    } catch (err) {
      const code = err?.details?.error?.code;
      const message = err?.details?.error?.message || err?.message || 'Please try again.';
      if (code === 'POSITION_OPEN') setBlocked(message);
      else toast.error('Could not start the lockout', message);
    } finally { setBusy(false); }
  };

  const tz = account?.timezone || 'Asia/Kolkata';

  return (
    <div className="dmo-backdrop" data-tgx-modal onClick={onClose} role="presentation">
      <div className="dmo dsh-card" role="dialog" aria-modal="true" aria-labelledby="dks-title" ref={cardRef} onClick={(e) => e.stopPropagation()}><div className="dmo__body">
        <button type="button" className="dmo-close dsh-btn dsh-btn--ghost dsh-btn--icon" onClick={onClose} aria-label="Close"><IcClose size={16} /></button>

        {locked ? (
          <>
            <span className="dsh-pill dsh-pill--red"><span className="dot" />Locked</span>
            <h2 id="dks-title" className="dsh-countdown dsh-countdown--modal dmo-title">{formatRemaining(lockRemainingMs)}</h2>
            <p className="dsh-body">
              Trading resumes {formatResumes(lockUntil, tz)}. {lockReason === 'manual' ? 'You armed this yourself.' : 'A rule armed this, not you.'}
            </p>
            {/* TODO(api): the lockout response carries no armed-at, so an elapsed
                bar would be a guess. Shown as remaining time only. */}
            <div className="dmo-note dsh-inset">
              <p className="dsh-body">There is no off button, only the clock. Any position you open before it ends is closed on sight. Support can lift it if something real happens; you cannot.</p>
            </div>
            <div className="dmo-actions">
              <button type="button" className="dsh-btn" onClick={() => { onClose(); navigate('/dashboard/live'); }}>See it on Live guard</button>
            </div>
          </>
        ) : cannot ? (
          <>
            <h2 id="dks-title" className="dsh-h2 dmo-title">Nothing could enforce a lockout yet</h2>
            <p className="dsh-body">
              {cannotWhy ? `${cannotWhy.title}. ` : ''}
              A lockout you can walk around is not a commitment, so we would rather not offer it here.
            </p>
            <div className="dmo-actions">
              {cannotWhy && (
                <button type="button" className="dsh-btn dsh-btn--primary" ref={firstRef} onClick={() => { onClose(); navigate(cannotWhy.to); }}>
                  {cannotWhy.cta}
                </button>
              )}
              <button type="button" className="dsh-btn dsh-btn--ghost" onClick={onClose}>Not now</button>
            </div>
          </>
        ) : stage === 1 ? (
          <>
            <span className="dsh-pill dsh-pill--red"><IcPower size={11} />Kill switch</span>
            <h2 id="dks-title" className="dsh-h2 dmo-title">Lock yourself out of {account?.name}</h2>
            <p className="dsh-body">
              Lock yourself out of this account for a window you choose. <strong>You can&rsquo;t call it off yourself</strong> — there is no off button, only the clock.
            </p>
            <div className="dks-hours" role="radiogroup" aria-label="Duration">
              {LOCKOUT_HOUR_OPTIONS.map((h, i) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={hours === h}
                  ref={i === 0 ? firstRef : undefined}
                  className={`dks-hour${hours === h ? ' dks-hour--on' : ''}`}
                  onClick={() => setHours(h)}
                >
                  <span className="dsh-stat-figure">{h}</span>
                  <span className="dsh-mono">hours</span>
                </button>
              ))}
            </div>
            <p className="dsh-meta">Trading would resume {formatResumes(now + hours * 3600_000, tz)}.</p>
            {blocked && <div className="dks-blocked dsh-inset"><p className="dsh-body">{blocked}</p></div>}
            <div className="dmo-actions">
              <button type="button" className="dsh-btn dsh-btn--red" onClick={() => setStage(2)}>Continue</button>
              <button type="button" className="dsh-btn dsh-btn--ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <span className="dsh-pill dsh-pill--red"><IcPower size={11} />Last check</span>
            <h2 id="dks-title" className="dsh-h2 dmo-title">Lock {account?.name} for {hours} hours?</h2>
            <div className="dmo-note dsh-inset">
              <p className="dsh-body">You will not be able to trade this account for {hours} hours. There is no cancel. Orders placed anywhere in the meantime get closed on sight.</p>
            </div>
            {blocked && <div className="dks-blocked dsh-inset"><p className="dsh-body">{blocked}</p></div>}
            <div className="dmo-actions">
              <button type="button" className="dsh-btn dsh-btn--red" ref={firstRef} disabled={busy} onClick={arm}>
                {busy ? 'Arming…' : `Yes, lock me out for ${hours}h`}
              </button>
              <button type="button" className="dsh-btn dsh-btn--ghost" disabled={busy} onClick={() => setStage(1)}>Back</button>
            </div>
          </>
        )}
      </div></div>
    </div>
  );
}
