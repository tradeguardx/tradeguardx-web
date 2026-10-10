import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useShare } from '../context/ShareContext';
import { useLiveAccount } from '../hooks/useLiveAccount';
import ShareCardsStrip from '../components/share/ShareCardsStrip';
import { sessionOf, fmtMoney } from '../lib/session';
import { fetchJournalStats, fetchTaxSummary, fetchJournalTrades } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { brokerLabel } from '../lib/labels';
import { ICON } from '../components/dashboard/shell/icons';
import { sx } from '../components/dashboard/shell/sx';
import { pillOf } from '../components/dashboard/shell/lifecycleShell';
import { formatRemaining } from '../components/dashboard/shell/format';

/**
 * Overview — transcribed from the reference (lines 539–685). Inline styles
 * are the reference's, via sx(). Data comes from the real selectors; where
 * the reference seeds an insight we cannot compute, the honest empty from
 * its "fresh account" branch is used instead.
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';

/**
 * What is still outstanding before anything is enforced.
 *
 * Removed once, when it listed the same four steps the setup flow walks and
 * was a second place to keep in step. It comes back because the flow now
 * stops at billing: rules and alerts are deliberately left for afterwards,
 * and without this there was nothing anywhere saying they were still owed —
 * the dashboard simply reported "not protected" with no account of why.
 *
 * All five, including the three already done. The ticks are the point: after
 * paying, a list of what remains reads very differently from a list that
 * shows how far you have come.
 */
/** "14 Oct" — short, unambiguous, and the same shape as the trial banner. */
function fmtDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function SetupCard({ steps, doneCount, navigate }) {
  return (
        <section style={sx('margin-bottom:20px;border:1px solid var(--mint-line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
          <div style={sx('padding:20px 22px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--mint-tint),transparent)')}>
            <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
              <h2 style={sx("margin:0;font:600 19px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.01em")}>Finish setup to turn the guard on</h2>
              <span style={sx('font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2)')}>{doneCount} of {steps.length} done</span>
            </div>
            {/* The copy named steps 2 and 3 as the ones that matter, which was
                true when this card was the whole of setup. By the time anyone
                sees it now those are already ticked, and what is left is the
                rules — the engine has a key, an entitlement and nothing to
                enforce. */}
            <p style={sx('margin:7px 0 0;font-size:13px;color:var(--ink-2);max-width:78ch')}>The engine acts on rules, so until one is switched on there is nothing for it to do. Alerts are the only optional step — the guard acts whether or not it can reach you.</p>
            <div style={sx('margin-top:14px;height:5px;border-radius:999px;background:var(--surface-3);overflow:hidden')}>
              <div style={sx('height:100%;border-radius:999px;background:var(--mint-solid)', { width: `${(doneCount / steps.length) * 100}%` })} />
            </div>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))')}>
            {steps.map((st) => (
              /* A column with the copy growing and the button pinned to the
                 bottom. Left to flow, each CTA landed wherever its own body
                 text ended, so five buttons sat at five heights and the row
                 read as five unrelated cards rather than one sequence. */
              <div key={st.title} style={sx('display:flex;flex-direction:column;padding:17px 20px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)')}>
                <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:9px')}>
                  <span style={sx('flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center', { background: st.tint, color: st.accent })}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={st.d[0]} /><path d={st.d[1]} /></svg>
                  </span>
                  <span style={sx('font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase', { color: st.statusFg })}>{st.status}</span>
                </div>
                <div style={sx('font-size:14px;font-weight:600;letter-spacing:-.005em')}>{st.title}</div>
                <p style={sx('flex:1;margin:5px 0 12px;font-size:12.5px;color:var(--ink-3);line-height:1.5')}>{st.body}</p>
                {(!st.done || st.ending) && (
                  <button type="button" onClick={() => navigate(st.to)} style={sx('align-self:flex-start;padding:7px 12px;border:1px solid var(--ink);border-radius:8px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>{st.cta}</button>
                )}
              </div>
            ))}
          </div>
        </section>
  );
}

export default function OverviewPage() {
  const { session, user } = useAuth();
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const { selected: g, life } = useGuard();
  const { openShare, items: shareItems, awards: shareAwards, canShare } = useShare();
  const navigate = useNavigate();
  const accessToken = session?.access_token;
  const live = useLiveAccount({ accessToken, tradingAccountId: selectedTradingAccountId, initial: selectedAccount });
  const s = useMemo(() => sessionOf(live, g.rules), [live, g.rules]);

  const [stats, setStats] = useState(null);
  const [tax, setTax] = useState(null);
  const [activity, setActivity] = useState(null);
  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    const opt = { accessToken, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal };
    fetchJournalStats({ ...opt, days: 90 }).then((r) => !ctrl.signal.aborted && setStats(r)).catch(() => {});
    fetchTaxSummary(opt).then((r) => !ctrl.signal.aborted && setTax(r)).catch(() => {});
    Promise.all([
      fetchBreaches({ accessToken, tradingAccountId: selectedTradingAccountId, limit: 5, signal: ctrl.signal }).catch(() => []),
      fetchJournalTrades({ ...opt, limit: 5 }).catch(() => []),
    ]).then(([breaches, trades]) => {
      if (ctrl.signal.aborted) return;
      const ev = [];
      for (const b of breaches || []) ev.push({ t: new Date(b.createdAt).getTime(), text: b.message, kind: b.severity === 'critical' ? 'rule' : 'alert', amt: '', fg: 'var(--ink-3)', dot: b.severity === 'critical' ? 'var(--red-solid)' : 'var(--amber-solid)' });
      const list = Array.isArray(trades) ? trades : trades?.trades ?? [];
      for (const t of list) {
        if (!t?.closedAt) continue;
        const pnl = Number(t.realizedPnl ?? t.pnl ?? t.netPnl);
        ev.push({ t: new Date(t.closedAt).getTime(), text: `${t.symbol ?? 'Position'} ${String(t.side ?? '').toLowerCase()} closed`, kind: 'trade', amt: Number.isFinite(pnl) ? fmtMoney(pnl, s.currency, { sign: true }) : '', fg: pnl < 0 ? 'var(--red)' : pnl > 0 ? 'var(--mint)' : 'var(--ink-3)', dot: pnl < 0 ? 'var(--red-solid)' : 'var(--mint-solid)' });
      }
      ev.sort((a, b) => b.t - a.t);
      setActivity(ev.slice(0, 5));
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedTradingAccountId]);

  const noAccount = !accountsLoading && !selectedAccount;

  /*
   * ONBOARDING IS NOT DONE UNTIL THE GUARD CAN ACT.
   *
   * Having an account is step two of four. Treating it as the finish line
   * meant someone who created one and clicked Overview was dropped here with
   * the flow gone — an account, no key, no subscription, and nothing watching
   * anything. The three gaps below are the remaining steps, so Overview hands
   * them back to the flow until all of them are closed.
   *
   * `tgx_setup_dismissed` is the escape. Someone who pressed "Not now — leave
   * the guard off" has made a decision, and bouncing them to a price every
   * time they click Overview would be badgering rather than helping. The
   * banner keeps saying so; the redirect stops.
   */
  /*
   * WITH NO ACCOUNT THE GAPS ARE EMPTY, AND THAT IS NOT "DONE".
   *
   * The guard slice never loads for an account that does not exist, and
   * gapsOf fails open on unloaded data — correctly, so a pending fetch is
   * never reported as a missing key. The side effect here was that a brand
   * new user read as five of five done, so the card hid itself at the exact
   * moment it is the only useful thing on the page.
   *
   * Nothing is done before there is an account, except billing, which someone
   * can genuinely already hold.
   */
  const preds = noAccount
    ? [false, false, false, false, false]
    : [
        !g.gaps.some((x) => x.key === 'setup'),
        !g.gaps.some((x) => x.key === 'key'),
        !g.gaps.some((x) => x.key === 'billing'),
        !g.gaps.some((x) => x.key === 'alerts'),
        !g.gaps.some((x) => x.key === 'rules'),
      ];
  const firstUndone = preds.indexOf(false);

  /*
   * BILLING AFTER A CANCELLATION IS NOT A PLAIN "DONE".
   *
   * It is also not undone. The mandate exists and the days are still running,
   * so resetting the step would be false and its CTA would send someone to
   * set up billing they already have.
   *
   * What is untrue is the unqualified tick: the card's whole promise is
   * "finish setup to turn the guard on", and for this user finishing all five
   * still ends with the guard switching off on the date below. So the step
   * keeps its place in the count and says when it lapses.
   */
  const canceled = Boolean(user?.subscriptionCanceled);
  /* Had the free week and used it — not the same as never having started. */
  const spent = Boolean(user?.isExpired);
  const endsOn = fmtDay(user?.trialEndsAt);
  const billingStep = canceled
    ? {
        title: 'Set up billing',
        body: endsOn
          ? `Cancelled. Your access runs until ${endsOn} — after that nothing is enforced, whatever else is switched on.`
          : 'Cancelled. Your access runs to the end of the trial — after that nothing is enforced.',
        accent: 'var(--amber)', tint: 'var(--amber-tint)', d: ICON.plan,
        to: '/dashboard/account/billing', cta: 'Resubscribe',
        /* Done for the count, but it must still offer the way back. */
        ending: true, statusText: endsOn ? `Ends ${endsOn}` : 'Ending', statusColor: 'var(--amber)',
      }
    : spent
      ? {
          /* The free week is gone. Offering it again is a promise checkout
             will not keep — `trialDaysForUser` gives a spent trial 0 days. */
          title: 'Set up billing',
          body: 'Your free trial has ended, so nothing is enforcing your rules. Subscribe to switch the guard back on — the first charge is today.',
          accent: 'var(--amber)', tint: 'var(--amber-tint)', d: ICON.plan,
          to: '/dashboard/activate', cta: 'See plans',
        }
      : { title: 'Set up billing', body: 'Free for 7 days, nothing charged today. Until this is done your rules are written down but nothing enforces them.', accent: 'var(--mint)', tint: 'var(--mint-tint)', d: ICON.plan, to: '/dashboard/activate', cta: 'Start 7 days free' };

  const steps = [
    { title: 'Create a trading account', body: 'Tell us which exchange you trade and how the balance is tracked.', accent: 'var(--blue)', tint: 'rgba(31,111,208,0.12)', d: ICON.bank, to: '/dashboard/setup', cta: 'Add an account' },
    { title: 'Connect your API key', body: 'It needs permission to trade. That is what lets us close a position for you.', accent: 'var(--amber)', tint: 'var(--amber-tint)', d: ICON.connect, to: '/dashboard/connect', cta: 'Connect the key' },
    billingStep,
    { title: 'Turn on alerts', body: 'Telegram is the fast one. Without a channel a breach happens silently.', accent: 'var(--mint)', tint: 'var(--mint-tint)', d: ICON.bell, to: '/dashboard/alerts', cta: 'Set up alerts' },
    { title: 'Set your rules', body: 'Written while calm. Two are enough to start: a daily loss limit and a trade cap.', accent: 'var(--violet)', tint: 'rgba(109,63,212,0.12)', d: ICON.rules, to: '/dashboard/rules', cta: 'Choose rules' },
  ].map((st, i) => {
    const done = preds[i];
    const next = !done && firstUndone === i;
    return {
      ...st,
      done,
      status: st.statusText && done ? st.statusText : done ? 'Done' : next ? 'Do this next' : 'Not done',
      statusFg: st.statusColor && done ? st.statusColor : done ? 'var(--mint)' : next ? 'var(--amber)' : 'var(--ink-3)',
    };
  });
  const doneCount = preds.filter(Boolean).length;
  /* No longer gated on having an account: step one IS adding one, and that is
     the first thing a new user needs to see laid out. */
  const showSetup = doneCount < steps.length;

  const setupGaps = ['setup', 'key', 'billing'];
  const setupIncomplete = Boolean(g?.gaps?.some((x) => setupGaps.includes(x.key)));
  let setupDismissed = false;
  try {
    setupDismissed = typeof window !== 'undefined' && window.localStorage?.getItem('tgx_setup_dismissed') === '1';
  } catch {
    /* Private window or blocked storage — treat as not dismissed. */
  }
  const d = g.describe;
  /* The hero: the plan's own words where the state has them (cancelled,
     confirming, ended), otherwise the guard's description of this account. */
  const heroPill = pillOf(life, d, g.guard);
  const heroTitle = life && !life.setup && life.hero ? life.hero.title : d.title;
  const heroSub = life && !life.setup && life.hero ? life.hero.sub : d.sub;
  const cur = s.currency;
  const venue = selectedAccount ? brokerLabel(selectedAccount.propFirmSlug) : 'your exchange';
  const fmt0 = (v) => fmtMoney(v, cur, { decimals: 0 });

  // ── dial ────────────────────────────────────────────────────────────
  const losing = s.pnl != null && s.pnl < 0;
  const usedPct = s.budgetPct ?? 0;
  const towardTarget = s.target && s.pnl > 0 ? Math.min(100, (s.pnl / s.target) * 100) : 0;
  const unprot = g.guard === 'unprotected';
  const dialPct = unprot ? 0 : losing ? usedPct : towardTarget;
  const C = 452.4;
  const dial = {
    pct: `${Math.round(dialPct)}%`,
    color: unprot ? 'var(--ink-faint)' : losing ? (usedPct > 70 ? 'var(--red-solid)' : 'var(--amber-solid)') : 'var(--mint-solid)',
    tint: unprot ? 'var(--surface-3)' : losing ? (usedPct > 70 ? 'var(--red-tint)' : 'var(--amber-tint)') : 'var(--mint-tint)',
    dash: `${((C * dialPct) / 100).toFixed(1)} ${C}`,
    label: unprot ? 'nothing measured yet' : losing ? "of today's loss budget spent" : "of the way to today's target",
  };

  // ── facts ───────────────────────────────────────────────────────────
  const budgetLeft = s.lossLimit ? fmt0(Math.max(0, s.lossLimit - s.budgetUsed)) : '—';
  const facts = g.guard === 'armed'
    ? [{ k: 'Runs on', v: 'Our servers', note: 'not your browser', fg: 'var(--ink)' }, { k: 'Watching', v: 'Live', note: 'even with this tab shut', fg: 'var(--ink)' }, { k: 'Your key', v: 'Can trade', note: 'cannot withdraw', fg: 'var(--mint)' }]
    : g.guard === 'watching'
      ? [{ k: 'Protecting', v: 'Nothing', note: 'read-only key', fg: 'var(--amber)' }, { k: 'Alerts', v: g.gap?.key === 'alerts' ? 'Off' : 'Working', note: g.gap?.key === 'alerts' ? 'no channel' : 'Telegram + email', fg: 'var(--ink)' }, { k: 'Budget left', v: budgetLeft, note: s.lossLimit ? `of ${fmt0(s.lossLimit)} today` : 'no loss rule', fg: 'var(--red)' }]
      : g.guard === 'locked'
        ? [{ k: 'Clears', v: formatRemaining(g.lockRemainingMs), note: 'no early exit', fg: 'var(--red)' }, { k: 'Reason', v: g.lockReason === 'manual' ? 'Manual' : 'Rule', note: g.lockReason === 'manual' ? 'you started it' : 'a rule fired', fg: 'var(--ink)' }, { k: 'Anything you open', v: 'Closed', note: 'for the whole lock', fg: 'var(--ink)' }]
        : [
          { k: 'Protecting', v: 'Nothing', note: g.gap?.short || 'setup unfinished', fg: 'var(--red)' },
          { k: 'Rules on', v: `${g.rulesOn}/${g.rulesTotal}`, note: g.rulesOn > 0 ? 'ready to go' : 'none switched on', fg: 'var(--ink)' },
          /* The four steps the flow actually walks. Choosing an exchange and
             naming the account are both satisfied by having one, so they
             count two. It said 5 while the flow said four, which is the kind
             of mismatch that makes someone recount. */
          { k: 'Setup', v: `${(selectedAccount ? 2 : 0) + (g.gaps.some((x) => x.key === 'key') ? 0 : 1) + (g.gaps.some((x) => x.key === 'billing') ? 0 : 1)}/4`, note: 'steps done', fg: 'var(--amber)' },
        ];

  // ── setup steps ─────────────────────────────────────────────────────
  /* Billing sits third: after the key, because that is the first point the ask
     is worth anything — the balance is read from the key, so the price screen
     can name their own daily limit — and before rules, because writing rules
     nothing will enforce is the most disheartening way to spend ten minutes
     here. */

  // ── stat cards ──────────────────────────────────────────────────────
  const fresh = s.pnl == null;
  const ruleBreaks = stats?.behavior?.totalRuleBlocks ?? null;
  const fyNet = tax?.netTradingPnl?.value ?? tax?.netTradingPnl ?? null;
  const fyLabel = tax?.fyLabel ? `${tax.fyLabel} reconciled` : 'FY reconciled';
  const statCards = [
    fresh
      ? { k: 'Today', v: '$0.00', note: 'No trades yet on this account.', fg: 'var(--ink)', to: '/dashboard/live' }
      : { k: 'Today', v: fmtMoney(s.pnl, cur, { sign: true }), note: s.pnl < 0 ? `Down on the day. ${budgetLeft} of budget left.` : s.pnl === 0 ? 'Flat. No closed trades today.' : `Up on the day, ${Math.round(towardTarget)}% of the way to target.`, fg: s.pnl < 0 ? 'var(--red)' : s.pnl > 0 ? 'var(--mint)' : 'var(--ink)', to: '/dashboard/live' },
    s.lossLimit
      ? (fresh
        ? { k: 'Loss budget', v: fmt0(s.lossLimit), note: 'Full budget available. Nothing spent today.', fg: 'var(--ink)', to: '/dashboard/live', bar: '2%' }
        : { k: 'Loss budget used', v: `${Math.round(usedPct)}%`, note: `${budgetLeft} left before the guard closes the day.`, fg: usedPct > 70 ? 'var(--red)' : 'var(--ink)', to: '/dashboard/live', bar: `${Math.max(2, usedPct)}%` })
      : { k: 'Loss budget', v: '—', note: 'No daily loss rule is on yet.', fg: 'var(--ink-3)', to: '/dashboard/rules' },
    // TODO(api): journal stats do not price rule breaks; the count is shown in the note.
    { k: 'Discipline cost · 90d', v: '—', note: ruleBreaks != null && ruleBreaks > 0 ? `${ruleBreaks} rule breaks in 90 days. Pricing them needs a few more sessions.` : 'Needs a few sessions before we can price your habits.', fg: 'var(--ink-3)', to: '/dashboard/journal' },
    fyNet == null
      ? { k: fyLabel, v: '—', note: 'Your ledger starts with your first closed trade.', fg: 'var(--ink-3)', to: '/dashboard/tax' }
      : { k: fyLabel, v: fmtMoney(fyNet, 'INR'), note: 'Economic P&L, ledger-derived. Not a tax figure.', fg: 'var(--ink)', to: '/dashboard/tax' },
  ];

  /*
   * ── lifecycle overrides ────────────────────────────────────────────
   *
   * With no active plan (pf te pe pg lf), or before setup is done, nothing on
   * this page may imply enforcement. The figures above are computed as
   * usual; these replace the parts that would say otherwise — the dial, the
   * three facts, the loss budget — with the spec's wording. Trades, P&L and
   * the tax figure stay: they are the user's own record, not protection.
   */
  const lifeOff = Boolean(life && (life.ended || life.setup));
  if (lifeOff) {
    dial.pct = 'Off';
    dial.color = 'var(--ink-faint)';
    dial.tint = 'var(--surface-3)';
    dial.dash = `0 ${C}`;
    dial.label = life.dial.label;
    facts.splice(0, facts.length, ...life.facts.map(([k, v, note]) => ({ k, v, note, fg: 'var(--ink-2)' })));
    const off = life.lossBudgetNote ?? 'Not enforced until setup is done';
    statCards[0] = { ...statCards[0], note: 'From your trade history. Nothing is being closed for you.' };
    statCards[1] = { k: 'Loss budget used', v: '—', note: off, fg: 'var(--ink-faint)', to: statCards[1].to };
  }
  /* "Guard switched off" heads the feed while the plan is off, dated when we
     know the date. TODO(api): an exact switch-off time (guard_applied_at). */
  const offAt = life?.ended ? (user?.currentPeriodEnd ?? user?.trialEndsAt ?? null) : null;
  const offRow = life?.ended
    ? {
        t: offAt ? new Date(offAt).getTime() : null,
        text: `Guard switched off: ${life.endedFrom === 'failed' ? 'payment failed' : life.endedFrom === 'unpaid' ? 'all retries failed' : life.endedFrom === 'trial' ? 'trial ended' : 'plan ended'}`,
        kind: 'system',
        amt: '',
        fg: 'var(--ink-3)',
        dot: 'var(--red-solid)',
      }
    : null;
  const feed = activity && offRow ? [offRow, ...activity.filter((x) => !/Guard armed/.test(x.text))].slice(0, 5) : activity;

  // ── next actions ────────────────────────────────────────────────────
  const settling = g.rules?.ruleLock?.settling;
  // No advice until we know the state — "Finish setup" shown to a fully
  // configured account is the same false alarm as the red pill.
  const nextActions = !g.loaded
    ? []
    : g.guard !== 'armed'
    ? [
      { title: g.gap?.title ?? 'Finish setup', body: g.gap?.body ?? 'A few steps remain before anything is enforced.', to: g.gap?.to ?? '/dashboard/setup', accent: 'var(--red)', tint: 'var(--red-tint)', d: ICON.rules },
      { title: 'Decide your rule-lock window while calm', body: 'Seven days is the default. Choosing the length before you need it is the whole point of the device.', to: '/dashboard/live', accent: 'var(--mint)', tint: 'var(--mint-tint)', d: ICON.security },
      { title: 'Read what the guard can and cannot do', body: 'We cannot stop an order being placed on the exchange — we close the position straight after and verify you are flat.', to: '/dashboard/rules', accent: 'var(--blue)', tint: 'rgba(31,111,208,0.12)', d: ICON.journal },
    ]
    : [
      { title: 'Trade as you normally would', body: 'The guard is live. Nothing here changes until you have sessions behind you — that is the point.', to: '/dashboard/live', accent: 'var(--mint)', tint: 'var(--mint-tint)', d: ICON.live },
      settling
        ? { title: 'Your rules lock in 15 minutes', body: 'Adjust anything freely until then. After that they hold for 7 days unless you change the window.', to: '/dashboard/rules', accent: 'var(--amber)', tint: 'var(--amber-tint)', d: ICON.rules }
        : { title: 'Check your rule-lock window', body: 'Seven days is the default. Choosing the length before you need it is the whole point of the device.', to: '/dashboard/live', accent: 'var(--amber)', tint: 'var(--amber-tint)', d: ICON.rules },
      { title: 'Set a killswitch window before you need it', body: 'Deciding the length while calm is the whole idea. You cannot arm one mid-tilt and mean it.', to: '/dashboard/live', accent: 'var(--red)', tint: 'var(--red-tint)', d: ['M12 4v7', 'M6.8 7.4a7.4 7.4 0 1010.4 0'] },
    ];
  const nextSub = g.guard !== 'armed' || fresh ? 'Three things worth doing in your first week.' : 'Ranked by what it costs you to leave undone.';

  /*
   * NOTHING TO OVERVIEW.
   *
   * With no trading account every figure on this page is zero and the only
   * useful thing on it would be a prompt to go and set one up — so go there
   * instead of rendering a page whose entire content is "this does not apply
   * to you yet". The setup flow is the one place that work happens now.
   *
   * Overview specifically, not the dashboard at large: the sidebar still
   * works and every other route stays reachable. A setup flow you cannot
   * leave is how someone who was merely curious gets stuck.
   */
  /* Only real setup goes back to the flow. A user whose plan ended or whose
     payment failed has finished setup; their missing plan reads as a billing
     gap, and bouncing them to onboarding hid the Overview the spec gives
     them ("Nothing is protecting your accounts"). Unknown state falls back
     to the old rule. */
  const sendToSetup = !life
    ? setupIncomplete && !setupDismissed
    : life.id === 's0' || (life.setup && !setupDismissed);
  if (noAccount || (sendToSetup && g?.loaded !== false)) {
    return <Navigate to="/dashboard/setup" replace />;
  }

  return (
    <div>
      {showSetup && <SetupCard steps={steps} doneCount={doneCount} navigate={navigate} />}

      <div style={sx('margin-bottom:18px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Overview</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Three questions, in order: is the guard on, what is today costing me, and what should I do next.</p>
      </div>


      <section style={sx('position:relative;margin-bottom:20px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-lift);overflow:hidden')}>
        <div style={sx('position:absolute;inset:0;background:var(--wash);pointer-events:none')} />
        <div style={sx('position:absolute;inset:0;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:40px 40px;mask-image:linear-gradient(160deg,#000,transparent 62%);-webkit-mask-image:linear-gradient(160deg,#000,transparent 62%);pointer-events:none')} />
        <div style={sx('position:relative;display:flex;align-items:center;gap:32px;padding:30px 32px 28px;flex-wrap:wrap')}>
          <div style={sx('flex:1;min-width:min(320px,100%)')}>
            <div style={sx('display:inline-flex;align-items:center;gap:9px;padding:5px 12px 5px 9px;margin-bottom:16px;border-radius:999px', { border: `1px solid var(--${heroPill.tone}-line)`, background: `var(--${heroPill.tone}-tint)` })}>
              <span style={sx('width:7px;height:7px;border-radius:50%;animation:tgxPulse 2.1s ease-in-out infinite', { background: `var(--${heroPill.tone}-solid)`, boxShadow: `0 0 0 4px var(--${heroPill.tone}-tint)` })} />
              <span style={sx("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase", { color: `var(--${heroPill.tone})` })}>{heroPill.pill}</span>
            </div>
            <h2 style={sx("margin:0;font:600 34px/1.14 'Space Grotesk',sans-serif;letter-spacing:-.035em;max-width:24ch;text-wrap:pretty")}>{heroTitle}</h2>
            <p style={sx('margin:13px 0 0;font-size:14px;line-height:1.6;color:var(--ink-2);max-width:58ch;text-wrap:pretty')}>{heroSub}</p>
            {lifeOff && life.plainEnglish && (
              <p style={sx('margin:10px 0 0;font-size:13px;line-height:1.55;color:var(--ink-3);max-width:58ch;text-wrap:pretty')}>{life.plainEnglish}</p>
            )}
          </div>

          <div style={sx('flex:none;position:relative;width:186px;height:186px;display:grid;place-items:center')}>
            <div style={sx('position:absolute;inset:14px;border-radius:50%;filter:blur(20px);animation:tgxBreathe 4.5s ease-in-out infinite', { background: dial.tint })} />
            <svg width="186" height="186" viewBox="0 0 186 186" style={sx('position:absolute;inset:0;transform:rotate(-90deg)')}>
              <circle cx="93" cy="93" r="72" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
              <circle cx="93" cy="93" r="72" fill="none" stroke={dial.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={dial.dash} style={{ filter: `drop-shadow(0 0 10px ${dial.tint})` }} />
              <circle cx="93" cy="93" r="58" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="1 7" />
            </svg>
            <div style={sx('position:relative;text-align:center')}>
              <div style={sx("font:700 40px/1 'Space Grotesk',sans-serif;letter-spacing:-.04em;font-variant-numeric:tabular-nums", { color: dial.color })}>{dial.pct}</div>
              <div style={sx('margin-top:7px;font-size:11px;line-height:1.35;color:var(--ink-3);max-width:96px;margin-left:auto;margin-right:auto')}>{dial.label}</div>
            </div>
          </div>
        </div>

        {/* Three short key/value facts. At a 170px floor they wrap 2 + 1 on a
            phone, which leaves the third stranded under a half-width divider.
            On a phone they read better as what they actually are — a small
            definition list — so .ov-facts turns them into rows. */}
        <div className="ov-facts tgx-cells" style={sx('position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));border-top:1px solid var(--line)')}>
          {facts.map((f) => (
            <div key={f.k} style={sx('padding:16px 20px')}>
              <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>{f.k}</div>
              <div style={sx("margin-top:9px;font:600 21px/1 'Space Grotesk',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums", { color: f.fg })}>{f.v}</div>
              <div style={sx('margin-top:6px;font-size:11.5px;color:var(--ink-3)')}>{f.note}</div>
            </div>
          ))}
        </div>

        <div style={sx('position:relative;display:flex;align-items:flex-start;gap:10px;padding:14px 20px;border-top:1px solid var(--line);background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flex: 'none', marginTop: 2, color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          <span><strong style={sx('color:var(--ink);font-weight:700')}>Plain English:</strong> we cannot stop you placing an order inside {venue}&rsquo;s own app — no exchange gives us that switch. What we do is close the position immediately after it opens, then check you are actually flat.</span>
        </div>
      </section>

      {/* Four numbers meant to be scanned against each other. auto-fit with a
          214px floor collapses them to one per row below ~460px, which turns a
          glance into four screens of scrolling with the fourth card below the
          fold. Pinned to a 2x2 on a phone instead — see .ov-stats. */}
      <div className="ov-stats" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(214px,1fr));gap:14px;margin-bottom:22px')}>
        {statCards.map((c) => (
          <button key={c.k} type="button" className="ov-stat" onClick={() => navigate(c.to)} style={sx('position:relative;text-align:left;padding:17px 18px 18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);background-image:linear-gradient(180deg,rgba(255,255,255,.028),transparent 46%);box-shadow:var(--shadow-card);color:var(--ink);transition:transform .16s ease,border-color .16s ease')}>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
              <span className="ov-stat__k" style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>{c.k}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--ink-faint)' }}><path d="M8 5l7 7-7 7" /></svg>
            </div>
            <div className="ov-stat__v" style={sx("margin-top:14px;font:700 30px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.035em", { color: c.fg })}>{c.v}</div>
            <div className="ov-stat__n" style={sx('margin-top:9px;font-size:12px;color:var(--ink-3);line-height:1.5;text-wrap:pretty')}>{c.note}</div>
            {c.bar && (
              <div style={sx('margin-top:14px;height:5px;border-radius:999px;background:var(--surface-3);overflow:hidden')}>
                <div style={sx('height:100%;border-radius:999px', { background: c.fg, width: c.bar, boxShadow: `0 0 12px -2px ${c.fg}` })} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/*
        ABOVE "What to do next" AND "Activity", NOT UNDER THEM.

        The handoff put the strip at the bottom of Overview, after the guard
        and status content. On a phone that is four stat cards, a task list
        and a live feed of scroll before you reach it — so the one surface
        that asks the user to do something FOR us sat below everything that
        asks them to do something for themselves, and most sessions never
        saw it. It goes directly under the numbers it is about.

        The spec's `account.connected && account.guard !== 'unprotected'` is
        one condition here: 'unprotected' is exactly the state with no key, so
        anything else already implies a connection. 'loading' is excluded on
        the same principle as the guard pill — a pending fetch is not an
        answer either way.

        `canShare` is the fourth condition and the important one: a protected
        account with no closed trades has nothing to put on a card, and the
        alternative to hiding the strip is showing the design's demo trade
        under this user's name.
      */}
      <ShareCardsStrip
        show={g.loaded && g.guard !== 'unprotected' && g.guard !== 'loading' && canShare && !lifeOff}
        items={shareItems}
        awards={shareAwards}
        onOpenShare={openShare}
      />

      <div style={sx('display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px;align-items:start')} className="ov-two">
        <section style={sx(CARD)}>
          <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
            <h3 style={sx(H3)}>What to do next</h3>
            <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>{nextSub}</p>
          </div>
          {nextActions.map((n) => (
            <button key={n.title} type="button" className="ov-row" onClick={() => navigate(n.to)} style={sx('width:100%;display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;color:var(--ink)')}>
              <span style={sx('flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center', { background: n.tint, color: n.accent })}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={n.d[0]} /><path d={n.d[1]} /></svg>
              </span>
              <span style={sx('flex:1;min-width:0')}>
                <span style={sx('display:block;font-size:13.5px;font-weight:600')}>{n.title}</span>
                <span style={sx('display:block;font-size:12.5px;color:var(--ink-3);margin-top:3px;line-height:1.5')}>{n.body}</span>
              </span>
            </button>
          ))}
        </section>

        <section style={sx(CARD)}>
          <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between')}>
            <h3 style={sx(H3)}>Activity</h3>
            <span style={sx('font-size:11px;color:var(--ink-faint)')}>live · 20s</span>
          </div>
          {feed === null ? (
            <div style={sx('padding:13px 18px;font-size:12.5px;color:var(--ink-3)')}>Loading…</div>
          ) : feed.length === 0 ? (
            <div style={sx('padding:13px 18px;font-size:12.5px;color:var(--ink-3)')}>Nothing yet. Fills and rule events land here as they happen.</div>
          ) : feed.map((ev, i) => (
            <div key={i} style={sx('display:flex;gap:11px;padding:13px 18px;border-bottom:1px solid var(--line)')}>
              <span style={sx('flex:none;width:7px;height:7px;border-radius:50%;margin-top:6px', { background: ev.dot })} />
              <span style={sx('flex:1;min-width:0')}>
                <span style={sx('display:block;font-size:13px;font-weight:500')}>{ev.text}</span>
                <span style={sx('display:block;font-size:11.5px;color:var(--ink-faint);margin-top:3px')}>
                  {ev.t == null
                    ? ev.kind
                    : `${ev.kind === 'system'
                      ? new Date(ev.t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
                      : new Date(ev.t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} · ${ev.kind}`}
                </span>
              </span>
              {ev.amt && <span style={sx("flex:none;font:600 12.5px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;padding-top:3px", { color: ev.fg })}>{ev.amt}</span>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
