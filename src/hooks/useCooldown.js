import { useEffect, useState } from 'react';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';
import { useSelectedLiveRowIfAny } from '../context/GuardContext';

const FALLBACK_POLL_MS = 30000;

/**
 * Live lockout state for one trading account.
 *
 * Extracted from CooldownBanner because the rules screen needs the same answer
 * for a different reason: while an account is locked the backend refuses rule
 * edits and deletes (see rulesService), so the UI has to disable those controls
 * rather than let someone type a change that will be rejected.
 *
 * State comes from the guard's live row (the engine's cache, read every
 * 1-5 s; Phase 3a, 21 Nov 2026) when this is the selected account, with a
 * slow poll as the fallback. It used to be pushed over Supabase Realtime on
 * trading_accounts, which is switched off: its change-log polling was 76% of
 * database time.
 */
export function useCooldown({ accessToken, tradingAccountId, account }) {
  /*
   * Stored with the account it belongs to. Plain state kept the previous
   * account's lock across a switch until the new account's snapshot landed,
   * so the rules screen could disable (or enable) its controls on the wrong
   * account's lock. A mismatch adopts the new account's seed in this render.
   */
  const seedFor = (id) => ({
    id: id ?? null,
    until: account && account.id === id ? account.cooldownUntil ?? null : null,
    reason: account && account.id === id ? account.cooldownReason ?? null : null,
  });
  const [cdState, setCd] = useState(() => seedFor(tradingAccountId));
  let cd = cdState;
  if (cdState.id !== (tradingAccountId ?? null)) {
    cd = seedFor(tradingAccountId);
    setCd(cd);
  }
  const [now, setNow] = useState(() => Date.now());

  /* The live row for the selected account: a lock starting or ending shows
     within a few seconds, as Realtime did. */
  const live = useSelectedLiveRowIfAny();
  const liveId = live?.source === 'server' && live.id === tradingAccountId ? live.id : null;
  // When the live row covers this account it is the answer (it is fresher
  // than the 30 s poll); otherwise the last poll or the seed.
  if (liveId) cd = { id: liveId, until: live.cooldownUntil ?? null, reason: live.cooldownReason ?? null };

  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    const apply = (row) => {
      if (!row || cancelled) return;
      if (row.id != null && row.id !== tradingAccountId) return;
      setCd({
        id: tradingAccountId,
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
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      snapshot();
    }, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
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
  profit_lock: 'Profit fell back to your lock',
  consecutive_losses: 'Too many losses in a row',
  max_trades_day: 'Daily trade limit reached',
  manual: 'Manually locked',
};
