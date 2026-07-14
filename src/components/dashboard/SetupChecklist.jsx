import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getExchangeCredentialsStatus, exchangeFromBrokerSlug } from '../../api/exchangeCredentialsApi';
import { fetchRulesBundle } from '../../api/rulesApi';

/**
 * Onboarding checklist on the dashboard landing page — the crypto (Delta) flow:
 * create an account → connect the API key → set the rules.
 *
 * This is the path that actually turns a signup into a protected user, so each
 * step reflects REAL state (fetched), not just "do you have an account". It
 * keeps showing until all three are genuinely done, then disappears for good.
 *
 * (It used to list "install the Chrome extension" + "pair" — that's the prop-firm
 * flow, which doesn't apply to an exchange account where enforcement runs
 * server-side against the user's API key.)
 */
export default function SetupChecklist({ accounts, accountsLoading, accessToken }) {
  // null = not fetched yet. Held as one object so the state only ever lands from
  // the async callback — no synchronous setState inside the effect.
  const [result, setResult] = useState(null);

  const hasAccount = accounts.length > 0;
  // Check against the first exchange account — that's the one being onboarded.
  const target = accounts.find((a) => exchangeFromBrokerSlug(a.propFirmSlug)) ?? accounts[0] ?? null;
  const targetId = target?.id ?? null;

  useEffect(() => {
    if (!accessToken || !targetId) return undefined;
    const ctrl = new AbortController();

    (async () => {
      const [conn, rules] = await Promise.all([
        getExchangeCredentialsStatus({ accessToken, accountId: targetId, signal: ctrl.signal }).catch(() => null),
        fetchRulesBundle({ accessToken, tradingAccountId: targetId, signal: ctrl.signal }).catch(() => null),
      ]);
      if (ctrl.signal.aborted) return;
      const instances = rules?.instances ?? rules?.rules ?? [];
      setResult({
        keyConnected: conn?.status === 'active',
        rulesSet: Array.isArray(instances) && instances.some((r) => r?.enabled !== false),
      });
    })();

    return () => ctrl.abort();
  }, [accessToken, targetId]);

  const keyConnected = result?.keyConnected ?? false;
  const rulesSet = result?.rulesSet ?? false;
  // Only "checking" when there's actually something to check and it hasn't landed.
  const checking = Boolean(accessToken && targetId) && result === null;

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
  ];

  const doneCount = steps.filter((s) => s.done).length;

  // Everything done (or nothing to check yet) → the checklist has served its purpose.
  if (accountsLoading || checking) return null;
  if (doneCount === steps.length) return null;

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
