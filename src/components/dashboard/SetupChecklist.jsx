import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getExchangeCredentialsStatus, exchangeFromBrokerSlug } from '../../api/exchangeCredentialsApi';
import { fetchRulesBundle } from '../../api/rulesApi';
import { fetchNotificationSettings } from '../../api/notificationsApi';

const DONE_DISMISS_KEY = 'tgx_setup_complete_dismissed';

/** One themed icon + color per step — mirrors the Quick Access card palette
 * lower on this page (blue/amber/violet/teal) so the checklist reads as part
 * of the same visual system instead of a plain numbered list. */
const STEP_THEME = [
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.14)', Icon: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
    </svg>
  ) },
  { color: '#f0b429', bg: 'rgba(240,180,41,0.14)', Icon: (p) => (
    // Link/chain — reads as "connection" rather than "credential" (a key icon
    // here was ambiguous with the Security page's password-key iconography).
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.69a4.5 4.5 0 011.24 7.24l-4.5 4.5a4.5 4.5 0 01-6.37-6.36l1.76-1.76m13.35-.63l1.76-1.76a4.5 4.5 0 00-6.36-6.37l-4.5 4.5a4.5 4.5 0 001.24 7.24" />
    </svg>
  ) },
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.14)', Icon: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ) },
  { color: '#2dd4bf', bg: 'rgba(45,212,191,0.14)', Icon: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ) },
];

/**
 * Onboarding checklist on the dashboard landing page — the crypto (Delta) flow:
 * create an account → connect the API key → set the rules → turn on alerts.
 *
 * Each step reflects REAL, fetched state, not just "do you have an account".
 * Completed steps stay visible with a check (so progress is legible); only
 * pending steps are actionable. Once all four are genuinely done it shows a
 * one-time "setup complete" confirmation the user can dismiss.
 */
/** Resolve to {ok,v} so a REJECTED check is distinguishable from a "no" answer. */
function settle(promise) {
  return promise.then((v) => ({ ok: true, v }), () => ({ ok: false, v: null }));
}

export default function SetupChecklist({ accounts, accountsLoading, accountsError, accessToken }) {
  // null = not fetched yet. Held as one object so the state only ever lands from
  // the async callback — no synchronous setState inside the effect. Tagged with
  // the account id it describes (`forId`) so a result computed for a PREVIOUS
  // target is never rendered as if it applied to the current one.
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
    // Wait for the account list. Running early would check with targetId=null,
    // land an all-false result, and flash "you haven't set anything up" at a
    // user who is fully configured.
    if (!accessToken || accountsLoading) return undefined;
    const ctrl = new AbortController();

    (async () => {
      const [conn, rules, notif] = await Promise.all([
        // Account-scoped checks need an account; notifications are per-user.
        targetId
          ? settle(getExchangeCredentialsStatus({ accessToken, accountId: targetId, signal: ctrl.signal }))
          : Promise.resolve({ ok: true, v: null }),
        targetId
          ? settle(fetchRulesBundle({ accessToken, tradingAccountId: targetId, signal: ctrl.signal }))
          : Promise.resolve({ ok: true, v: null }),
        settle(fetchNotificationSettings({ accessToken, signal: ctrl.signal })),
      ]);
      if (ctrl.signal.aborted) return;
      const instances = rules.v?.instances ?? rules.v?.rules ?? [];
      setResult({
        forId: targetId,
        // A check we couldn't complete is UNKNOWN, not "not done" — see below.
        failed: !conn.ok || !rules.ok || !notif.ok,
        keyConnected: conn.v?.status === 'active',
        rulesSet: Array.isArray(instances) && instances.some((r) => r?.enabled !== false),
        notifSet: Boolean(notif.v?.emailNotificationsEnabled || notif.v?.telegramNotificationsEnabled),
      });
    })();

    return () => ctrl.abort();
  }, [accessToken, accountsLoading, targetId]);

  // Ignore a result that describes a different account than the one in view.
  const fresh = result && result.forId === targetId ? result : null;
  const keyConnected = fresh?.keyConnected ?? false;
  const rulesSet = fresh?.rulesSet ?? false;
  const notifSet = fresh?.notifSet ?? false;
  // Only "checking" while the fetch for THIS target is genuinely in flight.
  const checking = Boolean(accessToken) && fresh === null;

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
  // The first not-done step gets a gentle pulse — "do this one next" — rather
  // than leaving all pending steps looking equally urgent.
  const nextIdx = steps.findIndex((s) => !s.done);

  if (accountsLoading || checking) return null;

  // Never present an unverified step as "not done". If the account list or any
  // check failed to load (cold Lambda, dropped network, token refresh), stay
  // silent — telling a fully-configured user to re-connect their exchange and
  // re-enter their rules reads as "my data is gone", which is both alarming and
  // false. Their setup lives in Postgres; a failed read is our problem, not a
  // reason to send them through onboarding again.
  if (accountsError || fresh?.failed) return null;

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

      <div className="mb-5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--dash-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: 'var(--accent, #00d4aa)', boxShadow: '0 0 10px rgba(0,212,170,0.6)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(doneCount / steps.length) * 100}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, i) => {
          const theme = STEP_THEME[i];
          const isNext = i === nextIdx;
          return (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32 + i * 0.07, duration: 0.35, ease: 'easeOut' }}
            >
              <Link
                to={step.href}
                className="group flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-colors hover:border-accent/25 hover:bg-accent/[0.04]"
                style={{ borderColor: isNext ? 'rgba(0,212,170,0.25)' : 'var(--dash-border)', opacity: step.done ? 0.55 : 1 }}
              >
                <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
                  {isNext && (
                    <motion.span
                      className="absolute inset-0 rounded-lg"
                      style={{ backgroundColor: theme.bg }}
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <motion.span
                    whileHover={{ scale: 1.08, rotate: step.done ? 0 : -4 }}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg"
                    style={step.done ? { backgroundColor: 'var(--accent, #00d4aa)' } : { backgroundColor: theme.bg }}
                  >
                    {step.done ? (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="#05221c" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <theme.Icon className="h-4.5 w-4.5" style={{ color: theme.color }} />
                    )}
                  </motion.span>
                  <span
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: 'var(--dash-bg-raised)',
                      border: '1px solid var(--dash-border)',
                      color: 'var(--dash-text-muted)',
                    }}
                  >
                    {step.num}
                  </span>
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
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
