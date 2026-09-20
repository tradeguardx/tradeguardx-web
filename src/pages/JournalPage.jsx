import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { usePrefs } from '../context/PrefsContext';
import { useToast } from '../components/common/ToastProvider';
import { fetchJournalStats, fetchJournalTrades, fetchBehaviorTags } from '../api/tradesApi';
import { fetchBreaches } from '../api/breachesApi';
import { journalHistoryDaysForPlan } from '../lib/planLimits';
import { tagLabel } from '../lib/labels';
import { fmtMoney } from '../lib/session';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Journal — reference lines 1177–1364 plus Part B of the Rules & Journal
 * exact-build spec. Four tabs: Performance (landing), Coach, P&L calendar,
 * Behaviour.
 *
 * Data: journal stats (calendar, equity curve, by-symbol, by-weekday,
 * overview), journal trades, behaviour tags and breach events — all existing
 * endpoints. Every figure derives from one selector per figure; the
 * discipline score on Performance and Behaviour is the same value.
 *
 * Honest gaps, marked inline:
 *  - session-note answers persist per account per day in this browser
 *    (// TODO(api): no session-note endpoint)
 *  - a rule break is priced from the breach's own context (drawdown, loss at
 *    stop) or the trade it is stamped on; breaks with neither show "—"
 *  - behaviour tags are not priced by the API; they rank below priced rows
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';
const TAB_ON = 'padding:8px 16px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;background:var(--ink);color:var(--bg-deep)';
const TAB_OFF = 'padding:8px 16px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;background:transparent;color:var(--ink-2)';
const READ = 'padding:14px 21px;border-top:1px solid var(--line);background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2);text-wrap:pretty';
const MONO_LABEL = "font:500 10.5px/1 'JetBrains Mono',monospace;color:var(--ink-faint)";
const QUESTIONS = ['What did you see that made you enter?', 'Where were you wrong, and what did you do about it?', 'What will you do differently in the next session?'];
const RULE_NAME = {
  'daily-loss': 'Daily loss protection', 'daily-profit-target': 'Daily profit target', 'stop-loss-alert': 'Stop loss protection', 'risk-per-trade': 'Risk per trade',
  'max-total-loss': 'Max drawdown lock', 'max-trades-day': 'Max trades per day', 'close-after-losses': 'Close after N losses',
};
const TAG_RULE = {
  LATE_RISK_MANAGER: 'stop-loss-alert', SL_WIDENER: 'risk-per-trade', SL_REMOVER: 'stop-loss-alert', OVERTRADER: 'max-trades-day', REVENGE_TRADER: 'close-after-losses',
  HESITATION_CLOSER: 'daily-loss', TP_CHASER: 'daily-profit-target', REACTIVE_TRADER: 'close-after-losses', RISK_ESCALATOR: 'risk-per-trade', HEDGE_HIDER: 'risk-per-trade',
};
const BREACH_RULE = { daily_loss_limit_hit: 'daily-loss', daily_loss_warning: 'daily-loss', daily_target_hit: 'daily-profit-target', max_total_loss_hit: 'max-total-loss', risk_per_trade_exceeded: 'risk-per-trade', max_trades_exceeded: 'max-trades-day', consecutive_losses: 'close-after-losses', stop_loss_missing: 'stop-loss-alert' };
const DAY_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null) return o[k]; return null; }
function fmtHold(sec) { if (sec == null || !Number.isFinite(sec)) return '—'; const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/** One helper for every money figure: −$ negative, +$ positive, $0 for zero. */
function money(v, cur = 'USD', decimals = 0) { return fmtMoney(v, cur, { sign: true, decimals }); }
function pct(v, dp = 1) { if (v == null || !Number.isFinite(v)) return '—'; return `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(dp)}%`; }
function pnlOf(t) { return Number(pick(t, 'realizedPnl', 'pnl', 'netPnl')) || 0; }
function isLong(t) { const s = String(pick(t, 'side') || '').toUpperCase(); return s === 'BUY' || s === 'LONG'; }
function shortDate(iso) { try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' }); } catch { return ''; } }
function breachRule(b) { return b.ruleSlug || BREACH_RULE[b.breachType] || null; }
/** Price a break from what the engine recorded, or the trade it is stamped on. Null when neither exists. */
function breachCost(b, tradeByUid) {
  const c = b.context || {};
  if (b.tradeUid && tradeByUid.has(b.tradeUid)) { const p = pnlOf(tradeByUid.get(b.tradeUid)); if (p < 0) return p; }
  for (const k of ['drawdown', 'lossAtStop', 'loss']) { const v = Number(c[k]); if (Number.isFinite(v) && v > 0) return -v; }
  return null;
}
function signFg(v) { return v < 0 ? 'var(--red)' : v > 0 ? 'var(--mint)' : 'var(--ink)'; }

function InfoGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" style={{ flex: 'none', marginTop: 1, color: 'var(--ink-3)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}

/** Cumulative-P&L or drawdown series → SVG geometry in a 700×h box. */
function pathFor(series, h) {
  if (!series.length) return { line: '', hi: 0, lo: 0, zeroY: h / 2 };
  const hi = Math.max(0, ...series), lo = Math.min(0, ...series);
  const span = hi - lo || 1;
  const y = (v) => 6 + ((hi - v) / span) * (h - 12);
  const x = (i) => (series.length === 1 ? 350 : (i / (series.length - 1)) * 700);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  return { line: `M${pts.join(' L')}`, hi, lo, zeroY: y(0) };
}

export default function JournalPage() {
  const { session, user } = useAuth();
  const { selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  const { selected: guard, now } = useGuard();
  const { prefs } = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;
  const [tab, setTab] = useState('perf');
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState(null);
  const [beh, setBeh] = useState(null);
  const [breaches, setBreaches] = useState([]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState(null);

  const planDays = journalHistoryDaysForPlan(user?.plan) ?? 3650;
  const days = Math.min(planDays, 90);
  const cur = selectedAccount?.accountCurrency || 'USD';

  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    const opt = { accessToken, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal };
    fetchJournalStats({ ...opt, days }).then((r) => !ctrl.signal.aborted && setStats(r)).catch(() => setStats({}));
    fetchJournalTrades({ ...opt, limit: 500 }).then((r) => !ctrl.signal.aborted && setTrades(Array.isArray(r) ? r : r?.trades ?? [])).catch(() => setTrades([]));
    fetchBehaviorTags(opt).then((r) => !ctrl.signal.aborted && setBeh(r)).catch(() => setBeh({ behaviorTags: [], disciplineScore: null }));
    fetchBreaches({ ...opt, limit: 200 }).then((r) => !ctrl.signal.aborted && setBreaches(r)).catch(() => setBreaches([]));
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId, days]);

  // ── selectors ────────────────────────────────────────────────────────
  const since = now - days * 86400000;
  const closed = useMemo(() => (trades ?? []).filter((t) => String(pick(t, 'status') || '').toUpperCase() === 'CLOSED' && pick(t, 'closedAt')), [trades]);
  const closed90 = useMemo(() => closed.filter((t) => new Date(pick(t, 'closedAt')).getTime() >= since), [closed, since]);
  const tradeByUid = useMemo(() => new Map(closed.map((t) => [pick(t, 'tradeUid', 'trade_uid'), t]).filter(([k]) => k)), [closed]);
  const breaches90 = useMemo(() => breaches.filter((b) => new Date(b.createdAt).getTime() >= since), [breaches, since]);
  const blank = closed90.length === 0;
  const ov = stats?.overview;
  const score = beh?.disciplineScore?.overall ?? null;
  const ruleOn = (slug) => (guard.rules?.instances ?? []).some((i) => i.templateSlug === slug && i.enabled !== false);

  const wins = closed90.filter((t) => pnlOf(t) > 0), losses = closed90.filter((t) => pnlOf(t) < 0);
  const netPnl = ov?.totalPnl ?? closed90.reduce((s, t) => s + pnlOf(t), 0);
  const winRate = ov?.winRate ?? (closed90.length ? (wins.length / closed90.length) * 100 : null);
  const profitFactor = ov?.profitFactor ?? null;
  const expectancy = closed90.length ? netPnl / closed90.length : null;
  const avgWin = wins.length ? wins.reduce((s, t) => s + pnlOf(t), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + pnlOf(t), 0) / losses.length : 0;
  const avgRR = avgLoss !== 0 && wins.length ? avgWin / Math.abs(avgLoss) : null;
  const avgHold = ov?.avgHoldSeconds ?? null;

  const equity = useMemo(() => (stats?.equityCurve ?? []).map((p) => Number(p.cumPnl) || 0), [stats]);
  const equityDates = useMemo(() => (stats?.equityCurve ?? []).map((p) => p.date), [stats]);
  const dd = useMemo(() => equity.reduce((acc, v) => { const peak = Math.max(acc.peak, v); acc.out.push(v - peak); acc.peak = peak; return acc; }, { peak: 0, out: [] }).out, [equity]);
  const maxDd = dd.length ? Math.min(...dd) : 0;
  const maxDdAt = dd.length ? equityDates[dd.indexOf(maxDd)] : null;
  const peakBeforeDd = useMemo(() => { const i = dd.indexOf(maxDd); return i < 0 ? 0 : equity[i] - maxDd; }, [dd, equity, maxDd]);
  const recovered = dd.length ? dd[dd.length - 1] === 0 : true;
  const maxDdPct = peakBeforeDd > 0 ? (maxDd / peakBeforeDd) * 100 : null;

  // Per symbol: gross won vs gross lost, normalised against the card max.
  const bySymbol = useMemo(() => {
    const m = new Map();
    for (const t of closed90) { const s = pick(t, 'symbol') || '—'; const r = m.get(s) || { symbol: s, won: 0, lost: 0 }; const p = pnlOf(t); if (p > 0) r.won += p; else r.lost += -p; m.set(s, r); }
    const rows = [...m.values()].map((r) => ({ ...r, net: r.won - r.lost })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 5);
    const max = Math.max(1, ...rows.flatMap((r) => [r.won, r.lost]));
    return rows.map((r) => ({ ...r, wonPct: `${Math.round((r.won / max) * 100)}%`, lostPct: `${Math.round((r.lost / max) * 100)}%` }));
  }, [closed90]);
  const leak = bySymbol.find((r) => r.net < 0);

  const weekdays = useMemo(() => {
    const src = stats?.byDayOfWeek ?? [];
    const order = prefs.weekStart === 'sun' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const rows = order.map((d) => ({ day: d, v: Number(src.find((x) => x.day === d)?.pnl) || 0 }));
    const dayMax = Math.max(1, ...rows.map((r) => Math.abs(r.v)));
    return rows.map((r) => ({ ...r, px: r.v === 0 ? 0 : Math.max(3, Math.round((Math.abs(r.v) / dayMax) * 68)) }));
  }, [stats, prefs.weekStart]);
  const worstDay = weekdays.reduce((w, r) => (r.v < (w?.v ?? 0) ? r : w), null);
  const bestDay = weekdays.reduce((w, r) => (r.v > (w?.v ?? 0) ? r : w), null);
  const breaksOnWorstDay = worstDay ? breaches90.filter((b) => new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' }) === worstDay.day).length : 0;

  const sides = useMemo(() => ['long', 'short'].map((k) => {
    const rows = closed90.filter((t) => (k === 'long') === isLong(t));
    const w = rows.filter((t) => pnlOf(t) > 0).length;
    return { k, label: k === 'long' ? 'Long' : 'Short', fg: k === 'long' ? 'var(--blue)' : 'var(--violet)', n: rows.length, net: rows.reduce((s, t) => s + pnlOf(t), 0), wr: rows.length ? (w / rows.length) * 100 : null };
  }), [closed90]);

  // Ledger: breaches grouped by rule (priced), then behaviour tags (unpriced).
  const ledger = useMemo(() => {
    const m = new Map();
    for (const b of breaches90) {
      const slug = breachRule(b); if (!slug) continue;
      const r = m.get(slug) || { key: slug, slug, name: RULE_NAME[slug] || slug, n: 0, cost: 0, priced: 0, why: b.message };
      r.n += 1; const c = breachCost(b, tradeByUid); if (c != null) { r.cost += c; r.priced += 1; }
      m.set(slug, r);
    }
    const priced = [...m.values()].sort((a, b) => a.cost - b.cost);
    const tags = (beh?.behaviorTags ?? []).filter((t) => t.severity !== 'POSITIVE' && !m.has(TAG_RULE[t.tag])).sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0))
      .map((t) => ({ key: t.tag, slug: TAG_RULE[t.tag] || 'daily-loss', name: tagLabel(t.tag), n: t.matchCount ?? 0, cost: null, why: t.description || t.evidence }));
    return [...priced, ...tags];
  }, [breaches90, tradeByUid, beh]);
  const ledgerTotal = ledger.reduce((s, r) => s + (r.cost ?? 0), 0);
  const ledgerMax = Math.max(1, ...ledger.map((r) => Math.abs(r.cost ?? 0)));

  const disciplineFg = score == null ? 'var(--ink-3)' : score < 60 ? 'var(--red)' : 'var(--amber)';
  const statCards = (() => {
    const dash = (k, note) => ({ k, v: '—', note, fg: 'var(--ink-3)' });
    if (blank) return [dash('Net P&L', 'needs closed trades'), dash('Win rate', 'needs closed trades'), dash('Profit factor', 'needs closed trades'), dash('Expectancy', 'needs closed trades'), dash('Max drawdown', 'needs closed trades'), dash('Avg R:R', 'needs closed trades'), dash('Avg hold', 'needs closed trades'), dash('Discipline', 'scored after ~20 trades')];
    return [
      { k: 'Net P&L', v: money(netPnl, cur, 2), note: `${closed90.length} closed trades, ${days} days`, fg: signFg(netPnl) },
      { k: 'Win rate', v: winRate != null ? `${Math.round(winRate)}%` : '—', note: `${wins.length} of ${closed90.length} trades`, fg: 'var(--ink)' },
      { k: 'Profit factor', v: profitFactor != null ? profitFactor.toFixed(2) : '—', note: 'gross won ÷ gross lost', fg: profitFactor != null && profitFactor < 1 ? 'var(--red)' : 'var(--ink)' },
      { k: 'Expectancy', v: expectancy != null ? money(expectancy, cur, 2) : '—', note: 'average result per trade', fg: expectancy != null && expectancy < 0 ? 'var(--red)' : 'var(--ink)' },
      { k: 'Max drawdown', v: maxDd < 0 ? money(maxDd, cur, 0) : '$0', note: maxDdPct != null ? `${pct(maxDdPct)} from the peak${recovered ? ', recovered' : ', still in it'}` : 'peak to trough, closed P&L', fg: maxDd < 0 ? 'var(--red)' : 'var(--ink)' },
      { k: 'Avg R:R', v: avgRR != null ? avgRR.toFixed(2) : '—', note: 'average win ÷ average loss', fg: 'var(--ink)' },
      { k: 'Avg hold', v: fmtHold(avgHold), note: `${(closed90.length / days).toFixed(1)} trades per day`, fg: 'var(--ink)' },
      { k: 'Discipline', v: score != null ? `${score}/100` : '—', note: score != null ? `${breaches90.length} rule ${breaches90.length === 1 ? 'break' : 'breaks'} in ${days} days` : 'scored after ~20 trades', fg: disciplineFg },
    ];
  })();
  const jStats = tab === 'perf' ? statCards : [statCards[1], statCards[5], statCards[6], statCards[7]];

  // ── coach answers (per account, per day, this browser) ──────────────
  const noteKey = `tgx_coach_${selectedTradingAccountId}_${dayKey(new Date())}`;
  const stored = useMemo(() => { try { return JSON.parse(localStorage.getItem(noteKey) || '["","",""]'); } catch { return ['', '', '']; } }, [noteKey]);
  const [edits, setEdits] = useState({});
  const answers = edits[noteKey] ?? stored;
  const setAnswers = (fn) => setEdits((e) => ({ ...e, [noteKey]: fn(e[noteKey] ?? stored) }));
  const saveNote = () => { try { localStorage.setItem(noteKey, JSON.stringify(answers)); toast.success('Session note saved', 'Kept in this browser for today.'); } catch { toast.error('Could not save', 'Storage is unavailable in this browser.'); } };

  const narrative = blank
    ? 'Nothing to read yet. After roughly ten sessions we can tell you where your money actually goes — and it is almost never where traders expect. Answer the three questions each day and the pattern shows up fast.'
    : [
      ledger[0]?.cost != null && ledger[0].cost < 0 ? `${ledger[0].name} is the habit that cost the most: ${money(ledger[0].cost, cur, 0)} over ${ledger[0].n} ${ledger[0].n === 1 ? 'break' : 'breaks'}.` : null,
      worstDay && worstDay.v < 0 ? `${DAY_LONG[worstDay.day]} is your expensive day at ${money(worstDay.v, cur, 0)}.` : null,
      ...(beh?.behaviorTags ?? []).filter((t) => t.severity !== 'POSITIVE').slice(0, 2).map((t) => t.description || t.evidence),
    ].filter(Boolean).join(' ') || 'Your recent sessions show no repeating habit yet. Keep answering the three questions — the pattern usually shows inside ten sessions.';

  // ── calendar ────────────────────────────────────────────────────────
  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of closed) { const k = dayKey(new Date(pick(t, 'closedAt'))); const row = m.get(k) || { n: 0, trades: [] }; row.n += pnlOf(t); row.trades.push(t); m.set(k, row); }
    return m;
  }, [closed]);
  const breachesByDay = useMemo(() => { const m = new Map(); for (const b of breaches) { const k = dayKey(new Date(b.createdAt)); m.set(k, [...(m.get(k) || []), b]); } return m; }, [breaches]);
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const weekStartsMon = prefs.weekStart !== 'sun';
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let lead = first.getDay(); if (weekStartsMon) lead = (lead + 6) % 7;
    const out = [];
    for (let i = 0; i < lead; i++) out.push({ empty: true, key: `e${i}` });
    for (let d = 1; d <= dim; d++) {
      const k = dayKey(new Date(month.getFullYear(), month.getMonth(), d));
      const row = byDay.get(k);
      const has = row && row.n !== 0;
      out.push({ empty: false, key: k, day: d, n: row?.n ?? 0, trades: row?.trades ?? [], pnl: has ? money(row.n, cur, 0).replace(/^([+−])[$₹]/, '$1') : '',
        bg: has ? (row.n > 0 ? 'var(--mint-tint)' : 'var(--red-tint)') : 'var(--surface-2)', fg: has ? (row.n > 0 ? 'var(--mint)' : 'var(--red)') : 'var(--ink-faint)', line: has ? (row.n > 0 ? 'var(--mint-line)' : 'var(--red-line)') : 'var(--line)' });
    }
    while (out.length % 7) out.push({ empty: true, key: `t${out.length}` });
    return out;
  }, [month, byDay, weekStartsMon, cur]);
  const monthCells = cells.filter((c) => !c.empty && c.pnl);
  const green = monthCells.filter((c) => c.n > 0).length, red = monthCells.filter((c) => c.n < 0).length;
  const monthTotal = monthCells.reduce((s, c) => s + c.n, 0);
  const best = monthCells.length ? Math.max(...monthCells.map((c) => c.n)) : null, worst = monthCells.length ? Math.min(...monthCells.map((c) => c.n)) : null;
  const calSummary = monthCells.length === 0
    ? [{ k: 'Green days', v: '—', fg: 'var(--ink-3)' }, { k: 'Red days', v: '—', fg: 'var(--ink-3)' }, { k: 'Month', v: '—', fg: 'var(--ink-3)' }, { k: 'Best / worst', v: '—', fg: 'var(--ink-3)' }]
    : [{ k: 'Green days', v: String(green), fg: 'var(--mint)' }, { k: 'Red days', v: String(red), fg: 'var(--red)' }, { k: 'Month', v: money(monthTotal, cur, 2), fg: signFg(monthTotal) }, { k: 'Best / worst', v: `${money(best, cur, 0)} / ${money(worst, cur, 0)}`, fg: 'var(--ink)' }];
  const dayCell = day ? cells.find((c) => c.key === day) : null;
  const drawerBreaks = dayCell ? (breachesByDay.get(dayCell.key) || []).map((b) => ({ id: b.id, text: `${RULE_NAME[breachRule(b)] || 'Rule'} — ${b.message}`, cost: breachCost(b, tradeByUid) })) : [];
  const dayNames = weekStartsMon ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const ring = score == null ? 'conic-gradient(var(--surface-3) 0turn 1turn)' : `conic-gradient(${score < 60 ? 'var(--red-solid)' : score < 80 ? 'var(--amber-solid)' : 'var(--mint-solid)'} 0turn ${score / 100}turn, var(--surface-3) ${score / 100}turn 1turn)`;

  const eq = pathFor(equity, 150);
  const ddp = pathFor(dd, 100);
  const eqColor = netPnl < 0 ? 'var(--red-solid)' : 'var(--mint-solid)';
  const xLabels = equityDates.length ? [equityDates[0], equityDates[Math.floor((equityDates.length - 1) / 2)], equityDates[equityDates.length - 1]].map(shortDate) : [];

  const readEquity = netPnl < 0
    ? `You are ${money(netPnl, cur, 0)} over ${days} days. ${ruleOn('daily-loss') ? 'Daily loss protection is on — the curve should stop falling at the limit each day.' : 'Daily loss protection is off, so there is no floor under a bad day.'}`
    : `You are ${money(netPnl, cur, 0)} over ${days} days. ${ruleOn('daily-profit-target') ? 'Daily profit target is on, so green days are banked instead of handed back.' : 'Daily profit target is off — switching it on banks a green day before it turns.'}`;
  const readDd = maxDd < 0
    ? `${recovered ? 'You recovered your worst drawdown' : `You have not recovered a drawdown since ${shortDate(maxDdAt)}`}. Your max drawdown rule is ${ruleOn('max-total-loss') ? 'on — it would have alerted at your limit' : `off — switching it on would have stopped the day at ${maxDdPct != null ? pct(maxDdPct) : money(maxDd, cur, 0)}`}.`
    : 'No drawdown yet — every closed trade so far has kept the curve at its peak.';
  const readSymbol = bySymbol[0]
    ? (bySymbol[0].net < 0
      ? `${bySymbol[0].symbol} takes the most: ${money(bySymbol[0].net, cur, 0)} net. Risk per trade ${ruleOn('risk-per-trade') ? 'is on, so no single position on it can exceed your cap' : 'is off — a cap per position is what stops one symbol from running the whole account'}.`
      : `${bySymbol[0].symbol} earns the most at ${money(bySymbol[0].net, cur, 0)} net. ${leak ? `${leak.symbol} is the leak at ${money(leak.net, cur, 0)}.` : 'Nothing is leaking yet.'}`)
    : '—';
  const readWeekday = worstDay && worstDay.v < 0
    ? `${DAY_LONG[worstDay.day]} costs you ${money(worstDay.v, cur, 0)} on its own. ${breaksOnWorstDay > 0 ? `${breaksOnWorstDay} of your ${breaches90.length} rule ${breaches90.length === 1 ? 'break' : 'breaks'} happened on a ${DAY_LONG[worstDay.day]}.` : ruleOn('max-trades-day') ? 'Max trades per day is on — it caps how much that day can run.' : 'Max trades per day is off — a cap is the cheapest brake for a day that keeps losing.'}`
    : bestDay && bestDay.v > 0 ? `No losing weekday yet. ${DAY_LONG[bestDay.day]} is your best at ${money(bestDay.v, cur, 0)}.` : '—';
  const readSides = (() => {
    const [l, s] = sides;
    if (!l.n || !s.n) return `${l.n ? 'Only longs' : 'Only shorts'} so far — nothing to compare yet.`;
    const worse = l.net < s.net ? l : s; const better = worse === l ? s : l;
    return `${better.label}s pay you ${money(better.net, cur, 0)}; ${worse.label.toLowerCase()}s ${worse.net < 0 ? 'cost' : 'only add'} ${money(worse.net, cur, 0)}. ${ruleOn('close-after-losses') ? 'Close after N losses is on — a losing streak in the weaker direction gets stopped.' : 'Close after N losses is off — a streak in the weaker direction runs until you stop it yourself.'}`;
  })();

  return (
    <div style={sx('animation:tgxSlide .22s ease-out')}>
      <div style={sx('margin-bottom:16px;max-width:80ch')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Journal</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Not a diary. A record of which habits cost you money, with the receipts attached.</p>
      </div>

      <div className="jn-tabs" style={sx('display:inline-flex;gap:3px;margin-bottom:20px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)')} role="tablist">
        {[['perf', 'Performance'], ['coach', 'Coach'], ['calendar', 'P&L calendar'], ['behaviour', 'Behaviour']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={sx(tab === id ? TAB_ON : TAB_OFF)}>{label}</button>
        ))}
      </div>

      <div className="jn-stats" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,232px),1fr));gap:14px;margin-bottom:22px')}>
        {jStats.map((c) => (
          <div key={c.k} style={sx('padding:17px 18px;border:1px solid var(--line);border-radius:18px;background:var(--surface);background-image:linear-gradient(180deg,rgba(255,255,255,.028),transparent 46%);box-shadow:var(--shadow-card)')}>
            <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>{c.k}</div>
            <div style={sx("margin-top:13px;font:700 27px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.035em", { color: c.fg })}>{c.v}</div>
            <div style={sx('margin-top:8px;font-size:11.5px;line-height:1.5;color:var(--ink-3);text-wrap:pretty')}>{c.note}</div>
          </div>
        ))}
      </div>

      {tab === 'perf' && (blank ? (
        <section style={sx(CARD, { padding: '34px 24px', textAlign: 'center' })}>
          <div style={sx('font-size:14px;font-weight:600')}>Nothing to measure yet</div>
          <p style={sx('margin:7px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:56ch')}>These charts need closed trades. After about ten sessions they tell you which symbol, which day, and which habit is taking the money — and we would rather show you nothing than a chart built from four trades.</p>
        </section>
      ) : (
        <div style={sx('display:grid;gap:16px')}>
          {/* 1. Equity curve */}
          <section style={sx(CARD)}>
            <div data-tgx-stack="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 21px')}>
              <div>
                <h3 style={sx(H3)}>Equity curve</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Cumulative closed P&amp;L, last {days} days</p>
              </div>
              <div style={sx('text-align:right')}>
                <div style={sx("font:700 21px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;font-variant-numeric:tabular-nums", { color: signFg(netPnl) })}>{money(netPnl, cur, 2)}</div>
                <div style={sx('margin-top:4px;font-size:11.5px;color:var(--ink-3)')}>{closed90.length} trades</div>
              </div>
            </div>
            <div style={sx('padding:16px 21px 12px')}>
              <div style={sx(MONO_LABEL, { marginBottom: 6 })}>{money(eq.hi, cur, 0)}</div>
              <svg viewBox="0 0 700 150" preserveAspectRatio="none" style={{ width: '100%', height: 150, display: 'block' }} aria-hidden>
                <defs><linearGradient id="jn-eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={eqColor} stopOpacity=".26" /><stop offset="1" stopColor={eqColor} stopOpacity="0" /></linearGradient></defs>
                <line x1="0" x2="700" y1={eq.zeroY} y2={eq.zeroY} stroke="var(--line-strong)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                {eq.line && <path d={`${eq.line} L700,${eq.zeroY.toFixed(1)} L0,${eq.zeroY.toFixed(1)} Z`} fill="url(#jn-eq)" />}
                {eq.line && <path d={eq.line} fill="none" stroke={eqColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              </svg>
              <div style={sx(MONO_LABEL, { marginTop: 6 })}>{money(eq.lo, cur, 0)}</div>
              <div style={sx('display:flex;justify-content:space-between;margin-top:8px', sx(MONO_LABEL))}>{xLabels.map((l, i) => <span key={i}>{l}</span>)}</div>
            </div>
            <div style={sx(READ, { display: 'flex', gap: 10 })}><InfoGlyph /><span>{readEquity}</span></div>
          </section>

          {/* 2. Drawdown */}
          <section style={sx(CARD)}>
            <div data-tgx-stack="1" style={sx('display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 21px')}>
              <div>
                <h3 style={sx(H3)}>Drawdown</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Distance below the previous peak, closed P&amp;L</p>
              </div>
              <span style={sx("padding:5px 10px;border:1px solid var(--red-line);border-radius:999px;background:var(--red-tint);color:var(--red);font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase")}>Max {maxDdPct != null ? pct(maxDdPct) : money(maxDd, cur, 0)}</span>
            </div>
            <div style={sx('padding:16px 21px 12px')}>
              <div style={sx(MONO_LABEL, { marginBottom: 6 })}>0%</div>
              <svg viewBox="0 0 700 100" preserveAspectRatio="none" style={{ width: '100%', height: 100, display: 'block' }} aria-hidden>
                <defs><linearGradient id="jn-dd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--red-solid)" stopOpacity="0" /><stop offset="1" stopColor="var(--red-solid)" stopOpacity=".22" /></linearGradient></defs>
                <line x1="0" x2="700" y1={ddp.zeroY} y2={ddp.zeroY} stroke="var(--line-strong)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                {ddp.line && <path d={`${ddp.line} L700,${ddp.zeroY.toFixed(1)} L0,${ddp.zeroY.toFixed(1)} Z`} fill="url(#jn-dd)" />}
                {ddp.line && <path d={ddp.line} fill="none" stroke="var(--red-solid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              </svg>
              <div style={sx(MONO_LABEL, { marginTop: 6 })}>{money(maxDd, cur, 0)}</div>
            </div>
            <div style={sx(READ, { display: 'flex', gap: 10 })}><InfoGlyph /><span>{readDd}</span></div>
          </section>

          {/* 3 + 4 */}
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:16px')}>
            <section style={sx(CARD)}>
              <div style={sx('padding:18px 21px')}>
                <h3 style={sx(H3)}>Where the money comes from</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Gross won against gross lost, per symbol</p>
              </div>
              <div style={sx('padding:16px 21px;display:grid;gap:15px')}>
                {bySymbol.map((r) => (
                  <div key={r.symbol}>
                    <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px')}>
                      <span style={sx("font:500 12px/1 'JetBrains Mono',monospace;letter-spacing:.06em")}>{r.symbol}</span>
                      <span style={sx('font-size:12px;font-weight:700;font-variant-numeric:tabular-nums', { color: signFg(r.net) })}>{money(r.net, cur, 0)}</span>
                    </div>
                    <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:4px')}>
                      <span style={sx('flex:1;min-width:0;display:block;height:8px')}><span style={sx('display:block;height:8px;border-radius:2px;background:var(--mint-solid);opacity:.75', { width: r.wonPct })} /></span>
                      <span style={sx('flex:none;white-space:nowrap;font-size:11px;font-variant-numeric:tabular-nums;color:var(--ink-3)')}>won {money(r.won, cur, 0).replace('+', '')}</span>
                    </div>
                    <div style={sx('display:flex;align-items:center;gap:8px')}>
                      <span style={sx('flex:1;min-width:0;display:block;height:8px')}><span style={sx('display:block;height:8px;border-radius:2px;background:var(--red-solid);opacity:.75', { width: r.lostPct })} /></span>
                      <span style={sx('flex:none;white-space:nowrap;font-size:11px;font-variant-numeric:tabular-nums;color:var(--ink-3)')}>lost {money(-r.lost, cur, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={sx(READ)}>{readSymbol}</div>
            </section>

            <section style={sx(CARD)}>
              <div style={sx('padding:18px 21px')}>
                <h3 style={sx(H3)}>P&amp;L by weekday</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Closed P&amp;L by the day it closed</p>
              </div>
              <div style={sx('padding:18px 21px 16px;display:flex;align-items:flex-start;gap:10px')}>
                {weekdays.map((d) => (
                  <div key={d.day} style={sx('flex:1;min-width:0;display:flex;flex-direction:column;align-items:center')}>
                    <div style={sx('height:15px;display:flex;align-items:flex-end;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--ink-3);white-space:nowrap')}>{d.v > 0 ? money(d.v, cur, 0) : ''}</div>
                    <div style={sx('height:72px;width:100%;display:flex;align-items:flex-end;margin-top:4px')}>{d.v > 0 && <div style={sx('width:100%;border-radius:4px 4px 0 0;background:var(--mint-solid);opacity:.8', { height: `${d.px}px` })} />}</div>
                    <div style={sx('width:100%;height:1px;background:var(--line-strong)')} />
                    <div style={sx('height:72px;width:100%;display:flex;align-items:flex-start')}>{d.v < 0 && <div style={sx('width:100%;border-radius:0 0 4px 4px;background:var(--red-solid);opacity:.8', { height: `${d.px}px` })} />}</div>
                    <div style={sx('height:15px;display:flex;align-items:flex-start;margin-bottom:4px;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--ink-3);white-space:nowrap')}>{d.v < 0 ? money(d.v, cur, 0) : ''}</div>
                    <div style={sx("font:500 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:var(--ink-faint)")}>{d.day}</div>
                  </div>
                ))}
              </div>
              <div style={sx(READ)}>{readWeekday}</div>
            </section>
          </div>

          {/* 5. Long vs short */}
          <section style={sx(CARD)}>
            <div style={sx('padding:18px 21px')}>
              <h3 style={sx(H3)}>Long vs short</h3>
              <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Which direction actually pays you</p>
            </div>
            <div style={sx('padding:0 21px 18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px')}>
              {sides.map((s) => (
                <div key={s.k} style={sx('padding:15px 16px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)')}>
                  <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:10px')}>
                    <span style={sx('font-size:13px;font-weight:700', { color: s.fg })}>{s.label}</span>
                    <span style={sx('font-size:11.5px;color:var(--ink-3);font-variant-numeric:tabular-nums')}>{s.n} {s.n === 1 ? 'trade' : 'trades'}</span>
                  </div>
                  <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px')}>
                    <div>
                      <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>Net P&amp;L</div>
                      <div style={sx("margin-top:8px;font:700 21px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;font-variant-numeric:tabular-nums", { color: signFg(s.net) })}>{s.n ? money(s.net, cur, 0) : '—'}</div>
                    </div>
                    <div>
                      <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)")}>Win rate</div>
                      <div style={sx("margin-top:8px;font:700 21px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;font-variant-numeric:tabular-nums")}>{s.wr != null ? `${Math.round(s.wr)}%` : '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={sx(READ)}>{readSides}</div>
          </section>
        </div>
      ))}

      {tab === 'coach' && (
        <div className="jn-two" style={sx('display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:start')}>
          <section style={sx(CARD)}>
            <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
              <h3 style={sx(H3)}>Today&rsquo;s three questions</h3>
              <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Same three every session. Answering them takes two minutes and is the whole habit.</p>
            </div>
            {QUESTIONS.map((q, i) => (
              <div key={q} style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
                <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:9px')}>
                  <span style={sx('width:18px;height:18px;border-radius:50%;border:1px solid var(--line-strong);display:grid;place-items:center;flex:none')}>
                    {answers[i]?.trim() && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="3" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}
                  </span>
                  <span style={sx('font-size:13.5px;font-weight:600')}>{q}</span>
                </div>
                <textarea value={answers[i] ?? ''} onChange={(e) => setAnswers((a) => { const n = [...a]; n[i] = e.target.value; return n; })} rows={2} aria-label={q} style={sx('width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font-size:13px;line-height:1.55;color:var(--ink-2);min-height:44px;font-family:inherit;resize:vertical')} />
              </div>
            ))}
            <div style={sx('padding:14px 18px')}>
              <button type="button" onClick={saveNote} style={sx('padding:9px 14px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Save session note</button>
            </div>
          </section>

          <section style={sx(CARD)}>
            <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:9px')}>
              <h3 style={sx(H3)}>What the last {days} days say</h3>
            </div>
            <p style={sx('margin:0;padding:16px 18px;font-size:13px;line-height:1.65;color:var(--ink-2)')}>{narrative}</p>
            <div style={sx('padding:0 18px 16px')}>
              <button type="button" onClick={() => setTab('behaviour')} style={sx('padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>See the itemised ledger</button>
            </div>
          </section>
        </div>
      )}

      {tab === 'calendar' && (
        <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:18px;align-items:start')}>
          <section style={sx(CARD)}>
            <div style={sx('padding:15px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap')}>
              <div style={sx('display:flex;align-items:center;gap:8px')}>
                <button type="button" aria-label="Previous month" onClick={() => { setDay(null); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }} style={sx('width:26px;height:26px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
                <h3 style={sx(H3)}>{monthLabel}</h3>
                <button type="button" aria-label="Next month" onClick={() => { setDay(null); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }} style={sx('width:26px;height:26px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
              </div>
              <div style={sx('display:flex;gap:18px;flex-wrap:wrap')}>
                {calSummary.map((c) => (
                  <span key={c.k}>
                    <span style={sx('display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{c.k}</span>
                    <span style={sx("display:block;margin-top:4px;font:600 14px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: c.fg })}>{c.v}</span>
                  </span>
                ))}
              </div>
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:12px 14px 4px;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600;text-align:center')}>
              {dayNames.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div style={sx('display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:6px 14px 16px')}>
              {cells.map((d) => d.empty ? <span key={d.key} /> : (
                <button key={d.key} type="button" className="jn-day" onClick={() => setDay(d.key === day ? null : d.key)} style={sx('min-width:0;overflow:hidden;aspect-ratio:1;padding:7px;border-radius:9px;text-align:left;display:flex;flex-direction:column;justify-content:space-between', { border: `1px solid ${d.line}`, background: d.bg })}>
                  <span style={sx('font-size:11px;color:var(--ink-faint);font-variant-numeric:tabular-nums')}>{d.day}</span>
                  <span style={sx("font:600 12px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums", { color: d.fg })}>{d.pnl}</span>
                </button>
              ))}
            </div>
            <div style={sx('display:flex;align-items:flex-start;gap:9px;padding:13px 18px;border-top:1px solid var(--line);background:var(--surface-2);font-size:12.5px;color:var(--ink-2)')}>
              <InfoGlyph />
              <span>Click any day to see the trades behind the number and which rules were broken that session.</span>
            </div>
          </section>

          {dayCell && (
            <aside style={sx('width:100%;max-width:360px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxDrawer .2s ease-out')}>
              <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:10px')}>
                <div>
                  <div style={sx('font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{dayCell.day} {monthLabel}</div>
                  <div style={sx("margin-top:7px;font:700 26px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.02em", { color: signFg(dayCell.n) })}>{money(dayCell.n, cur, 2)}</div>
                </div>
                <button type="button" onClick={() => setDay(null)} aria-label="Close" style={sx('width:26px;height:26px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <div style={sx('padding:13px 18px 6px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>Trades</div>
              {dayCell.trades.length === 0 && <div style={sx('padding:10px 18px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-3)')}>No closed trades on this day.</div>}
              {dayCell.trades.map((t) => {
                const p = pnlOf(t);
                const hold = pick(t, 'openedAt') && pick(t, 'closedAt') ? fmtHold((new Date(pick(t, 'closedAt')) - new Date(pick(t, 'openedAt'))) / 1000) : '';
                return (
                  <div key={pick(t, 'tradeUid', 'trade_uid') || t.id} style={sx('display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--line);font-size:13px')}>
                    <span style={sx('font-weight:600;flex:1')}>{pick(t, 'symbol')}</span>
                    <span style={sx('color:var(--ink-3);font-size:12px')}>{isLong(t) ? 'Long' : 'Short'}{hold ? ` · ${hold}` : ''}</span>
                    <span style={sx('font-weight:600;font-variant-numeric:tabular-nums', { color: signFg(p) })}>{money(p, cur, 2)}</span>
                  </div>
                );
              })}
              <div style={sx('padding:13px 18px 6px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>Rules broken</div>
              {drawerBreaks.length === 0 ? (
                <div style={sx('padding:10px 18px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-3)')}>None recorded on this day.</div>
              ) : drawerBreaks.map((b) => (
                <div key={b.id} style={sx('display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--line);font-size:12.5px')}>
                  <span style={sx('width:6px;height:6px;border-radius:50%;background:var(--red-solid);flex:none')} />
                  <span style={sx('flex:1;color:var(--ink-2)')}>{b.text}</span>
                  <span style={sx('font-weight:600;font-variant-numeric:tabular-nums;color:var(--red);white-space:nowrap')}>{b.cost != null ? money(b.cost, cur, 0) : '—'}</span>
                </div>
              ))}
              <div style={sx('padding:14px 18px')}>
                <button type="button" onClick={() => navigate('/dashboard/trades')} style={sx('width:100%;padding:9px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700')}>Open these in all trades</button>
              </div>
            </aside>
          )}
        </div>
      )}

      {tab === 'behaviour' && (
        <div className="jn-beh" style={sx('display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:start')}>
          <section style={sx('width:252px;padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);text-align:center')}>
            <div style={sx('width:132px;height:132px;margin:4px auto 0;border-radius:50%;display:grid;place-items:center', { background: ring })}>
              <div style={sx('width:104px;height:104px;border-radius:50%;background:var(--surface);display:grid;place-items:center')}>
                <div>
                  <div style={sx("font:700 34px/1 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>{score == null ? '—' : score}</div>
                  <div style={sx('font-size:11px;color:var(--ink-faint);margin-top:4px')}>of 100</div>
                </div>
              </div>
            </div>
            <div style={sx('margin-top:16px;font-size:13.5px;font-weight:600')}>Discipline score</div>
            <p style={sx('margin:6px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3)')}>Not a grade. It is 100 minus what your rule breaks cost, scaled against your account size.</p>
          </section>

          <section style={sx(CARD)}>
            <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap')}>
              <div>
                <h3 style={sx(H3)}>Habit ledger · {days} days</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Ranked by what it cost, not by how often it happened.</p>
              </div>
              <span style={sx("font:600 18px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;color:var(--red)")}>{ledgerTotal < 0 ? money(ledgerTotal, cur, 0) : '—'}</span>
            </div>
            {ledger.length === 0 && (
              <div style={sx('padding:46px 20px;text-align:center')}>
                <div style={sx('font-size:14px;font-weight:600')}>Nothing priced yet</div>
                <p style={sx('margin:7px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:48ch')}>Once you have traded, every broken rule gets a rupee figure attached and ranks here by what it cost you.</p>
              </div>
            )}
            {ledger.map((r) => (
              <div key={r.key} style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
                <div style={sx('display:flex;align-items:baseline;gap:12px;flex-wrap:wrap')}>
                  <span style={sx('font-size:13.5px;font-weight:600;flex:1;min-width:180px')}>{r.name}</span>
                  <span style={sx('font-size:12px;color:var(--ink-3)')}>{r.n} {r.n === 1 ? 'time' : 'times'}</span>
                  <span style={sx("font:600 14px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;color:var(--red)")}>{r.cost != null && r.cost < 0 ? money(r.cost, cur, 0) : '—'}</span>
                </div>
                <div style={sx('margin:10px 0;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px;background:var(--red-solid)', { width: `${Math.round((Math.abs(r.cost ?? 0) / ledgerMax) * 100)}%` })} /></div>
                <p style={sx('margin:0 0 11px;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:84ch')}>{r.why}{r.cost == null ? ' Not priced yet — the engine records the habit but not what it cost.' : ''}</p>
                <button type="button" onClick={() => navigate('/dashboard/rules')} style={sx('padding:7px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>{ruleOn(r.slug) ? `Review ${RULE_NAME[r.slug] || r.slug}` : `Arm ${RULE_NAME[r.slug] || r.slug}`}</button>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
