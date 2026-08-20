import { useCallback, useEffect, useRef, useState } from 'react';
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

function formatRemaining(ms) {
  if (ms <= 0) return 'any moment now';
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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
    tickRef.current = setInterval(() => setNow(Date.now()), 30_000);
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
      // An active lockout is the one state the user needs to see without
      // hunting for it, so the card opens itself while one is running.
      defaultOpen={isLocked}
      badge={
        isLocked ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}
          >
            Locked
          </span>
        ) : null
      }
    >

      {isLocked ? (
        <div
          className="mt-5 rounded-xl border p-4"
          style={{ borderColor: '#f59e0b55', backgroundColor: '#f59e0b12' }}
        >
          <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
            {reasonIsManual ? 'Locked out' : 'Locked out by a rule breach'}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
            Trading unlocks in <span className="font-bold">{formatRemaining(remainingMs)}</span> —{' '}
            {new Date(lockedUntil).toLocaleString()}.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--dash-text-faint)' }}>
            Any position you open before then will be closed automatically.
          </p>
        </div>
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
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setHours(h);
                    setConfirming(false);
                  }}
                  className="rounded-xl border px-5 py-2.5 text-sm font-bold transition-colors"
                  style={{
                    borderColor: hours === h ? 'var(--accent)' : 'var(--dash-border)',
                    backgroundColor: hours === h ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent',
                    color: hours === h ? 'var(--accent)' : 'var(--dash-text-secondary)',
                  }}
                >
                  {h} hours
                </button>
              ))}
            </div>
          </div>

          {blockedMessage && (
            <div
              className="mt-4 rounded-xl border p-3 text-sm"
              style={{ borderColor: '#f8717155', backgroundColor: '#f8717112', color: '#f87171' }}
            >
              {blockedMessage}
            </div>
          )}

          {!confirming ? (
            <button
              type="button"
              disabled={!tradingAccountId || busy}
              onClick={() => setConfirming(true)}
              className="mt-5 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--surface-950, #0d0f14)' }}
            >
              Start lockout
            </button>
          ) : (
            <div
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
            </div>
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
