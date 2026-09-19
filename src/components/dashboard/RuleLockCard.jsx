import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { fetchRuleLock, setRuleLockDays } from '../../api/tradingAccountsApi';
import { useToast } from '../common/ToastProvider';
import CollapsibleCard from '../common/CollapsibleCard';
import { openSupport } from '../support/supportBus';

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
 * "Off" is offered, but — like every window change — only while NOT locked.
 * Off is a calm choice, never an exit from a running lock. Releasing a lock
 * early is still a conversation with support; the card gives the address.
 *
 * The window can only be changed while the account is NOT locked. Otherwise
 * 30 → 3 is a two-click escape. The server enforces that with a 423; this UI
 * just says it up front.
 */

// Matches the manual killswitch: a literal, because var(--accent) is not
// defined inside the dashboard stylesheets.
const ACCENT = '#00d4aa';
const ACCENT_TINT = 'rgba(0,212,170,0.12)';
const AMBER = '#d97706';
const AMBER_TINT = 'rgba(245,158,11,0.10)';
const AMBER_LINE = 'rgba(245,158,11,0.35)';

const SUPPORT_EMAIL = 'support@tradeguardx.com';
const OPTIONS = [0, 3, 7, 30];
const label = (d) => (d === 0 ? 'Off' : `${d} days`);

function fmt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return '';
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function RuleLockCard() {
  const { selectedTradingAccountId } = useTradingAccounts();
  // Keyed on the account so a switch remounts with fresh state — no reset
  // effect needed, and no stale lock shown for the wrong account.
  return <RuleLockCardInner key={selectedTradingAccountId ?? 'none'} accountId={selectedTradingAccountId} />;
}

function RuleLockCardInner({ accountId }) {
  const { session } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  // No account means nothing to fetch, so nothing to wait for. Starting this
  // `true` left the card on its skeleton forever: the effect below bails out
  // before the fetch, so the `finally` that clears it never ran. The outer
  // component keys this one on the account id, so a fresh account remounts
  // with the right initial value — no reset effect needed.
  const [loading, setLoading] = useState(() => Boolean(accountId));
  const [pending, setPending] = useState(null); // days awaiting confirm
  const [saving, setSaving] = useState(false);

  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken || !accountId) return undefined;
    const ctrl = new AbortController();
    fetchRuleLock({ accessToken, accountId, signal: ctrl.signal })
      .then((s) => { if (!ctrl.signal.aborted) setState(s); })
      .catch(() => { /* card shows the empty state */ })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [accessToken, accountId]);

  async function apply(days) {
    setSaving(true);
    try {
      await setRuleLockDays({ accessToken, accountId, days });
      setState((s) => ({ ...(s || {}), days }));
      setPending(null);
      toast.success(days === 0 ? 'Rule lock off' : `Rule lock set to ${days} days`, days === 0 ? 'Rules are editable until your first trade each day.' : 'From your next save, every rule locks for that long.');
    } catch (e) {
      toast.error('Could not change the lock', e?.message || 'Try again.');
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  const locked = Boolean(state?.locked);
  const current = state?.days ?? 7;
  const remaining = useCountdown(locked ? state?.lockedUntil : null);

  return (
    <CollapsibleCard
      title="Rule lock"
      subtitle="After you save, rules that are on are frozen for the window you choose. Off still holds them for the day once you have traded. Rules that are off can always be turned on."
      accent={locked ? AMBER : ACCENT}
      badge={
        // A styled pill, not a bare string: the header renders `badge` as-is,
        // and plain text in the muted heading colour was invisible.
        <span
          className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={
            locked
              ? { borderColor: AMBER_LINE, backgroundColor: AMBER_TINT, color: AMBER }
              : current === 0
                ? { borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-muted)' }
                : { borderColor: 'var(--dash-border)', backgroundColor: ACCENT_TINT, color: ACCENT }
          }
        >
          {locked ? 'Locked' : label(current)}
        </span>
      }
      defaultOpen={locked}
      icon={
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      {!accountId ? (
        <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
            Add a trading account first
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
            The rule lock is set per account.{' '}
            <Link to="/dashboard/account/trading" className="font-semibold underline underline-offset-2" style={{ color: ACCENT }}>
              Add one
            </Link>{' '}
            and it appears here.
          </p>
        </div>
      ) : loading ? (
        <div className="h-24 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--dash-skeleton)' }} />
      ) : (
        <div className="space-y-5">
          {/* Live state — the timer when locked. */}
          <AnimatePresence initial={false}>
            {locked && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: AMBER_LINE, backgroundColor: AMBER_TINT }}
              >
                <div>
                  <p className="text-[13px] font-bold" style={{ color: AMBER }}>
                    {state.mode === 'day' ? `Set for today's session · resets ${fmt(state.lockedUntil)}` : `Rules locked until ${fmt(state.lockedUntil)}`}
                  </p>
                  <p className="mt-0.5 text-[12px]" style={{ color: 'var(--dash-text-secondary)' }}>
                    {state.mode === 'day' ? 'You have traded today. The lock setting can be changed after the reset.' : 'The window can be changed once the lock lifts.'}
                  </p>
                </div>
                <div className="rounded-lg px-3 py-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: AMBER }}>{state.mode === 'day' ? 'Resets in' : 'Releases in'}</p>
                  <p className="flex items-baseline gap-1.5 whitespace-nowrap leading-none" style={{ color: 'var(--dash-text-primary)' }}>
                    {remaining.split(' ').map((seg, i) => {
                      const m = /^(\d+)([a-z]+)$/.exec(seg);
                      return m ? (
                        <span key={i} className="flex items-baseline gap-0.5">
                          <span className="text-base font-bold tabular-nums">{m[1]}</span>
                          <span className="text-[10px] font-semibold" style={{ color: AMBER }}>{m[2]}</span>
                        </span>
                      ) : (
                        <span key={i} className="font-mono text-base font-bold tabular-nums">{seg}</span>
                      );
                    })}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The window */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--dash-text-faint)' }}>
              Lock rules for
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OPTIONS.map((d) => {
                const active = d === current;
                return (
                  <motion.button
                    key={d}
                    type="button"
                    disabled={locked || saving}
                    whileHover={locked ? undefined : { y: -2 }}
                    whileTap={locked ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    onClick={() => (active ? null : setPending(d))}
                    className="relative rounded-xl border px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: active ? ACCENT : 'var(--dash-border)',
                      backgroundColor: active ? ACCENT_TINT : 'transparent',
                      color: active ? ACCENT : 'var(--dash-text-secondary)',
                    }}
                  >
                    {label(d)}
                  </motion.button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
              {current === 0
                ? 'Off: edit rules freely until your first trade of the day. After that they are set until the daily reset.'
                : 'Changes apply immediately while unlocked. The lock engages 15 minutes after your last save, so you can set up several rules in one sitting.'}
            </p>
          </div>

          {/* Confirm */}
          <AnimatePresence>
            {pending !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}>
                  <p className="text-[13px] font-bold" style={{ color: 'var(--dash-text-primary)' }}>
                    {pending === 0 ? 'Turn the rule lock off?' : `Lock rules for ${pending} days after each save?`}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
                    {pending === 0
                      ? 'No multi-day commitment. Rules stay editable until your first trade each day, then they are set until the daily reset. You decide before you trade, not during.'
                      : `From your next save, no rule on this account can be changed for ${pending} days. You won't be able to shorten this while a lock is running.`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPending(null)}
                      disabled={saving}
                      className="rounded-xl border px-4 py-2 text-[13px] font-semibold"
                      style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="button"
                      onClick={() => apply(pending)}
                      disabled={saving}
                      whileTap={{ scale: 0.97 }}
                      className="rounded-xl px-4 py-2 text-[13px] font-bold disabled:opacity-50"
                      style={{ backgroundColor: ACCENT, color: '#05221c' }}
                    >
                      {saving ? 'Saving…' : pending === 0 ? 'Yes, turn it off' : `Yes, lock for ${pending} days`}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The escape hatch — stated, with the address, not hidden. */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--dash-bg-card)', boxShadow: '0 0 0 1px var(--dash-border)' }}
          >
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
              A running lock can't be shortened or switched off from here. To release it early or fix something set
              by mistake, contact{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline underline-offset-2" style={{ color: 'var(--dash-text-primary)' }}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() =>
                openSupport(
                  locked
                    ? `I'd like my rule lock released early. It's locked until ${fmt(state.lockedUntil)}. Reason: `
                    : 'I have a question about my rule lock: ',
                )
              }
              className="flex-shrink-0 rounded-xl border px-3.5 py-2 text-[12px] font-semibold"
              style={{
                borderColor: locked ? AMBER_LINE : 'var(--dash-border)',
                color: locked ? AMBER : 'var(--dash-text-primary)',
                backgroundColor: locked ? AMBER_TINT : 'transparent',
              }}
            >
              {locked ? 'Request release' : 'Contact support'}
            </button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
