import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getExchangeCredentialsStatus, exchangeFromBrokerSlug } from '../../api/exchangeCredentialsApi';
import { fetchRulesBundle } from '../../api/rulesApi';
import { fetchNotificationSettings } from '../../api/notificationsApi';

const DONE_DISMISS_KEY = 'tgx_setup_complete_dismissed';

/**
 * Onboarding checklist on the dashboard landing page — the crypto (Delta) flow:
 * create an account → connect the API key → set the rules → turn on alerts.
 *
 * Each step reflects REAL, fetched state, not just "do you have an account".
 * Completed steps stay visible with a check (so progress is legible); only
 * pending steps are actionable. Once all four are genuinely done it shows a
 * one-time "setup complete" confirmation the user can dismiss.
 */
export default function SetupChecklist({ accounts, accountsLoading, accessToken }) {
  // null = not fetched yet. Held as one object so the state only ever lands from
  // the async callback — no synchronous setState inside the effect.
  const [result, setResult] = useState(null);
  const [doneDismissed, setDoneDismissed] = useState(() => {
    try {
      return localStorage.getItem(DONE_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const hasAccount = accounts.length > 0;
  // Check against the first exchange account — that's the one being onboarded.
  const target = accounts.find((a) => exchangeFromBrokerSlug(a.propFirmSlug)) ?? accounts[0] ?? null;
  const targetId = target?.id ?? null;

  useEffect(() => {
    if (!accessToken) return undefined;
    const ctrl = new AbortController();

    (async () => {
      const [conn, rules, notif] = await Promise.all([
        // Account-scoped checks need an account; notifications are per-user.
        targetId
          ? getExchangeCredentialsStatus({ accessToken, accountId: targetId, signal: ctrl.signal }).catch(() => null)
          : Promise.resolve(null),
        targetId
          ? fetchRulesBundle({ accessToken, tradingAccountId: targetId, signal: ctrl.signal }).catch(() => null)
          : Promise.resolve(null),
        fetchNotificationSettings({ accessToken, signal: ctrl.signal }).catch(() => null),
      ]);
      if (ctrl.signal.aborted) return;
      const instances = rules?.instances ?? rules?.rules ?? [];
      setResult({
        keyConnected: conn?.status === 'active',
        rulesSet: Array.isArray(instances) && instances.some((r) => r?.enabled !== false),
        notifSet: Boolean(notif?.emailNotificationsEnabled || notif?.telegramNotificationsEnabled),
      });
    })();

    return () => ctrl.abort();
  }, [accessToken, targetId]);

  const keyConnected = result?.keyConnected ?? false;
  const rulesSet = result?.rulesSet ?? false;
  const notifSet = result?.notifSet ?? false;
  // Only "checking" while the fetch is genuinely in flight.
  const checking = Boolean(accessToken) && result === null;

  const steps = [
    {
      num: 1,
      label: 'Create a trading account',
      hint: 'Tell us which exchange and how much you trade with.',
      href: '/dashboard/account/trading',
      done: hasAccount,
    },
    {
      num: 2,
      label: 'Connect your Delta API key',
      hint: 'Read + Trading permissions. Without this the kill switch can’t act.',
      href: '/dashboard/account/trading',
      done: keyConnected,
    },
    {
      num: 3,
      label: 'Set your risk rules',
      hint: 'Daily loss limit, max trades, risk per trade.',
      href: '/dashboard/rules',
      done: rulesSet,
    },
    {
      num: 4,
      label: 'Turn on breach alerts',
      hint: 'Get pinged on Telegram or email the moment a rule trips.',
      href: '/dashboard/account/notifications',
      done: notifSet,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (accountsLoading || checking) return null;

  // Everything done → one-time "you're fully protected" confirmation, dismissible.
  if (allDone) {
    if (doneDismissed) return null;
    const dismiss = () => {
      try {
        localStorage.setItem(DONE_DISMISS_KEY, '1');
      } catch {
        /* ignore */
      }
      setDoneDismissed(true);
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4 rounded-2xl border p-5"
        style={{ borderColor: 'rgba(0,212,170,0.3)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
      >
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>
            Setup complete — you’re fully protected.
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--dash-text-muted)' }}>
            Your kill switch is armed and alerts are on. Trade as normal — we’ll step in if you cross a line.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--dash-text-faint)' }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className="mb-6 rounded-2xl border p-5"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-secondary)' }}>
          Finish setting up your protection
        </p>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--dash-text-muted)' }}>
          {doneCount}/{steps.length} done
        </span>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--dash-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%`, backgroundColor: 'var(--accent, #00d4aa)' }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <Link
            key={step.num}
            to={step.href}
            className="group flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:border-accent/20 hover:bg-accent/[0.03]"
            style={{ borderColor: 'var(--dash-border)', opacity: step.done ? 0.6 : 1 }}
          >
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold"
              style={
                step.done
                  ? { borderColor: 'var(--accent, #00d4aa)', backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }
                  : { borderColor: 'rgba(255,255,255,0.08)', color: 'var(--dash-text-muted)' }
              }
            >
              {step.done ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.num
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-sm font-medium"
                style={{
                  color: 'var(--dash-text-secondary)',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}
              >
                {step.label}
              </span>
              {!step.done && (
                <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>
                  {step.hint}
                </span>
              )}
            </span>
            {!step.done && (
              <svg
                className="h-4 w-4 flex-shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
