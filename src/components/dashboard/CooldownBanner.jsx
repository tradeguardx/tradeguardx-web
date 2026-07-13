import { useEffect, useState } from 'react';
import { fetchTradingAccounts } from '../../api/tradingAccountsApi';
import { supabase } from '../../lib/supabaseClient';

const FALLBACK_POLL_MS = 30000;

const REASON_LABEL = {
  daily_loss: 'Daily loss limit hit',
  daily_target: 'Daily profit target reached',
  consecutive_losses: 'Too many losses in a row',
  max_trades_day: 'Daily trade limit reached',
  manual: 'Manually locked',
};

function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * Lockout banner with a live countdown. While the account's cooldown_until is in
 * the future, shows why it's locked and when it unlocks. Equity/cooldown state
 * is pushed via Supabase Realtime with a slow poll fallback.
 */
export default function CooldownBanner({ accessToken, tradingAccountId, account }) {
  const [cd, setCd] = useState(() => ({
    until: account?.cooldownUntil ?? null,
    reason: account?.cooldownReason ?? null,
  }));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    const apply = (row) => {
      if (!row || cancelled) return;
      setCd({
        until: row.cooldown_until ?? row.cooldownUntil ?? null,
        reason: row.cooldown_reason ?? row.cooldownReason ?? null,
      });
    };
    const snapshot = async () => {
      try {
        const accounts = await fetchTradingAccounts({ accessToken });
        const a = accounts.find((x) => x.id === tradingAccountId);
        if (a) apply(a);
      } catch {
        /* keep last known */
      }
    };
    snapshot();
    const channel = supabase
      .channel(`acct-cooldown-${tradingAccountId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` },
        (p) => apply(p.new),
      )
      .subscribe();
    const id = setInterval(snapshot, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [accessToken, tradingAccountId]);

  const untilMs = cd.until ? new Date(cd.until).getTime() : null;
  const locked = untilMs != null && untilMs > now;

  useEffect(() => {
    if (!locked) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  if (!locked) return null;

  const reasonLabel = REASON_LABEL[cd.reason] || 'Risk lockout';
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
              {reasonLabel} · new trades auto-close until unlock at {unlockTime}.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold tabular-nums" style={{ color: '#ef4444' }}>
            {fmtCountdown(untilMs - now)}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--dash-text-faint)' }}>until unlock</p>
        </div>
      </div>
    </div>
  );
}
