import { useCooldown, formatCountdown, COOLDOWN_REASON_LABEL } from '../../hooks/useCooldown';

/**
 * Lockout banner with a live countdown. While the account's cooldown_until is in
 * the future, shows why it's locked and when it unlocks.
 *
 * `note` lets a screen add what the lock means *there* — on the rules screen it
 * explains that rules are frozen, which is otherwise invisible until a save is
 * rejected by the API.
 */
export default function CooldownBanner({ accessToken, tradingAccountId, account, note }) {
  const { locked, untilMs, reason, remainingMs } = useCooldown({ accessToken, tradingAccountId, account });

  if (!locked) return null;

  const reasonLabel = COOLDOWN_REASON_LABEL[reason] || 'Risk lockout';
  const unlockTime = new Date(untilMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="mb-5 rounded-2xl border px-4 py-3.5"
      style={{ borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.08)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
            <svg className="h-5 w-5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Account locked — cooldown active</p>
            <p className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
              {note || `${reasonLabel} · new trades auto-close until unlock at ${unlockTime}.`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold tabular-nums" style={{ color: '#ef4444' }}>
            {formatCountdown(remainingMs)}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--dash-text-faint)' }}>until unlock</p>
        </div>
      </div>
    </div>
  );
}
