import { useEffect, useRef, useState } from 'react';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';
import { supabase } from '../lib/supabaseClient';

const FALLBACK_POLL_MS = 30000;

/**
 * Live lockout state for one trading account.
 *
 * Extracted from CooldownBanner because the rules screen needs the same answer
 * for a different reason: while an account is locked the backend refuses rule
 * edits and deletes (see rulesService), so the UI has to disable those controls
 * rather than let someone type a change that will be rejected.
 *
 * State is pushed over Supabase Realtime with a slow poll as a fallback, so the
 * lock lifts in the UI at the same moment it lifts server-side.
 */
export function useCooldown({ accessToken, tradingAccountId, account }) {
  const [cd, setCd] = useState(() => ({
    until: account?.cooldownUntil ?? null,
    reason: account?.cooldownReason ?? null,
  }));
  const [now, setNow] = useState(() => Date.now());
  // Supabase returns the SAME channel object for a duplicate topic, and calling
  // .on() on an already-subscribed channel throws. Two components can legitimately
  // watch the same account (the rules screen renders the banner AND reads `locked`
  // to disable its inputs), so each hook instance gets its own topic.
  const topicSuffix = useRef(Math.random().toString(36).slice(2, 10));

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
      .channel(`acct-cooldown-${tradingAccountId}-${topicSuffix.current}`)
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

  // Only tick while locked — no point re-rendering every second otherwise.
  useEffect(() => {
    if (!locked) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  return { locked, untilMs, reason: cd.reason, remainingMs: locked ? untilMs - now : 0 };
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const COOLDOWN_REASON_LABEL = {
  daily_loss: 'Daily loss limit hit',
  daily_target: 'Daily profit target reached',
  consecutive_losses: 'Too many losses in a row',
  max_trades_day: 'Daily trade limit reached',
  manual: 'Manually locked',
};
