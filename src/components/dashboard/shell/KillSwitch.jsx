import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGuard } from '../../../context/GuardContext';
import { useToast } from '../../common/ToastProvider';
import { armLockout, LOCKOUT_HOUR_OPTIONS } from '../../../api/userApi';
import { sx } from './sx';
import { formatRemaining } from './format';

/**
 * Manual kill switch — reference header button (lines 338–341) and modal
 * (447–537). Header button becomes the countdown while armed. The modal has
 * four bodies: armed / blocked (position open) / noEnforce / armable.
 *
 * "Position open" is only known when the server refuses (POSITION_OPEN), so
 * the blocked body renders after an attempt rather than before it.
 */

export function KillSwitchButton({ onOpen }) {
  const { selected } = useGuard();
  const armed = selected.guard === 'locked';
  return (
    <button
      type="button"
      data-tgx-ks="1"
      data-armed={armed ? '1' : '0'}
      onClick={onOpen}
      aria-label="Kill switch"
      style={sx('flex:none;display:flex;align-items:center;gap:8px;height:36px;padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums', {
        border: `1px solid ${armed ? 'var(--red-line)' : 'var(--red-btn)'}`,
        background: armed ? 'var(--red-tint)' : 'var(--red-btn)',
        color: armed ? 'var(--red)' : '#fff',
      })}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" style={{ flex: 'none' }}><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
      <span data-tgx-kslabel="1">{armed ? formatRemaining(selected.lockRemainingMs) : 'Kill switch'}</span>
    </button>
  );
}

const HOUR_ON = "flex:1;padding:12px;border-radius:11px;font:600 14px/1 'Space Grotesk',sans-serif;border:1px solid var(--ink);background:var(--ink);color:var(--surface)";
const HOUR_OFF = "flex:1;padding:12px;border-radius:11px;font:600 14px/1 'Space Grotesk',sans-serif;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)";

export function KillSwitchModal({ open, onClose, returnFocusRef }) {
  const { session } = useAuth();
  const { selected, refresh } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const [hours, setHours] = useState(3);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(null); // server POSITION_OPEN message
  const cardRef = useRef(null);
  const firstRef = useRef(null);

  const { account, guard, gap, lockRemainingMs, lockReason, readOnly, canLockOut } = selected;
  const armed = guard === 'locked';
  // A lockout holds on the key alone. Rules are the automatic half of the
  // product and have nothing to do with a user deciding to stop: the engine's
  // cooldown watchdog closes whatever is opened during the lock either way.
  const noEnforce = !armed && !canLockOut;
  const armable = !armed && !noEnforce && !blocked;
  const ksGap = gap && gap.key !== 'alerts' ? gap : null;

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = returnFocusRef?.current;
    const t = setTimeout(() => firstRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && cardRef.current) {
        const f = cardRef.current.querySelectorAll('button:not(:disabled), [href]');
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

  const go = (to) => { onClose(); navigate(to); };

  const arm = async () => {
    setBusy(true);
    try {
      await armLockout({ accessToken: session?.access_token, tradingAccountId: account.id, hours });
      await refresh();
      toast.success(`Locked out for ${hours} hours`, 'Orders placed anywhere in the meantime get closed on sight.');
      setStage(0);
    } catch (err) {
      const code = err?.details?.error?.code;
      const message = err?.details?.error?.message || err?.message || 'Please try again.';
      if (code === 'POSITION_OPEN') { setBlocked(message); setStage(0); }
      else toast.error('Could not start the lockout', message);
    } finally { setBusy(false); }
  };

  // What is actually missing is a key that can act — never a rule. Point at
  // the key first; only fall back to the setup gap when there is no key at all.
  const keyGap = ksGap && ksGap.key !== 'rules' ? ksGap : null;
  const noEnforceBody = readOnly
    ? 'The key on this account is read-only, so we could not close anything the lockout was meant to stop.'
    : keyGap ? keyGap.body : 'Connect a key that can act and the lockout has something to hold it.';
  const noEnforceCta = readOnly ? 'Replace the key' : keyGap ? keyGap.cta : 'Connect a key';
  const noEnforceTo = readOnly ? '/dashboard/connect' : keyGap ? keyGap.to : '/dashboard/connect';
  const armedBody = readOnly
    ? 'Clears on its own, then the account trades again. Rule and key changes are blocked so you cannot undo it — but the key here is read-only, so we cannot close anything you open in the meantime. This one holds because you decided it does.'
    : 'Clears on its own, then the account trades again. Support can lift it early if something real happens — you cannot.';
  const reasonLabel = lockReason === 'manual' ? 'Manual lockout — armed by you' : 'Lockout — armed by a rule';

  return (
    <div data-tgx-modal="1" onClick={onClose} role="presentation" style={sx('position:fixed;inset:0;z-index:60;background:rgba(3,5,10,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px')}>
      <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="ks-title" onClick={(e) => e.stopPropagation()} style={sx('width:100%;max-width:470px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .18s ease-out')}>
        <div style={sx('display:flex;align-items:flex-start;gap:13px;padding:21px 23px;border-bottom:1px solid var(--line)')}>
          <span style={sx('flex:none;width:34px;height:34px;border-radius:10px;background:var(--red-tint);display:grid;place-items:center;color:var(--red)')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
          </span>
          <div style={sx('flex:1;min-width:0')}>
            <h2 id="ks-title" style={sx("margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Manual kill switch</h2>
            <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink-3)')}>{account?.name} · you choose the window, then it holds</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={sx('flex:none;width:28px;height:28px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={sx('padding:21px 23px')}>
          {armed && (
            <div style={sx('padding:17px 18px;border:1px solid var(--red-line);border-radius:13px;background:var(--red-tint)')}>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--red)")}>{reasonLabel}</div>
              <div style={sx("margin-top:10px;font:700 36px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em")}>{formatRemaining(lockRemainingMs)}</div>
              <p style={sx('margin:11px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{armedBody}</p>
            </div>
          )}

          {!armed && blocked && (
            <div style={sx('padding:15px 16px;border:1px solid var(--amber-line);border-radius:13px;background:var(--amber-tint)')}>
              <div style={sx('font-size:12.5px;font-weight:700;color:var(--amber)')}>Can&rsquo;t arm while a position is open</div>
              <p style={sx('margin:6px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>Locking you out now would leave you holding a position you could neither manage nor close through us. Flatten first, then arm.</p>
            </div>
          )}

          {noEnforce && (
            <div style={sx('padding:15px 16px;border:1px solid var(--amber-line);border-radius:13px;background:var(--amber-tint)')}>
              <div style={sx('font-size:12.5px;font-weight:700;color:var(--amber)')}>Nothing could enforce a lockout yet</div>
              <p style={sx('margin:6px 0 12px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{noEnforceBody} A lockout you can walk around is not a commitment, so we would rather not offer it here.</p>
              <button ref={firstRef} type="button" onClick={() => go(noEnforceTo)} style={sx('padding:8px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>{noEnforceCta}</button>
            </div>
          )}

          {armable && (
            <div>
              <p style={sx('margin:0 0 15px;font-size:13px;line-height:1.6;color:var(--ink-2)')}>Locks you out of this account for the window you pick. <strong style={sx('color:var(--ink);font-weight:700')}>You can&rsquo;t call it off yourself</strong> — there is no off button, only the clock. Support can lift it if something real happens.</p>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px")}>Lock duration</div>
              <div style={sx('display:flex;gap:8px;margin-bottom:15px')} role="radiogroup" aria-label="Lock duration">
                {LOCKOUT_HOUR_OPTIONS.map((h, i) => (
                  <button key={h} ref={i === 0 ? firstRef : undefined} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)} style={sx(hours === h ? HOUR_ON : HOUR_OFF)}>{h}h</button>
                ))}
              </div>
              {stage === 0 && (
                <button type="button" className="ks-arm" onClick={() => setStage(1)} style={sx('width:100%;padding:13px;border:1px solid var(--red-line);border-radius:11px;background:var(--red-tint);color:var(--red);font-size:13.5px;font-weight:700')}>Arm the lockout</button>
              )}
              {stage === 1 && (
                <div style={sx('padding:15px 16px;border:1px solid var(--red-line);border-radius:12px;background:var(--red-tint)')}>
                  <div style={sx('font-size:12.5px;font-weight:700;color:var(--red)')}>Read this before you confirm</div>
                  <p style={sx('margin:6px 0 13px;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>You will not be able to trade this account for {hours} hours. There is no cancel. Orders placed anywhere in the meantime get closed on sight.</p>
                  <div style={sx('display:flex;gap:8px')}>
                    <button type="button" disabled={busy} onClick={arm} style={sx('flex:1;padding:11px;border:1px solid var(--red-solid);border-radius:10px;background:var(--red-solid);color:#fff;font-size:12.5px;font-weight:700')}>{busy ? 'Arming…' : `Lock me out for ${hours} hours`}</button>
                    <button type="button" disabled={busy} onClick={() => setStage(0)} style={sx('padding:11px 14px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink-2);font-size:12.5px;font-weight:600')}>Back</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={sx('display:flex;align-items:center;gap:10px;padding:14px 23px;border-top:1px solid var(--line);background:var(--surface-2)')}>
          <span style={sx('flex:1;font-size:12px;line-height:1.5;color:var(--ink-3)')}>Rule-based limits are separate — they run on every fill without you doing anything.</span>
          <button type="button" onClick={() => go('/dashboard/live')} style={sx('flex:none;padding:8px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>Live guard</button>
        </div>
      </div>
    </div>
  );
}
