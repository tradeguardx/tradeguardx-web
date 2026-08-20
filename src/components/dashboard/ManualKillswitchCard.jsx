import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { useToast } from '../common/ToastProvider';
import { armLockout, fetchLockout, LOCKOUT_HOUR_OPTIONS } from '../../api/userApi';
import CollapsibleCard from '../common/CollapsibleCard';

/**
 * Manual killswitch — the user locks themselves out of trading for a fixed
 * window they choose.
 *
 * Two product rules drive the whole UI:
 *
 *  1. It cannot be cancelled. There is no "unlock" button here because the
 *     backend exposes no route to clear an armed lock — a killswitch you can
 *     switch off ten minutes into a twelve-hour window is a suggestion. So the
 *     confirm step has to be unmistakable rather than a casual click.
 *
 *  2. It cannot be armed mid-trade. Arming while holding a position would
 *     leave the user with something they can neither manage nor close through
 *     us, so the server returns POSITION_OPEN and we say exactly that.
 *
 * The copy also avoids promising more than the architecture delivers: we
 * cannot stop an order being placed in Delta's own app, we close it
 * immediately after. "Any position you open will be closed automatically" is
 * true; "you will not be able to trade" would not be.
 */

/**
 * Hours and minutes while there's a long way to go; mm:ss inside the last
 * hour, where a minutes-only readout would sit still long enough to look
 * broken next to a once-a-second tick.
 */
/**
 * The dashboard's accent as a literal. var(--accent) is defined only in the
 * landing-page stylesheets, so inside the dashboard it silently resolves to
 * nothing — which is why buttons styled with it rendered with no background
 * at all.
 */
const ACCENT = '#00d4aa';
const ACCENT_TINT = 'rgba(0, 212, 170, 0.14)';

function formatRemaining(ms) {
  if (ms <= 0) return 'any moment now';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ManualKillswitchCard() {
  const { session } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  const toast = useToast();
  const accessToken = session?.access_token;
  const tradingAccountId = selectedAccount?.id;

  const [hours, setHours] = useState(3);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [reasonIsManual, setReasonIsManual] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef(null);

  const load = useCallback(
    async (signal) => {
      if (!accessToken || !tradingAccountId) return;
      try {
        const res = await fetchLockout({ accessToken, tradingAccountId, signal });
        const data = res?.data ?? res;
        setLockedUntil(data?.lockedUntil ?? null);
        setReasonIsManual(Boolean(data?.manual));
      } catch {
        // Non-fatal: the card simply shows its idle state.
      }
    },
    [accessToken, tradingAccountId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // Only tick while a lock is actually running.
  useEffect(() => {
    if (!lockedUntil) return undefined;
    tickRef.current = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickRef.current);
  }, [lockedUntil]);

  const remainingMs = lockedUntil ? new Date(lockedUntil).getTime() - now : 0;
  const isLocked = Boolean(lockedUntil) && remainingMs > 0;

  const onArm = async () => {
    if (!tradingAccountId) return;
    setBusy(true);
    setBlockedMessage('');
    try {
      const res = await armLockout({ accessToken, tradingAccountId, hours });
      const data = res?.data ?? res;
      setLockedUntil(data?.lockedUntil ?? null);
      setReasonIsManual(true);
      setConfirming(false);
      toast?.success?.(`Locked out for ${hours} hours.`);
    } catch (err) {
      // The server distinguishes "you're mid-trade" from everything else, and
      // that distinction is the one the user needs to act on.
      const code = err?.code ?? err?.data?.error?.code;
      const message = err?.message ?? 'Could not start the lockout.';
      if (code === 'POSITION_OPEN') setBlockedMessage(message);
      else toast?.error?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CollapsibleCard
      title="Manual killswitch"
      subtitle="Stop yourself trading for a fixed period. Once started it cannot be cancelled — not by you, and not by support."
      accent={isLocked ? '#f59e0b' : ACCENT}
      icon={
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 6.64a9 9 0 11-12.73 0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
        </svg>
      }
      // An active lockout is the one state the user needs to see without
      // hunting for it, so the card opens itself while one is running.
      defaultOpen={isLocked}
      badge={
        isLocked ? (
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}
          >
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#f59e0b' }}
            />
            Locked
          </span>
        ) : null
      }
    >

      {isLocked ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center gap-4 rounded-xl border p-4"
          style={{ borderColor: '#f59e0b55', backgroundColor: '#f59e0b10' }}
        >
          <motion.span
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f59e0b1f', color: '#f59e0b' }}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path strokeLinecap="round" d="M8 11V8a4 4 0 018 0v3" />
            </svg>
          </motion.span>

          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
              {reasonIsManual ? 'Locked out' : 'Locked out by a rule breach'}
            </p>
            <p className="font-mono text-2xl font-bold leading-tight" style={{ color: 'var(--dash-text-primary)' }}>
              {formatRemaining(remainingMs)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
              Unlocks {new Date(lockedUntil).toLocaleString()} · any position you open before then
              will be closed automatically.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="mt-5">
            <p
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--dash-text-faint)' }}
            >
              Lock for
            </p>
            <div className="mt-2 flex gap-2">
              {LOCKOUT_HOUR_OPTIONS.map((h) => (
                <motion.button
                  key={h}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  onClick={() => {
                    setHours(h);
                    setConfirming(false);
                  }}
                  className="relative rounded-xl border px-5 py-2.5 text-sm font-bold"
                  style={{
                    borderColor: hours === h ? ACCENT : 'var(--dash-border)',
                    backgroundColor: hours === h ? ACCENT_TINT : 'transparent',
                    color: hours === h ? ACCENT : 'var(--dash-text-secondary)',
                  }}
                >
                  {h} hours
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {blockedMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm"
                  style={{ borderColor: '#f8717155', backgroundColor: '#f8717112', color: '#f87171' }}
                >
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
                  </svg>
                  <span>{blockedMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!confirming ? (
            <button
              type="button"
              disabled={!tradingAccountId || busy}
              onClick={() => setConfirming(true)}
              className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-surface-950 transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Start lockout
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border p-4"
              style={{ borderColor: '#f8717155', backgroundColor: '#f8717110' }}
            >
              <p className="text-sm font-bold" style={{ color: '#f87171' }}>
                Lock trading for {hours} hours?
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
                This cannot be undone. Any position you open in the next {hours} hours will be
                closed automatically, and you won&apos;t be able to change your rules until it
                ends.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onArm}
                  className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#f87171', color: '#0d0f14' }}
                >
                  {busy ? 'Starting…' : `Yes, lock me out for ${hours}h`}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-bold"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {!tradingAccountId && (
            <p className="mt-3 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
              Select a trading account first.
            </p>
          )}
        </>
      )}
    </CollapsibleCard>
  );
}
