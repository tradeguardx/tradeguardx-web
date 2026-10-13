import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { keyStateOf } from '../lib/lifecycle';
import { fetchRevengeReport } from '../api/tradesApi';
import { fetchBackfillStatus, triggerHistoryBackfill } from '../api/syncApi';
import { sx } from '../components/dashboard/shell/sx';

/**
 * THE REVENGE REPORT — how someone trades after a loss, scored like an SEO
 * audit: one number, then the checks that make it up, each with the trades
 * that prove it and the rule that fixes it.
 *
 * Every figure comes from the server (trade-service services/revengeReport),
 * so web and mobile can never disagree. This page only lays it out.
 *
 * NOT AUTOMATIC, ON PURPOSE. The page shows the report for the period picked;
 * Refresh imports whatever is new from the exchange, waits for that import,
 * and asks again. Times are IST, like the rest of the product.
 */

const PERIODS = [
  { months: 1, label: '1 month' },
  { months: 2, label: '2 months' },
  { months: 3, label: '3 months' },
];

const GRADE = {
  calm: { label: 'Calm', tone: 'mint' },
  someTilt: { label: 'Some tilt', tone: 'amber' },
  revengeProne: { label: 'Revenge-prone', tone: 'amber' },
  onTilt: { label: 'On tilt', tone: 'red' },
};

const STATUS = {
  good: { label: 'Good', tone: 'mint' },
  warning: { label: 'Warning', tone: 'amber' },
  problem: { label: 'Problem', tone: 'red' },
  na: { label: 'Nothing to judge', tone: 'neutral' },
};

const RULE_NAME = {
  'close-after-losses': 'Close after N losses',
  'risk-per-trade': 'Risk per trade',
  'daily-loss': 'Daily loss limit',
  'max-trades-day': 'Max trades per day',
};

const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)';
const LABEL = "font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)";

const toneFg = (t) => (t === 'neutral' ? 'var(--ink-3)' : `var(--${t})`);
const toneBg = (t) => (t === 'neutral' ? 'var(--surface-2)' : `var(--${t}-tint)`);

function moneyOf(currency) {
  const cur = String(currency || '').toUpperCase();
  const sym = cur === 'INR' ? '₹' : cur === 'USD' ? '$' : '';
  return (n, { signed = false } = {}) => {
    if (n == null || !Number.isFinite(n)) return '—';
    const a = Math.abs(n);
    const body = cur !== 'INR' && a < 100
      ? a.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(a).toLocaleString('en-IN');
    const sign = signed ? (n < 0 ? '−' : '+') : n < 0 ? '−' : '';
    return `${sign}${sym}${body}`;
  };
}

const ist = (iso, opts) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts }) : '');
const istDay = (iso) => ist(iso, { day: 'numeric', month: 'short' });
const istTime = (iso) => ist(iso, { hour: '2-digit', minute: '2-digit', hour12: false });

function ago(iso, now = Date.now()) {
  if (!iso) return null;
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function Chip({ tone, children }) {
  return (
    <span style={sx("flex:none;display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;font:700 10.5px/1.2 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase", { background: toneBg(tone), color: toneFg(tone) })}>
      {children}
    </span>
  );
}

function ScoreRing({ score, tone }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={score == null ? 'No score' : `Revenge score ${score} out of 100`} style={{ flex: 'none' }}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
      <circle cx="66" cy="66" r={r} fill="none" stroke={score == null ? 'var(--surface-3)' : toneFg(tone)} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 66 66)" />
      <text x="66" y="64" textAnchor="middle" style={{ font: "600 36px 'Space Grotesk',sans-serif", fill: 'var(--ink)' }}>{score == null ? '—' : score}</text>
      <text x="66" y="86" textAnchor="middle" style={{ font: "500 11px 'JetBrains Mono',monospace", fill: 'var(--ink-faint)', letterSpacing: '.1em' }}>OF 100</text>
    </svg>
  );
}

function Stat({ label, value, sub, tone }) {
  return (
    <div style={sx(`padding:16px 17px;${CARD};min-width:0`)}>
      <div style={sx(LABEL)}>{label}</div>
      <div style={sx("margin-top:10px;font:600 21px/1.15 'Space Grotesk',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere", { color: tone ? toneFg(tone) : 'var(--ink)' })}>{value}</div>
      {sub && <div style={sx('margin-top:6px;font-size:12px;line-height:1.45;color:var(--ink-3)')}>{sub}</div>}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section style={sx('margin-top:26px')}>
      <div style={sx('display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:11px')}>
        <h2 style={sx("margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.015em")}>{title}</h2>
        {note && <span style={sx('font-size:12.5px;color:var(--ink-3)')}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

const GRID = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px';

function CheckCard({ check, money }) {
  const [open, setOpen] = useState(check.status === 'problem');
  const st = STATUS[check.status] ?? STATUS.na;
  const value = check.value == null ? null : check.unit === '%' ? `${Math.round(check.value)}%` : check.unit === 'x' ? `${check.value}×` : `${check.value} day${check.value === 1 ? '' : 's'}`;
  return (
    <div style={sx(`${CARD};overflow:hidden`, { borderLeft: `3px solid ${toneFg(st.tone)}` })}>
      <div style={sx('padding:16px 18px')}>
        <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
          <Chip tone={st.tone}>{st.label}</Chip>
          <span style={sx('font-size:14.5px;font-weight:700;letter-spacing:-.005em')}>{check.title}</span>
          <span style={{ flex: 1 }} />
          {value && <span style={sx("font:600 15px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: toneFg(st.tone) })}>{value}</span>}
          <span style={sx('font-size:11.5px;color:var(--ink-faint)')}>{check.weight}% of score</span>
        </div>
        <p style={sx('margin:9px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-2)')}>{check.finding}</p>

        {check.evidence?.length > 0 && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={sx('margin-top:10px;padding:0;border:0;background:none;color:var(--ink-3);font-size:12.5px;font-weight:600;cursor:pointer')}>
              {open ? 'Hide the trades' : `Show the trades (${check.evidence.length})`}
            </button>
            {open && (
              <ul style={sx('margin:9px 0 0;padding:0;list-style:none;display:grid;gap:6px')}>
                {check.evidence.map((e, i) => (
                  <li key={i} style={sx('display:flex;gap:10px;align-items:baseline;padding:8px 11px;border-radius:10px;background:var(--surface-2);font-size:12.5px;line-height:1.45')}>
                    <span style={sx("flex:none;font:500 11px/1.4 'JetBrains Mono',monospace;color:var(--ink-faint)")}>{e.at.length === 10 ? e.at.slice(5) : `${istDay(e.at)} ${istTime(e.at)}`}</span>
                    <span style={sx('flex:1;min-width:0;color:var(--ink-2)')}>{e.text}</span>
                    {e.pnl != null && <span style={sx('flex:none;font-weight:700;font-variant-numeric:tabular-nums', { color: e.pnl < 0 ? 'var(--red)' : 'var(--mint)' })}>{money(e.pnl, { signed: true })}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {check.status !== 'good' && check.status !== 'na' && (
        <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 18px;border-top:1px solid var(--line);background:var(--surface-2)')}>
          <span style={sx('flex:1;min-width:min(240px,100%);font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>
            <b style={sx('color:var(--ink)')}>Fix: </b>{check.fix.text}
          </span>
          <Link to="/dashboard/rules" style={sx('flex:none;padding:7px 12px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none')}>
            Set up {RULE_NAME[check.fix.rule] ?? 'this rule'}
          </Link>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" style={sx('margin-top:22px;display:grid;gap:14px')}>
      {[150, 96, 96, 120].map((h, i) => (
        <div key={i} style={sx(`${CARD};height:${h}px;background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite`)} />
      ))}
    </div>
  );
}

export default function RevengeReportPage() {
  const { session } = useAuth();
  const { selectedAccount, selectedTradingAccountId, accountsLoading } = useTradingAccounts();
  const accessToken = session?.access_token;
  // The context starts the selection as '' — never read that as "no account".
  const accountId = selectedTradingAccountId || selectedAccount?.id || null;

  const [months, setMonths] = useState(1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sync, setSync] = useState(null); // { status, updatedAt }
  const [refreshing, setRefreshing] = useState('');
  const alive = useRef(true);
  /* Set true on every mount, not only the first: React's dev double-mount
     runs the cleanup once, and a ref only cleared would then drop every
     report that came back after it. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  /* No working key, nothing to import: Refresh is not offered at all, and
     the page says what would make it possible. History imported while a key
     still worked is still shown. */
  const { selected: guardSel } = useGuard();
  const keyState = guardSel?.loaded ? keyStateOf(guardSel.connection) : 'unknown';
  const canImport = keyState === 'ok';

  const load = useCallback(async (m, signal) => {
    if (!accessToken || !accountId) return;
    setLoading(true);
    setError('');
    try {
      const [r, s] = await Promise.all([
        fetchRevengeReport({ accessToken, tradingAccountId: accountId, months: m, signal }),
        fetchBackfillStatus({ accessToken, tradingAccountId: accountId, signal }).catch(() => null),
      ]);
      if (!alive.current || signal?.aborted) return;
      setReport(r);
      setSync(s);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e?.message || 'Could not build your report.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken, accountId]);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => load(months, ac.signal), 0);
    return () => { clearTimeout(t); ac.abort(); };
  }, [load, months]);

  /* Refresh: import what is new, wait for that import (up to a minute),
     then ask for the report again. */
  const refresh = async () => {
    if (!accessToken || !accountId || refreshing) return;
    setRefreshing('Fetching your latest trades…');
    try {
      const queued = await triggerHistoryBackfill({ accessToken, tradingAccountId: accountId })
        .then((r) => (r?.data ?? r)?.queued !== false)
        .catch(() => false);
      const started = Date.now();
      // Nothing was queued (already up to date, or no importer): don't wait.
      for (; queued; ) {
        await new Promise((r) => setTimeout(r, 2000));
        if (!alive.current) return;
        const s = await fetchBackfillStatus({ accessToken, tradingAccountId: accountId }).catch(() => null);
        // Only "still working" keeps us waiting; idle, error, unsupported or
        // anything new means the import is done or not happening.
        if (!s || !['queued', 'in_progress'].includes(s.status) || Date.now() - started > 60_000) break;
      }
      setRefreshing('Rebuilding your report…');
      await load(months);
    } finally {
      if (alive.current) setRefreshing('');
    }
  };

  const money = moneyOf(report?.currency);
  const grade = report?.grade ? GRADE[report.grade] : null;
  const p = report?.profile;
  const s = report?.streaks;
  const period = PERIODS.find((x) => x.months === months);

  if (!accountId && accountsLoading) return <Skeleton />;
  if (!accountId) {
    return (
      <div style={sx('max-width:1040px;margin:0 auto')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Revenge report</h1>
        <p style={sx('margin:10px 0 0;font-size:14px;color:var(--ink-3)')}>
          Add a trading account and connect its key, and we’ll show you how you trade after a loss. <Link to="/dashboard/setup" style={sx('color:var(--mint);font-weight:700')}>Set up</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={sx('max-width:1040px;margin:0 auto;padding-bottom:48px')}>
      <header style={sx('display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap')}>
        <div style={sx('flex:1;min-width:min(320px,100%)')}>
          <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Revenge report</h1>
          <p style={sx('margin:7px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>
            How you trade after a loss on <b style={sx('color:var(--ink-2)')}>{selectedAccount?.name ?? 'this account'}</b>, from your closed trades. Times are IST.
          </p>
        </div>
        <div role="tablist" aria-label="Period" style={sx('display:flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
          {PERIODS.map((x) => (
            <button
              key={x.months}
              role="tab"
              type="button"
              aria-selected={x.months === months}
              onClick={() => setMonths(x.months)}
              style={sx('padding:7px 12px;border:0;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer', x.months === months ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--ink-3)' })}
            >
              {x.label}
            </button>
          ))}
        </div>
      </header>

      <div style={sx('margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3)')}>
        {keyState === 'none' || keyState === 'failed' ? (
          <>
            <span>
              {keyState === 'failed'
                ? 'This account’s key is disconnected, so we can’t fetch new trades.'
                : 'Connect this account’s exchange key and we’ll build your report from your trades.'}
            </span>
            <Link to="/dashboard/connect" style={sx('padding:6px 11px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none')}>
              {keyState === 'failed' ? 'Reconnect key' : 'Connect key'}
            </Link>
          </>
        ) : (
          <>
            <span>{refreshing || (sync?.updatedAt ? `Trades imported ${ago(sync.updatedAt)}` : 'Trades import from your exchange in the background.')}</span>
            {canImport && (
              <button type="button" onClick={refresh} disabled={Boolean(refreshing)} style={sx('padding:6px 11px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer', { opacity: refreshing ? 0.6 : 1 })}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </>
        )}
      </div>

      {/* No working key and nothing ever imported: there is no report to
          show, so show none — not an empty score ring and "0 trades". */}
      {(keyState === 'none' || keyState === 'failed') && report && report.trades === 0 ? (
        <div style={sx(`margin-top:22px;padding:26px 24px;${CARD};text-align:center`)}>
          <div style={sx("font:600 19px/1.3 'Space Grotesk',sans-serif;letter-spacing:-.015em")}>No trades to analyse yet</div>
          <p style={sx('margin:8px auto 0;max-width:52ch;font-size:13.5px;line-height:1.6;color:var(--ink-3)')}>
            Your revenge report is built from the trades on your exchange account. Connect the key for {selectedAccount?.name ?? 'this account'} and we’ll read your recent history — it usually takes under a minute.
          </p>
          <Link to="/dashboard/connect" style={sx('display:inline-block;margin-top:16px;padding:11px 18px;border-radius:11px;background:var(--mint-solid);color:#02241d;font-size:13.5px;font-weight:800;text-decoration:none')}>
            {keyState === 'failed' ? 'Reconnect key' : 'Connect key'}
          </Link>
        </div>
      ) : loading && !report ? <Skeleton /> : error ? (
        <div role="alert" style={sx(`margin-top:22px;padding:18px;${CARD};font-size:13.5px;color:var(--ink-2)`)}>
          {error} <button type="button" onClick={() => load(months)} style={sx('margin-left:6px;padding:0;border:0;background:none;color:var(--mint);font-weight:700;cursor:pointer')}>Try again</button>
        </div>
      ) : report && (
        <div style={sx('opacity:1;transition:opacity .15s', { opacity: loading ? 0.55 : 1 })}>
          {/* ── Score ─────────────────────────────────────────────────── */}
          <section style={sx(`margin-top:20px;padding:22px 24px;${CARD};display:flex;align-items:center;gap:24px;flex-wrap:wrap`)}>
            <ScoreRing score={report.score} tone={grade?.tone ?? 'neutral'} />
            <div style={sx('flex:1;min-width:min(260px,100%)')}>
              <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
                <span style={sx(LABEL)}>Revenge score · {period?.label}</span>
                {grade && <Chip tone={grade.tone}>{grade.label}</Chip>}
              </div>
              <div style={sx("margin-top:10px;font:600 22px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{report.verdict}</div>
              <div style={sx('margin-top:8px;font-size:13px;color:var(--ink-3)')}>
                {report.trades} closed trade{report.trades === 1 ? '' : 's'}
                {report.enoughData ? ` · ${report.revengeTrades} revenge trade${report.revengeTrades === 1 ? '' : 's'}` : ''} · 100 means you never chase a loss.
              </div>
            </div>
          </section>

          {report.insights?.length > 0 && (
            <div style={sx('margin-top:12px;display:grid;gap:8px')}>
              {report.insights.map((t, i) => (
                <div key={i} style={sx('padding:11px 14px;border-radius:12px;border:1px solid var(--amber-line);background:var(--amber-tint);font-size:13px;line-height:1.5;color:var(--ink-2)')}>{t}</div>
              ))}
            </div>
          )}

          {report.trades > 0 && (
            <>
              {/* ── Trading profile ───────────────────────────────────── */}
              <Section title="Your trading profile" note="Context, not part of the score.">
                <div style={sx(GRID)}>
                  <Stat label="Win / loss" value={`${p.wins} · ${p.losses}`} sub={p.winRate == null ? 'No decided trades' : `${Math.round(p.winRate)}% win rate${p.breakeven ? ` · ${p.breakeven} breakeven` : ''}`} />
                  <Stat label="Risk : reward" value={p.rr == null ? '—' : `1 : ${p.rr}`} sub={p.avgWin != null || p.avgLoss != null ? `Avg win ${money(p.avgWin)} · avg loss ${money(p.avgLoss)}` : null} tone={p.rr == null ? null : p.rr >= 1 ? 'mint' : 'amber'} />
                  <Stat label="Per trade, on average" value={p.expectancy == null ? '—' : money(p.expectancy, { signed: true })} sub="What your win rate and R:R add up to" tone={p.expectancy == null ? null : p.expectancy >= 0 ? 'mint' : 'red'} />
                  <Stat label="Net result" value={money(p.netPnl, { signed: true })} sub="After fees" tone={p.netPnl >= 0 ? 'mint' : 'red'} />
                  <Stat label="Best time" value={p.bestTime ? p.bestTime.label : '—'} sub={p.bestTime ? `${money(p.bestTime.pnl, { signed: true })} over ${p.bestTime.trades} trades` : 'Not enough trades to compare times yet'} tone={p.bestTime ? 'mint' : null} />
                  <Stat label="Worst time" value={p.worstTime ? p.worstTime.label : '—'} sub={p.worstTime ? `${money(p.worstTime.pnl, { signed: true })} over ${p.worstTime.trades} trades` : 'Not enough trades to compare times yet'} tone={p.worstTime ? 'red' : null} />
                  <Stat label="Best symbol" value={p.bestSymbol ? p.bestSymbol.label : '—'} sub={p.bestSymbol ? `${money(p.bestSymbol.pnl, { signed: true })} · ${Math.round(p.bestSymbol.winRate)}% wins · ${p.bestSymbol.trades} trades` : 'Needs 5+ trades in at least two symbols'} tone={p.bestSymbol ? 'mint' : null} />
                  <Stat label="Worst symbol" value={p.worstSymbol ? p.worstSymbol.label : '—'} sub={p.worstSymbol ? `${money(p.worstSymbol.pnl, { signed: true })} · ${Math.round(p.worstSymbol.winRate)}% wins · ${p.worstSymbol.trades} trades` : 'Needs 5+ trades in at least two symbols'} tone={p.worstSymbol ? 'red' : null} />
                  <Stat label="Biggest win" value={p.biggestWin ? money(p.biggestWin.pnl, { signed: true }) : '—'} sub={p.biggestWin ? `${p.biggestWin.symbol} · ${istDay(p.biggestWin.at)}` : null} tone={p.biggestWin ? 'mint' : null} />
                  <Stat label="Biggest loss" value={p.biggestLoss ? money(p.biggestLoss.pnl, { signed: true }) : '—'} sub={p.biggestLoss ? `${p.biggestLoss.symbol} · ${istDay(p.biggestLoss.at)}` : null} tone={p.biggestLoss ? 'red' : null} />
                </div>
              </Section>

              {/* ── Streaks ───────────────────────────────────────────── */}
              <Section title="Streaks" note="Trades in the order they closed.">
                <div style={sx(GRID)}>
                  <Stat label="Longest winning streak" value={s.longestWin ? `${s.longestWin.length} in a row` : '—'} sub={s.longestWin ? `${money(s.longestWin.pnl, { signed: true })} · ${istDay(s.longestWin.to)}` : null} tone={s.longestWin ? 'mint' : null} />
                  <Stat label="Longest losing streak" value={s.longestLoss ? `${s.longestLoss.length} in a row` : '—'} sub={s.longestLoss ? `${money(s.longestLoss.pnl, { signed: true })} · ${istDay(s.longestLoss.to)}` : null} tone={s.longestLoss ? 'red' : null} />
                  <Stat label="A winning streak, on average" value={s.avgWinLength == null ? '—' : `${s.avgWinLength} wins`} sub={s.avgWinPnl == null ? null : `${money(s.avgWinPnl, { signed: true })} per streak`} />
                  <Stat label="A losing streak, on average" value={s.avgLossLength == null ? '—' : `${s.avgLossLength} losses`} sub={s.avgLossPnl == null ? null : `${money(s.avgLossPnl, { signed: true })} per streak`} />
                </div>
              </Section>
            </>
          )}

          {/* ── The checks ────────────────────────────────────────────── */}
          {report.enoughData ? (
            <Section title="What makes up your score" note="Each check, what we found, and the rule that fixes it.">
              <div style={sx('display:grid;gap:12px')}>
                {[...report.checks]
                  .sort((a, b) => ({ problem: 0, warning: 1, good: 2, na: 3 }[a.status] - { problem: 0, warning: 1, good: 2, na: 3 }[b.status]) || b.weight - a.weight)
                  .map((c) => <CheckCard key={c.id} check={c} money={money} />)}
              </div>
            </Section>
          ) : (
            <div style={sx(`margin-top:20px;padding:18px 20px;${CARD};font-size:13.5px;line-height:1.55;color:var(--ink-2)`)}>
              We need at least {report.minTrades} closed trades in a period to score it fairly — this one has {report.trades}.
              {months < 3 ? ' Try a longer period above.' : ' Trade a little more and refresh.'}
            </div>
          )}

          {/* ── Worst day ─────────────────────────────────────────────── */}
          {report.worstDay && (
            <Section title={`Your worst day: ${istDay(report.worstDay.date + 'T06:30:00Z')}`} note={`${money(report.worstDay.pnl, { signed: true })} on the day`}>
              <div style={sx(`${CARD};padding:8px 0`)}>
                {report.worstDay.firstLoss != null && (
                  <div style={sx('padding:8px 18px 12px;font-size:13px;line-height:1.5;color:var(--ink-2);border-bottom:1px solid var(--line)')}>
                    First loss {money(report.worstDay.firstLoss, { signed: true })}, then the trades after it made {money(report.worstDay.afterFirstLoss, { signed: true })} more.
                  </div>
                )}
                <ol style={sx('margin:0;padding:6px 18px;list-style:none')}>
                  {report.worstDay.timeline.map((t, i) => (
                    <li key={i} style={sx('display:flex;align-items:center;gap:12px;padding:8px 0;font-size:13px', i ? { borderTop: '1px solid var(--line)' } : {})}>
                      <span style={sx("flex:none;width:44px;font:500 11.5px/1 'JetBrains Mono',monospace;color:var(--ink-faint)")}>{istTime(t.at)}</span>
                      <span style={sx('flex:1;min-width:0;font-weight:600')}>{t.symbol} <span style={sx('font-weight:500;color:var(--ink-3)')}>{t.side ?? ''}</span></span>
                      {t.revenge && <Chip tone="red">Revenge</Chip>}
                      <span style={sx('flex:none;width:86px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums', { color: t.pnl < 0 ? 'var(--red)' : 'var(--mint)' })}>{money(t.pnl, { signed: true })}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
