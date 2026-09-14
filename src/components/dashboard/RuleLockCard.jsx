import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { fetchRuleLock, setRuleLockDays } from '../../api/tradingAccountsApi';
import { useToast } from '../common/ToastProvider';

/**
 * Rule lock — "if I save or change something I cannot change it for the next
 * 3, 7 or 30 days." A commitment device a trader asked for, sitting beside
 * the manual kill switch because they are the same idea: the user binding
 * their future self.
 *
 * Absolute by design. Tightening is locked too — the point is not to touch
 * the rules at all; fiddling, even in the safe direction, is the behaviour
 * being prevented.
 *
 * The window can only be changed while the account is NOT locked. Otherwise
 * 30 → 3 is a two-click escape and the whole thing is decoration. The server
 * enforces that with a 423; this UI just says it up front.
 */

const OPTIONS = [
  { days: 0, label: 'Off' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
];

function fmt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function RuleLockCard() {
  const { selectedTradingAccountId } = useTradingAccounts();
  // Keyed on the account so a switch remounts with fresh state — no reset
  // effect needed, and no stale lock shown for the wrong account.
  return <RuleLockCardInner key={selectedTradingAccountId ?? 'none'} accountId={selectedTradingAccountId} />;
}

function RuleLockCardInner({ accountId: selectedTradingAccountId }) {
  const { session } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // days awaiting confirm
  const [saving, setSaving] = useState(false);

  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    fetchRuleLock({ accessToken, accountId: selectedTradingAccountId, signal: ctrl.signal })
      .then((s) => { if (!ctrl.signal.aborted) setState(s); })
      .catch(() => { /* card shows the empty state */ })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId]);

  async function apply(days) {
    setSaving(true);
    try {
      await setRuleLockDays({ accessToken, accountId: selectedTradingAccountId, days });
      setState((s) => ({ ...(s || {}), days }));
      setPending(null);
      toast.success(
        days ? `Rule lock set to ${days} days` : 'Rule lock turned off',
        days ? 'From your next save, every rule locks for that long.' : 'Rules can now be changed at any time.',
      );
    } catch (e) {
      toast.error('Could not change the lock', e?.message || 'Try again.');
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  const locked = Boolean(state?.locked);
  const current = state?.days ?? 7;

  return (
    <div className="dash-card-elevated rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Rule lock</p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
            After you save a rule, <span className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>every</span> rule on this account
            is frozen for the window you choose — nothing can be turned on, off, tightened or loosened until it lifts.
          </p>
        </div>
        {locked && (
          <span className="flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#d97706', backgroundColor: 'rgba(245,158,11,0.10)' }}>
            Locked
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-10 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--dash-skeleton)' }} />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {OPTIONS.map((o) => {
              const active = o.days === current;
              return (
                <button
                  key={o.days}
                  type="button"
                  disabled={locked || saving}
                  onClick={() => (o.days === current ? null : setPending(o.days))}
                  className="rounded-lg border px-2 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: active ? 'var(--accent, #00d4aa)' : 'var(--dash-border)',
                    backgroundColor: active ? 'rgba(0,212,170,0.10)' : 'transparent',
                    color: active ? 'var(--accent, #00d4aa)' : 'var(--dash-text-secondary)',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
            {locked
              ? `Rules are locked until ${fmt(state.lockedUntil)}. The window can be changed once that passes. Support can lift a lock in an emergency.`
              : current
                ? `The lock engages 15 minutes after your last save, so you can set up several rules in one sitting. Support can lift a lock in an emergency.`
                : 'Off — rules can be changed at any time. Loosening a rule still waits 24 hours.'}
          </p>

          {pending !== null && (
            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                {pending ? `Lock rules for ${pending} days after each save?` : 'Turn the rule lock off?'}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--dash-text-secondary)' }}>
                {pending
                  ? `From your next save, no rule on this account can be changed for ${pending} days. You will not be able to shorten or switch this off while a lock is running.`
                  : 'Rules will be editable at any time. The 24-hour delay on loosening a rule still applies.'}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setPending(null)} disabled={saving} className="rounded-lg border px-3 py-2 text-[13px] font-semibold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => apply(pending)} disabled={saving} className="rounded-lg px-3 py-2 text-[13px] font-bold disabled:opacity-50" style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}>
                  {saving ? 'Saving…' : pending ? `Yes, lock for ${pending} days` : 'Yes, turn off'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
