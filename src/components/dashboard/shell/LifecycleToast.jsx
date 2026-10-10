import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGuard } from '../../../context/GuardContext';
import { entryToastFor, UNPROTECTED_STATES } from '../../../lib/lifecycle';
import { sx } from './sx';

const SHOW_MS = 3400;

function keyFor(userId) {
  return `tgx.life.last.${userId}`;
}

function read(userId) {
  try { return window.localStorage.getItem(keyFor(userId)); } catch { return null; }
}

function write(userId, id) {
  try { window.localStorage.setItem(keyFor(userId), id); } catch { /* best effort */ }
}

/**
 * The toast that marks moving into a lifecycle state — "Trial cancelled. You
 * won't be charged.", "Payment went through. Your guard is back on." —
 * shown once per entry (reference/04_toast.template.html).
 *
 * "Once" is remembered per user in this browser. TODO(api): the spec tracks
 * it server-side so a second device does not replay it.
 *
 * The first state ever seen here only records itself. Someone opening the
 * dashboard for the first time since this shipped has not just entered
 * anything, and a "Payment received" toast on a months-old plan is noise.
 *
 * Setup states never toast here: the setup flow has its own welcome. Nor
 * does Plan & billing, where the change was made: that page already says
 * what the button did, and saying it twice is not confirmation.
 */
export default function LifecycleToast() {
  const { user } = useAuth();
  const { life } = useGuard();
  const { pathname } = useLocation();
  const onBilling = pathname.startsWith('/dashboard/account/billing');
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const userId = user?.id ?? null;
  const id = life?.id ?? null;

  useEffect(() => {
    if (!userId || !id) return;
    const last = read(userId);
    write(userId, id);
    if (!last || last === id || life.setup || onBilling) return;
    const text = entryToastFor(last, id, life);
    if (!text) return;
    // A transition is an event, not derived state: it shows once, then the
    // timer below clears it. Nothing about it can be computed during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMsg({ text, bad: UNPROTECTED_STATES.includes(id) });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), SHOW_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a state change, not on navigation
  }, [userId, id, life?.setup]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!msg) return null;
  return (
    <div
      role="status"
      style={sx("position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:140;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:12px 16px;border-radius:13px;background:#141c2b;color:#f6f9fc;font-size:13px;font-weight:600;box-shadow:0 18px 40px -14px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.08);animation:tgxSlide .25s ease-out both")}
    >
      <span style={sx('flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;color:#02241d', { background: msg.bad ? '#ef4444' : '#00d4aa' })}>
        {msg.bad ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 6v7M12 17.5h.01" /></svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        )}
      </span>
      <span>{msg.text}</span>
    </div>
  );
}
