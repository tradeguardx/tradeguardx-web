import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTradingAccounts } from '../../api/tradingAccountsApi';
import { fetchRulesBundle } from '../../api/rulesApi';
import { supabase } from '../../lib/supabaseClient';

// Safety-net poll in case Supabase Realtime isn't enabled / the socket drops.
const FALLBACK_POLL_MS = 30000;

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

// Resolve a daily rule config to a $ value given the day's starting equity.
function resolveAmount(cfg, dse, amountKey, pctKey) {
  if (!cfg) return null;
  const mode = cfg.mode === 'amount' ? 'amount' : 'percent';
  if (mode === 'amount') return n(cfg[amountKey]);
  const pct = n(cfg[pctKey]);
  return pct != null && dse != null ? dse * (pct / 100) : null;
}

/**
 * The trading day as a range: loss limit ← start-of-day → profit target.
 * Current P&L (currentEquity − dailyStartingEquity) is shown live; hitting
 * either end triggers the engine's kill-switch. Equity is pushed via Supabase
 * Realtime, with a slow poll fallback.
 */
export default function DailyLimitBar({ accessToken, tradingAccountId, account }) {
  const currency = account?.accountCurrency || 'USD';
  const [live, setLive] = useState(() => ({
    dailyStartingEquity: n(account?.dailyStartingEquity),
    currentEquity: n(account?.currentEquity),
    dailyPnl: n(account?.dailyPnl),
    equityUpdatedAt: account?.equityUpdatedAt ?? null,
    tradeCountToday: n(account?.tradeCountToday),
    consecutiveLosses: n(account?.consecutiveLosses),
  }));
  const [lossConfig, setLossConfig] = useState(null);
  const [targetConfig, setTargetConfig] = useState(null);
  const [maxTrades, setMaxTrades] = useState(null);
  const [streakCfg, setStreakCfg] = useState(null);

  // Rule configs (rarely change) — fetched per account; drive the guardrail meters.
  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;
    fetchRulesBundle({ accessToken, tradingAccountId })
      .then((bundle) => {
        if (cancelled) return;
        const insts = bundle?.instances || [];
        const find = (slug) => insts.find((i) => i.templateSlug === slug && i.enabled);
        setLossConfig(find('daily-loss')?.config ?? null);
        setTargetConfig(find('daily-profit-target')?.config ?? null);
        setMaxTrades(n(find('max-trades-day')?.config?.maxTrades));
        setStreakCfg(find('close-after-losses')?.config ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, tradingAccountId]);

  // Live equity: Supabase Realtime push (instant) + a slow fallback poll.
  useEffect(() => {
    if (!accessToken || !tradingAccountId) return undefined;
    let cancelled = false;

    const apply = (row) => {
      if (!row || cancelled) return;
      setLive({
        dailyStartingEquity: n(row.daily_starting_equity ?? row.dailyStartingEquity),
        currentEquity: n(row.current_equity ?? row.currentEquity),
        dailyPnl: n(row.daily_pnl ?? row.dailyPnl),
        equityUpdatedAt: row.equity_updated_at ?? row.equityUpdatedAt ?? null,
        tradeCountToday: n(row.trade_count_today ?? row.tradeCountToday),
        consecutiveLosses: n(row.consecutive_losses ?? row.consecutiveLosses),
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
      .channel(`acct-equity-${tradingAccountId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trading_accounts', filter: `id=eq.${tradingAccountId}` },
        (payload) => apply(payload.new),
      )
      .subscribe();

    const id = setInterval(snapshot, FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [accessToken, tradingAccountId]);

  const view = useMemo(() => {
    const dse = live.dailyStartingEquity;
    const ce = live.currentEquity;
    const dp = live.dailyPnl;
    // Prefer the engine's trading P&L (realized + unrealized — deposit/withdrawal
    // immune). Fall back to the equity delta only until the engine persists it.
    const pnl = dp != null ? dp : dse != null && ce != null ? ce - dse : null;
    if (pnl == null) return null;
    // % limits are measured against capital = equity minus today's trading result
    // (i.e. the deposited funds), so a deposit doesn't shrink/inflate the limit.
    const base = dp != null && ce != null ? ce - dp : dse;

    const limit = resolveAmount(lossConfig, base, 'dailyLossAmount', 'dailyLossPct');
    const warn = resolveAmount(lossConfig, base, 'warningAmount', 'warningPct');
    const target = resolveAmount(targetConfig, base, 'dailyTargetAmount', 'dailyTargetPct');

    const inLoss = pnl < 0;
    const drawdown = inLoss ? -pnl : 0;
    const profit = pnl > 0 ? pnl : 0;
    const lossPct = limit && limit > 0 ? Math.min((drawdown / limit) * 100, 100) : 0;
    const targetPct = target && target > 0 ? Math.min((profit / target) * 100, 100) : 0;

    let tier = 'flat';
    if (inLoss) {
      if (limit && drawdown >= limit) tier = 'danger';
      else if (warn != null && drawdown >= warn) tier = 'warn';
      else tier = 'loss';
    } else if (pnl > 0) {
      tier = target && profit >= target ? 'targetHit' : 'profit';
    }

    return { pnl, limit, target, drawdown, profit, lossPct, targetPct, inLoss, tier };
  }, [live, lossConfig, targetConfig]);

  if (!view) return null;

  const RED = '#ef4444';
  const AMBER = '#f59e0b';
  const GREEN = '#34d399';
  const lossFill = view.tier === 'warn' ? AMBER : RED;
  const pnlColor =
    view.pnl > 0 ? GREEN : view.pnl < 0 ? (view.tier === 'warn' ? AMBER : RED) : 'var(--dash-text-primary)';
  const status =
    view.tier === 'targetHit' ? 'Target reached' : view.tier === 'danger' ? 'Loss limit hit' : null;

  const fmt = (v) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  const stale = live.equityUpdatedAt && Date.now() - new Date(live.equityUpdatedAt).getTime() > 60000;
  const hasRange = view.limit != null || view.target != null;

  // Marker position on a 0–100 scale: 50 = start of day, 0 = loss limit, 100 = target.
  const markerLeft = view.inLoss
    ? 50 - (view.lossPct / 100) * 50
    : view.pnl > 0
      ? 50 + (view.targetPct / 100) * 50
      : 50;
  const markerColor = view.inLoss ? lossFill : view.pnl > 0 ? GREEN : 'var(--dash-text-muted)';
  const caption =
    view.inLoss && view.limit != null
      ? `${Math.round(view.lossPct)}% of loss limit used`
      : view.pnl > 0 && view.target != null
        ? `${Math.round(view.targetPct)}% to target`
        : 'Flat — no movement yet today';

  // Guardrail meters: trades used + loss streak.
  const ACCENT = 'var(--accent, #00d4aa)';
  const tradeCount = live.tradeCountToday ?? 0;
  const tradesPct = maxTrades && maxTrades > 0 ? Math.min((tradeCount / maxTrades) * 100, 100) : 0;
  const tradesColor =
    maxTrades == null ? ACCENT : tradeCount >= maxTrades ? RED : tradeCount >= maxTrades - 1 ? AMBER : ACCENT;
  const streak = live.consecutiveLosses ?? 0;
  const softStreak = n(streakCfg?.consecutiveLosses);
  const hardStreak = n(streakCfg?.hardLossCount) ?? 5;
  const softHrs = n(streakCfg?.cooldownHours) ?? 3;
  const hardHrs = n(streakCfg?.hardCooldownHours) ?? 12;
  const streakColor =
    softStreak == null ? ACCENT : streak >= hardStreak ? RED : streak >= softStreak ? AMBER : ACCENT;
  const showMeters = maxTrades != null || softStreak != null;

  return (
    <div
      className="mb-5 rounded-2xl border px-4 py-4"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
            Today&rsquo;s P&amp;L
          </span>
          {status && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${pnlColor}1f`, color: pnlColor }}
            >
              {status}
            </span>
          )}
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color: pnlColor }}>
          {view.pnl >= 0 ? '+' : '-'}
          {fmt(Math.abs(view.pnl))}
        </span>
      </div>

      {hasRange ? (
        <>
          <div className="relative mt-3.5 h-2.5 w-full rounded-full" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
            {/* Zone tints: loss territory on the LEFT, profit territory on the RIGHT */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-full"
              style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.30), rgba(239,68,68,0.05))' }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-full"
              style={{ background: 'linear-gradient(270deg, rgba(52,211,153,0.30), rgba(52,211,153,0.05))' }}
            />
            {/* Center origin (start of day) */}
            <div
              className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: 'var(--dash-text-muted)' }}
            />
            {/* Current-position marker — sits LEFT of center for a loss, RIGHT for profit */}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all duration-500"
              style={{ left: `${markerLeft}%`, backgroundColor: markerColor, boxShadow: `0 0 0 4px ${markerColor}33` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold" style={{ color: view.limit != null ? RED : 'var(--dash-text-faint)' }}>
              {view.limit != null ? `← ${fmt(view.limit)} loss` : 'No loss limit'}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--dash-text-faint)' }}>
              start
            </span>
            <span className="font-semibold" style={{ color: view.target != null ? GREEN : 'var(--dash-text-faint)' }}>
              {view.target != null ? `${fmt(view.target)} target →` : 'No target'}
            </span>
          </div>

          <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
            {caption}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>
          No daily loss limit or profit target set.{' '}
          <Link to="/dashboard/rules" className="text-accent hover:underline">
            Set them
          </Link>
        </p>
      )}

      {showMeters && (
        <div className="mt-3 grid gap-4 border-t pt-3 sm:grid-cols-2" style={{ borderColor: 'var(--dash-border)' }}>
          {maxTrades != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--dash-text-muted)' }}>Trades today</span>
                <span className="font-bold tabular-nums" style={{ color: tradesColor }}>
                  {tradeCount} / {maxTrades}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${tradesPct}%`, backgroundColor: tradesColor }}
                />
              </div>
            </div>
          )}
          {softStreak != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--dash-text-muted)' }}>Loss streak</span>
                <span className="font-bold tabular-nums" style={{ color: streakColor }}>
                  {streak} / {softStreak}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: hardStreak }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2 flex-1 rounded-full"
                    style={{
                      backgroundColor: i < streak ? streakColor : 'var(--dash-bg-input)',
                      outline:
                        i === softStreak - 1 || i === hardStreak - 1
                          ? '1px solid var(--dash-text-faint)'
                          : 'none',
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>
                {softStreak}→{softHrs}h cooldown · {hardStreak}→{hardHrs}h lock
              </p>
            </div>
          )}
        </div>
      )}

      {stale && <p className="mt-1.5 text-[10px] text-amber-400/80">Live feed delayed — showing last known equity.</p>}
    </div>
  );
}
