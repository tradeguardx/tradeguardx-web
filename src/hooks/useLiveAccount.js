import { useEffect, useRef, useState } from 'react';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';
import { supabase } from '../lib/supabaseClient';

const FALLBACK_POLL_MS = 30_000;

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/**
 * The live row for one trading account — pushed over Supabase Realtime with a
 * slow poll as the fallback. One source for session P&L, counters and lock,
 * shared by Overview and Live guard so the same figure never disagrees.
 */
export function useLiveAccount({ accessToken, tradingAccountId, initial }) {
  const [live, setLive] = useState(() => normalise(initial));
  const topic = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => {
    setLive(normalise(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingAccountId]);

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    const apply = (row) => { if (row && !cancelled) setLive(normalise(row)); };
    const snapshot = async () => {
      try {
        const accounts = await fetchTradingAccounts({ accessToken });
        const a = accounts.find((x) => x.id === tradingAccountId);
        if (a) apply(a);
      } catch { /* keep last known */ }
    };
    snapshot();
    const channel = supabase
      .channel(`live-account-${tradingAccountId}-${topic.current}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` }, (p) => apply(p.new))
      .subscribe();
    const id = setInterval(snapshot, FALLBACK_POLL_MS);
    return () => { cancelled = true; clearInterval(id); supabase.removeChannel(channel); };
  }, [accessToken, tradingAccountId]);

  return live;
}

function normalise(row) {
  if (!row) return null;
  return {
    dailyPnl: n(row.daily_pnl ?? row.dailyPnl),
    dailyStartingEquity: n(row.daily_starting_equity ?? row.dailyStartingEquity),
    currentEquity: n(row.current_equity ?? row.currentEquity),
    equityUpdatedAt: row.equity_updated_at ?? row.equityUpdatedAt ?? null,
    tradeCountToday: n(row.trade_count_today ?? row.tradeCountToday),
    consecutiveLosses: n(row.consecutive_losses ?? row.consecutiveLosses),
    cooldownUntil: row.cooldown_until ?? row.cooldownUntil ?? null,
    cooldownReason: row.cooldown_reason ?? row.cooldownReason ?? null,
    accountSize: n(row.account_size ?? row.accountSize),
    accountCurrency: row.account_currency ?? row.accountCurrency ?? 'USD',
    dailyResetTimeLocal: row.daily_reset_time_local ?? row.dailyResetTimeLocal ?? null,
    timezone: row.timezone ?? null,
  };
}
