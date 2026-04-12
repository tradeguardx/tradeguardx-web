import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useToast } from '../components/common/ToastProvider';
import DashboardPageBanner from '../components/dashboard/DashboardPageBanner';
import SparkleOverlay from '../components/common/SparkleOverlay';
import {
  createPairingCode,
  fetchPairingStatus,
  revokePairingSessions,
} from '../api/tradingAccountsApi';

const stepFade = {
  hidden: { opacity: 0, y: 8 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function formatExpiry(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function IconAccount() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5a2.25 2.25 0 002.25-2.25V13.5M18 9l3 3m0 0l-3 3m3-3H9" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

export default function PairingPage() {
  const { session } = useAuth();
  const { accounts, accountsLoading, selectedAccount } = useTradingAccounts();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [pairResult, setPairResult] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pairingStatus, setPairingStatus] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const accountLabel = useMemo(() => {
    if (!selectedAccount) return 'No account selected';
    const name = selectedAccount.name || 'Trading account';
    const suffix = selectedAccount.propFirmSlug ? ` · ${selectedAccount.propFirmSlug}` : '';
    return `${name}${suffix}`;
  }, [selectedAccount]);

  const loadStatus = useCallback(async () => {
    if (!session?.access_token || !selectedAccount?.id) {
      setPairingStatus(null);
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    try {
      const data = await fetchPairingStatus({
        accessToken: session.access_token,
        tradingAccountId: selectedAccount.id,
      });
      setPairingStatus(data);
    } catch {
      setPairingStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [session?.access_token, selectedAccount?.id]);

  useEffect(() => {
    setPairResult(null);
    setPairingStatus(null);
  }, [selectedAccount?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!session?.access_token || !selectedAccount?.id) return undefined;
    const t = setInterval(() => {
      fetchPairingStatus({
        accessToken: session.access_token,
        tradingAccountId: selectedAccount.id,
      })
        .then(setPairingStatus)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [session?.access_token, selectedAccount?.id]);

  const waitEndMs = pairResult?.expiresAt ? new Date(pairResult.expiresAt).getTime() : 0;
  const connected = pairingStatus?.connected === true;
  const waitingActive = Boolean(pairResult?.code && !connected && waitEndMs > nowTick);
  const waitRemainingMs = waitingActive ? Math.max(0, waitEndMs - nowTick) : 0;

  useEffect(() => {
    if (!waitingActive || !session?.access_token || !selectedAccount?.id) return undefined;
    const fast = setInterval(() => {
      fetchPairingStatus({
        accessToken: session.access_token,
        tradingAccountId: selectedAccount.id,
      })
        .then(setPairingStatus)
        .catch(() => {});
    }, 2000);
    return () => clearInterval(fast);
  }, [waitingActive, session?.access_token, selectedAccount?.id]);

  useEffect(() => {
    if (connected && pairResult) {
      setPairResult(null);
    }
  }, [connected, pairResult]);

  const generateCode = async () => {
    if (!session?.access_token || !selectedAccount?.id) return;
    setLoading(true);
    setPairResult(null);
    try {
      const data = await createPairingCode({
        accessToken: session.access_token,
        accountId: selectedAccount.id,
      });
      setPairResult({
        code: data?.code || '',
        expiresAt: data?.expiresAt || null,
      });
      toast.success('Code generated', 'Paste it in the extension within 5 minutes.');
    } catch (e) {
      toast.error('Could not generate code', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!pairResult?.code) return;
    try {
      await navigator.clipboard.writeText(pairResult.code);
      toast.success('Copied', 'Pairing code copied to clipboard.');
    } catch {
      toast.error('Copy failed', 'Select and copy manually.');
    }
  };

  const disconnect = async () => {
    if (!session?.access_token || !selectedAccount?.id) return;
    setDisconnecting(true);
    try {
      await revokePairingSessions({
        accessToken: session.access_token,
        tradingAccountId: selectedAccount.id,
      });
      setPairingStatus({ connected: false, lastSeenAt: null });
      setPairResult(null);
      toast.success('Disconnected', 'The extension will need to pair again for this account.');
    } catch (e) {
      toast.error('Could not disconnect', e?.message || 'Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const canShowExtensionStatus = Boolean(selectedAccount?.id && !accountsLoading);

  const pairingBadge = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent"
    >
      <span className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_var(--tw-shadow-color)] shadow-accent" />
      Browser extension
    </span>
  );

  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <DashboardPageBanner
          accent="accent"
          title="Pairing"
          subtitle="Link the TradeGuardX extension to a trading account with a secure, time-limited code."
          badge={pairingBadge}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
          style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
        >
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-accent/[0.07] blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-3xl" />
          <div className="relative">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border text-accent"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
            >
              <IconAccount />
            </div>
            <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
              Add a trading account first
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: 'var(--dash-text-secondary)' }}>
              Pairing binds the extension to one account. Create an account, then come back here to generate your code.
            </p>
            <Link
              to="/dashboard/account/trading"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-surface-950 shadow-lg shadow-accent/15 transition-all hover:bg-accent-hover hover:shadow-accent/25"
            >
              Create trading account
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl"
    >
      <DashboardPageBanner
        accent="accent"
        title="Pairing"
        subtitle="Link your browser extension to the account in the header. Codes expire in five minutes; access stays fresh with automatic refresh."
        badge={pairingBadge}
        actions={(
          <Link
            to="/dashboard/install-extension"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:border-accent/40 hover:bg-accent/10"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-secondary)' }}
          >
            <IconPlug />
            Extension setup
          </Link>
        )}
      />

      <div
        className="pairing-main-card relative overflow-hidden rounded-2xl border p-6 sm:p-8"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
      >
        <div className="pairing-orb pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/[0.14] blur-2xl" />
        <div className="pairing-orb pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-teal-400/[0.12] blur-2xl" />
        <div className="pairing-card-grid pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 to-emerald-500/5 text-accent shadow-[0_0_24px_rgba(0,212,170,0.12)]">
                <IconAccount />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--dash-text-muted)' }}>
                  Selected account
                </p>
                <p className="mt-1 font-display text-lg font-bold tracking-tight" style={{ color: 'var(--dash-text-primary)' }}>
                  {accountsLoading ? 'Loading…' : accountLabel}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
                  Use the header switcher to pick which account the extension will control.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/account/trading"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:border-accent/25 hover:text-accent"
              style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              Manage accounts
              <svg className="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {canShowExtensionStatus && (
            <motion.div
              custom={0}
              variants={stepFade}
              initial="hidden"
              animate="show"
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--dash-text-muted)' }}>
                Link status
              </span>
              {statusLoading ? (
                <span className="pairing-pill-checking inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  Checking…
                </span>
              ) : connected ? (
                <span className="pairing-pill-live inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-45" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)]" />
                  </span>
                  Connected to extension
                </span>
              ) : (
                <span className="pairing-pill-idle inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Not connected — generate a code below
                </span>
              )}
            </motion.div>
          )}

          {!connected && (
            <motion.div
              custom={1}
              variants={stepFade}
              initial="hidden"
              animate="show"
              className="mt-8 grid gap-3 sm:grid-cols-3"
            >
              {[
                { n: 1, t: 'Generate', d: 'One-time code, 5 min' },
                { n: 2, t: 'Copy', d: 'Use the copy button' },
                { n: 3, t: 'Paste', d: 'In the extension' },
              ].map((s, i) => (
                <div
                  key={s.n}
                  className="flex gap-3 rounded-xl border px-3 py-3 sm:flex-col sm:items-start"
                  style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 font-display text-sm font-bold text-accent">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{s.t}</p>
                    <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--dash-text-faint)' }}>{s.d}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {waitingActive && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pairing-wait relative mt-6 overflow-hidden rounded-2xl px-5 py-4"
            >
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="pairing-wait-icon mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="pairing-wait-title font-display text-sm font-bold">
                      Waiting for the extension…
                    </p>
                    <p className="pairing-wait-body mt-1 max-w-md text-xs leading-relaxed">
                      Paste the code in TradeGuardX. Code lifetime is five minutes —{' '}
                      <span className="pairing-wait-mono font-mono tabular-nums">
                        {formatCountdown(waitRemainingMs)}
                      </span>
                      {' '}remaining.
                    </p>
                  </div>
                </div>
                <div className="pairing-wait-timer rounded-xl px-4 py-2.5 text-center">
                  <p className="pairing-wait-timer-label text-[10px] font-bold uppercase tracking-widest">Time left</p>
                  <p className="pairing-wait-timer-digits font-mono text-2xl font-bold tabular-nums leading-tight">
                    {formatCountdown(waitRemainingMs)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {connected ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pairing-connected relative mt-6 overflow-hidden rounded-2xl border px-5 py-5"
            >
              <SparkleOverlay active density={20} />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="pairing-connected-icon flex h-12 w-12 items-center justify-center rounded-2xl border">
                    <IconSpark />
                  </div>
                  <div>
                    <p className="pairing-connected-title font-display text-base font-bold">
                      You&apos;re linked
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
                      {pairingStatus?.lastSeenAt
                        ? `Last activity ${formatExpiry(pairingStatus.lastSeenAt)}`
                        : 'Extension session is active for this account.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="pairing-disconnect-btn rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </motion.div>
          ) : null}

          {!connected && (
            <>
              <motion.div
                custom={2}
                variants={stepFade}
                initial="hidden"
                animate="show"
                className="mt-8"
              >
                <button
                  type="button"
                  onClick={generateCode}
                  disabled={loading || !selectedAccount?.id}
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-surface-950 shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface-950/30 border-t-surface-950" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <IconSpark />
                      Generate pairing code
                    </>
                  )}
                </button>
                <p className="mt-3 max-w-lg text-xs leading-relaxed" style={{ color: 'var(--dash-text-faint)' }}>
                  Codes are single-use and expire in five minutes. After pairing, the extension refreshes its access token automatically.
                </p>
              </motion.div>

              {pairResult?.code && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="pairing-code-shell relative mt-6 overflow-hidden rounded-2xl border-2 p-6 sm:p-7"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/85 to-transparent" />
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="pairing-code-label text-[10px] font-bold uppercase tracking-[0.2em]">
                      Your pairing code
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="pairing-code-copy inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p
                    className="select-all font-mono text-2xl font-bold tracking-[0.2em] sm:text-3xl sm:tracking-[0.22em]"
                    style={{ color: 'var(--dash-text-primary)' }}
                  >
                    {pairResult.code}
                  </p>
                  {pairResult.expiresAt && (
                    <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
                      <svg className="h-3.5 w-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Expires {formatExpiry(pairResult.expiresAt)}
                    </p>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
