import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useLiveAccount } from '../hooks/useLiveAccount';
import { sessionOf, fmtMoney } from '../lib/session';
import { fetchJournalStats, fetchTaxSummary } from '../api/tradesApi';
import { IcArrow, IcCheck } from '../components/dashboard/shell/icons';
import { formatRemaining, formatResumes } from '../components/dashboard/shell/format';

/**
 * Overview — answers "am I protected?" first, then "what do I do next?".
 *
 *   hero          guard state, title, sub, two CTAs, three proof facts
 *   checklist     only while setup is incomplete
 *   four stats    Today · Loss budget used · Rule breaks 90d · FY reconciled
 *   next actions  ranked by the gap order (cost-ranked once the API prices them)
 *   plain English what we cannot do, and what we do instead
 */

const PROOF = [
  { k: 'Enforced', v: 'Server' },
  { k: 'Reaction', v: '~120ms' },
  { k: 'Key scope', v: 'Trading · cannot withdraw' },
];

function Stat({ label, value, sub, tone, bar, trend }) {
  return (
    <div className="dsh-stat">
      <div className="dsh-mono dsh-mono--stat">{label}</div>
      <div className="dsh-stat-figure" style={{ color: tone ? `var(--${tone})` : 'var(--ink)' }}>{value}</div>
      {sub && <div className="dsh-meta">{sub}</div>}
      {bar != null && (
        <div className="dsh-progress" style={{ marginTop: 10 }} aria-hidden>
          <span style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} className={tone === 'amber' ? 'is-amber' : tone === 'red' ? 'is-red' : ''} />
        </div>
      )}
      {trend && (
        <div className="dsh-trend" aria-hidden>
          {trend.map((h, i) => <span key={i} style={{ height: `${Math.max(8, Math.min(100, h))}%` }} />)}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const guard = useGuard();
  const g = guard.selected;
  const accessToken = session?.access_token;

  const live = useLiveAccount({ accessToken, tradingAccountId: selectedTradingAccountId, initial: selectedAccount });
  const s = useMemo(() => sessionOf(live, g.rules), [live, g.rules]);

  const [stats, setStats] = useState(null);
  const [tax, setTax] = useState(null);
  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    fetchJournalStats({ accessToken, tradingAccountId: selectedTradingAccountId, days: 90, signal: ctrl.signal })
      .then((r) => { if (!ctrl.signal.aborted) setStats(r); })
      .catch(() => {});
    fetchTaxSummary({ accessToken, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal })
      .then((r) => { if (!ctrl.signal.aborted) setTax(r); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId]);

  const noAccount = !accountsLoading && !selectedAccount;
  const { pill, tone, title } = g.describe;
  const cur = s.currency;

  // Hero sub-line branches on state; never interpolates a missing figure.
  let sub;
  if (noAccount) sub = 'Add a trading account, connect a key, switch on a rule. Then this page can tell you the truth.';
  else if (g.guard === 'locked') sub = `Trading resumes ${formatResumes(g.lockUntil, selectedAccount?.timezone || 'Asia/Kolkata')} — ${formatRemaining(g.lockRemainingMs)} to go.`;
  else if (g.guard === 'armed') sub = s.lossLimit ? `If you lose ${fmtMoney(s.lossLimit, cur)} today, ${g.copy.action}.` : `On every fill, ${g.copy.action}.`;
  else if (g.guard === 'watching') sub = `On a breach, ${g.copy.action}. Replace the key with a trading-scope one to change that.`;
  else sub = g.gap ? g.gap.body : 'Finish setup to arm the guard.';

  const cta1 = g.gap && g.gap.key !== 'alerts'
    ? { to: g.gap.to, label: g.gap.cta }
    : { to: '/dashboard/live', label: 'Open Live guard' };
  const cta2 = { to: '/dashboard/rules', label: 'Edit rules' };

  const steps = [
    { key: 'setup', label: 'Create the account', done: !g.gaps.some((x) => x.key === 'setup'), to: '/dashboard/account/trading' },
    { key: 'key', label: 'Connect the enforcement key', done: !g.gaps.some((x) => x.key === 'key' || x.key === 'readonly'), to: '/dashboard/connect' },
    { key: 'rules', label: 'Switch on at least one rule', done: !g.gaps.some((x) => x.key === 'rules'), to: '/dashboard/rules' },
    { key: 'alerts', label: 'Turn on alerts', done: !g.gaps.some((x) => x.key === 'alerts'), to: '/dashboard/alerts' },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const showChecklist = selectedAccount && doneCount < 4;

  const ruleBreaks90 = stats?.behavior?.totalRuleBlocks ?? null;
  const fyNet = tax?.netTradingPnl?.value ?? tax?.netTradingPnl ?? null;

  return (
    <div className="dov">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="dph">
        <h1 className="dsh-h1">Overview</h1>
        <p className="dph-sub">Three questions, in order: is the guard on, what is today costing me, and what should I do next.</p>
      </div>

      <section className={`dsh-card dov-hero dov-hero--${tone}`}>
        <div className="dov-hero__main">
          <span className={`dsh-pill dsh-pill--${tone}`}><span className={`dot${g.guard === 'armed' ? ' dot--pulse' : ''}`} />{noAccount ? 'NO ACCOUNT' : pill}</span>
          <h2 className="dsh-hero-title dov-hero__title">{noAccount ? 'Nothing is protected yet.' : title}</h2>
          <p className="dsh-body dov-hero__sub">{sub}</p>
          <div className="dov-hero__ctas">
            <Link to={noAccount ? '/dashboard/account/trading' : cta1.to} className="dsh-btn dsh-btn--primary">{noAccount ? 'Add an account' : cta1.label} <IcArrow size={14} /></Link>
            {!noAccount && <Link to={cta2.to} className="dsh-btn">{cta2.label}</Link>}
          </div>
        </div>
        <dl className="dov-proof">
          {PROOF.map((p) => (
            <div key={p.k} className="dov-proof__item">
              <dt className="dsh-mono">{p.k}</dt>
              <dd className="dsh-inline-figure" style={{ fontSize: 15, color: 'var(--ink)' }}>{p.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Setup checklist ─────────────────────────────────────────── */}
      {showChecklist && (
        <section className="dsh-card">
          <div className="dov-check__head">
            <h3 className="dsh-h2">Set up {selectedAccount.name}</h3>
            <span className="dsh-meta tnum">{doneCount} of 4</span>
          </div>
          <div className="dov-check__body">
          <div className="dsh-progress" aria-hidden><span style={{ width: `${(doneCount / 4) * 100}%` }} /></div>
          <ol className="dov-check__list">
            {steps.map((st, i) => (
              <li key={st.key} className={`dov-check__item${st.done ? ' dov-check__item--done' : ''}`}>
                <span className="dov-check__n">{st.done ? <IcCheck size={13} /> : i + 1}</span>
                <span className="dov-check__label">{st.label}</span>
                {!st.done && <Link to={st.to} className="dsh-btn dsh-btn--sm">Do this</Link>}
              </li>
            ))}
          </ol>
          <p className="dsh-meta">Nothing is enforced until all four are done.</p>
          </div>
        </section>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <section className="dsh-stat-grid">
        <Stat
          label="Today"
          value={s.pnl == null ? '—' : fmtMoney(s.pnl, cur, { sign: true })}
          tone={s.pnl == null ? null : s.pnl < 0 ? 'red' : s.pnl > 0 ? 'mint' : null}
          sub={s.pnl == null ? 'No fills yet today' : 'Session P&L, trading only'}
        />
        <Stat
          label="Loss budget used"
          value={s.budgetPct == null ? '—' : `${Math.round(s.budgetPct)}%`}
          tone={s.budgetPct == null ? null : s.budgetPct >= 100 ? 'red' : s.budgetPct >= 75 ? 'amber' : 'mint'}
          sub={s.lossLimit ? `${fmtMoney(s.budgetUsed, cur)} of ${fmtMoney(s.lossLimit, cur)}` : 'No daily loss rule on'}
          bar={s.budgetPct}
        />
        <Stat
          label="Rule breaks · 90d"
          value={ruleBreaks90 == null ? '—' : String(ruleBreaks90)}
          sub={ruleBreaks90 == null ? 'Loading' : 'Times a rule fired'}
          /* TODO(api): journal stats do not price breaks yet; count shown instead of a $ cost. */
        />
        <Stat
          label={tax?.fyLabel ? `${tax.fyLabel} net` : 'FY net'}
          value={fyNet == null ? '—' : fmtMoney(fyNet, 'INR', { decimals: 0 })}
          tone={fyNet == null ? null : fyNet < 0 ? 'red' : 'mint'}
          sub={tax ? `${tax.positionCount ?? 0} positions reconciled` : 'Loading'}
        />
      </section>

      {/* ── Next actions ────────────────────────────────────────────── */}
      {selectedAccount && (
        <section className="dsh-card">
          <div className="dsh-card__head"><h3 className="dsh-h2">Next</h3></div>
          <div className="dsh-card__body">
          {g.gaps.length === 0 ? (
            <p className="dsh-body">Nothing to fix. Open Live guard when you sit down to trade.</p>
          ) : (
            <ul className="dov-next__list">
              {g.gaps.map((gap) => (
                <li key={gap.key} className="dov-next__item">
                  <div>
                    <p className="dov-next__title">{gap.title}</p>
                    <p className="dsh-meta">{gap.body}</p>
                  </div>
                  <Link to={gap.to} className="dsh-btn dsh-btn--sm">{gap.cta} <IcArrow size={13} /></Link>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
      )}

      {/* ── Plain English ───────────────────────────────────────────── */}
      <p className="dov-plain">
        <strong>Plain English.</strong> We cannot stop you placing an order inside Delta&rsquo;s own app. What we do is
        close the position immediately after it opens, cancel what is resting, then check you are actually flat — in about 120 milliseconds, from our servers, not your browser.
        {g.enforcement !== 'armed' && ' Right now the key on this account cannot close anything, so that promise does not apply until it can.'}
      </p>
    </div>
  );
}
