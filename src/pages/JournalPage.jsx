import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { usePrefs } from '../context/PrefsContext';
import { useToast } from '../components/common/ToastProvider';
import { fetchJournalStats, fetchJournalTrades, fetchBehaviorTags } from '../api/tradesApi';
import { journalHistoryDaysForPlan } from '../lib/planLimits';
import { tagLabel } from '../lib/labels';
import { fmtMoney } from '../lib/session';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Journal — transcribed from the reference (lines 1177–1364). Three tabs:
 * Coach (three fixed questions + what the last 90 days say), P&L calendar
 * (heat grid + day drawer), Behaviour (discipline ring + habit ledger).
 *
 * Data: journal stats, trades and behaviour tags — the same endpoints the
 * previous journal used. Session-note answers persist per account per day
 * in this browser (// TODO(api): no session-note endpoint). Habits are not
 * priced by the API yet, so the ledger ranks by occurrence and says so.
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';
const TAB_ON = 'padding:8px 16px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;background:var(--ink);color:var(--bg-deep)';
const TAB_OFF = 'padding:8px 16px;border:0;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.005em;background:transparent;color:var(--ink-2)';
const QUESTIONS = ['What did you see that made you enter?', 'Where were you wrong, and what did you do about it?', 'What will you do differently in the next session?'];
const TAG_RULE = {
  LATE_RISK_MANAGER: ['stop-loss-alert', 'Stop loss protection'], SL_WIDENER: ['risk-per-trade', 'Risk per trade'], SL_REMOVER: ['stop-loss-alert', 'Stop loss protection'],
  OVERTRADER: ['max-trades-day', 'Max trades per day'], REVENGE_TRADER: ['close-after-losses', 'Close after N losses'], HESITATION_CLOSER: ['daily-loss', 'Daily loss protection'],
  TP_CHASER: ['daily-profit-target', 'Daily profit target'], REACTIVE_TRADER: ['close-after-losses', 'Close after N losses'], RISK_ESCALATOR: ['risk-per-trade', 'Risk per trade'], HEDGE_HIDER: ['risk-per-trade', 'Risk per trade'],
};

function pick(o, ...keys) { for (const k of keys) if (o && o[k] != null) return o[k]; return null; }
function fmtHold(sec) { if (sec == null) return '—'; const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export default function JournalPage() {
  const { session, user } = useAuth();
  const { selectedTradingAccountId } = useTradingAccounts();
  const { prefs } = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();
  const accessToken = session?.access_token;
  const [tab, setTab] = useState('coach');
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState(null);
  const [beh, setBeh] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState(null);

  const days = journalHistoryDaysForPlan(user?.plan) ?? 3650;

  useEffect(() => {
    if (!accessToken || !selectedTradingAccountId) return undefined;
    const ctrl = new AbortController();
    const opt = { accessToken, tradingAccountId: selectedTradingAccountId, signal: ctrl.signal };
    fetchJournalStats({ ...opt, days: Math.min(days, 90) }).then((r) => !ctrl.signal.aborted && setStats(r)).catch(() => setStats({}));
    fetchJournalTrades({ ...opt, limit: 500 }).then((r) => !ctrl.signal.aborted && setTrades(Array.isArray(r) ? r : r?.trades ?? [])).catch(() => setTrades([]));
    fetchBehaviorTags(opt).then((r) => !ctrl.signal.aborted && setBeh(r)).catch(() => setBeh({ behaviorTags: [], disciplineScore: null }));
    return () => ctrl.abort();
  }, [accessToken, selectedTradingAccountId, days]);

  const closed = useMemo(() => (trades ?? []).filter((t) => String(pick(t, 'status') || '').toUpperCase() === 'CLOSED' && pick(t, 'closedAt')), [trades]);
  const blank = closed.length === 0;
  const ov = stats?.overview;
  const score = beh?.disciplineScore?.overall ?? null;
  const tagCount = (beh?.behaviorTags ?? []).length;
  const cur = 'USD';

  const jStats = blank
    ? [{ k: 'Win rate', v: '—', note: 'needs closed trades', fg: 'var(--ink-3)' }, { k: 'Avg R:R', v: '—', note: 'needs closed trades', fg: 'var(--ink-3)' }, { k: 'Avg hold', v: '—', note: 'needs closed trades', fg: 'var(--ink-3)' }, { k: 'Discipline', v: '—', note: 'scored after ~20 trades', fg: 'var(--ink-3)' }]
    : [
      { k: 'Win rate', v: ov?.winRate != null ? `${Math.round(ov.winRate)}%` : '—', note: `${Math.round(((ov?.winRate ?? 0) / 100) * (ov?.closedTrades ?? 0))} of ${ov?.closedTrades ?? 0} trades, ${Math.min(days, 90)} days`, fg: 'var(--ink)' },
      { k: 'Avg R:R', v: ov?.profitFactor != null ? ov.profitFactor.toFixed(2) : '—', note: 'winners vs losers, size-weighted', fg: 'var(--ink)' },
      { k: 'Avg hold', v: fmtHold(ov?.avgHoldSeconds), note: ov?.closedTrades ? `${(ov.closedTrades / Math.max(1, Math.min(days, 90))).toFixed(1)} trades per day` : '—', fg: 'var(--ink)' },
      { k: 'Discipline', v: score != null ? `${score}/100` : '—', note: score != null ? `from ${tagCount} behaviour ${tagCount === 1 ? 'pattern' : 'patterns'} in ${Math.min(days, 90)} days` : 'scored after ~20 trades', fg: score == null ? 'var(--ink-3)' : score < 70 ? 'var(--amber)' : 'var(--ink)' },
    ];

  // ── coach answers (per account, per day, this browser) ──────────────
  const noteKey = `tgx_coach_${selectedTradingAccountId}_${dayKey(new Date())}`;
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(localStorage.getItem(noteKey) || '["","",""]'); } catch { return ['', '', '']; } });
  useEffect(() => { try { setAnswers(JSON.parse(localStorage.getItem(noteKey) || '["","",""]')); } catch { setAnswers(['', '', '']); } }, [noteKey]);
  const saveNote = () => { try { localStorage.setItem(noteKey, JSON.stringify(answers)); toast.success('Session note saved', 'Kept in this browser for today.'); } catch { toast.error('Could not save', 'Storage is unavailable in this browser.'); } };

  const narrative = blank
    ? 'Nothing to read yet. After roughly ten sessions we can tell you where your money actually goes — and it is almost never where traders expect. Answer the three questions each day and the pattern shows up fast.'
    : (beh?.behaviorTags ?? []).filter((t) => t.severity !== 'POSITIVE').slice(0, 3).map((t) => t.description || t.evidence).filter(Boolean).join(' ') || 'Your recent sessions show no repeating habit yet. Keep answering the three questions — the pattern usually shows inside ten sessions.';

  // ── calendar ────────────────────────────────────────────────────────
  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of closed) {
      const d = new Date(pick(t, 'closedAt'));
      const k = dayKey(d);
      const pnl = Number(pick(t, 'realizedPnl', 'pnl', 'netPnl')) || 0;
      const row = m.get(k) || { n: 0, trades: [] };
      row.n += pnl; row.trades.push(t); m.set(k, row);
    }
    return m;
  }, [closed]);
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
      out.push({ empty: false, key: k, day: d, n: row?.n ?? 0, trades: row?.trades ?? [], pnl: has ? (row.n > 0 ? `+${Math.round(row.n)}` : `−${Math.abs(Math.round(row.n))}`) : '',
        bg: has ? (row.n > 0 ? 'var(--mint-tint)' : 'var(--red-tint)') : 'var(--surface-2)', fg: has ? (row.n > 0 ? 'var(--mint)' : 'var(--red)') : 'var(--ink-faint)', line: has ? (row.n > 0 ? 'var(--mint-line)' : 'var(--red-line)') : 'var(--line)' });
    }
    while (out.length % 7) out.push({ empty: true, key: `t${out.length}` });
    return out;
  }, [month, byDay, weekStartsMon]);
  const monthCells = cells.filter((c) => !c.empty && c.pnl);
  const green = monthCells.filter((c) => c.n > 0).length, red = monthCells.filter((c) => c.n < 0).length;
  const monthTotal = monthCells.reduce((s, c) => s + c.n, 0);
  const best = monthCells.length ? Math.max(...monthCells.map((c) => c.n)) : null, worst = monthCells.length ? Math.min(...monthCells.map((c) => c.n)) : null;
  const calSummary = monthCells.length === 0
    ? [{ k: 'Green days', v: '—', fg: 'var(--ink-3)' }, { k: 'Red days', v: '—', fg: 'var(--ink-3)' }, { k: 'Month', v: '—', fg: 'var(--ink-3)' }, { k: 'Best / worst', v: '—', fg: 'var(--ink-3)' }]
    : [{ k: 'Green days', v: String(green), fg: 'var(--mint)' }, { k: 'Red days', v: String(red), fg: 'var(--red)' }, { k: 'Month', v: fmtMoney(monthTotal, cur, { sign: true }), fg: monthTotal < 0 ? 'var(--red)' : 'var(--mint)' }, { k: 'Best / worst', v: `${fmtMoney(best, cur, { sign: true, decimals: 0 })} / ${fmtMoney(worst, cur, { decimals: 0 })}`, fg: 'var(--ink)' }];
  const dayCell = day ? cells.find((c) => c.key === day) : null;
  const drawerBreaks = dayCell ? dayCell.trades.filter((t) => Number(pick(t, 'aiShortInsight')?.evidence?.eventCounts?.ruleBlocks || 0) > 0).map((t) => ({ text: `Rule fired on ${pick(t, 'symbol')}` })) : [];
  const dayNames = weekStartsMon ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── behaviour ───────────────────────────────────────────────────────
  const habits = (beh?.behaviorTags ?? []).filter((t) => t.severity !== 'POSITIVE').sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0));
  const maxMatch = habits[0]?.matchCount || 1;
  const ring = score == null ? 'conic-gradient(var(--surface-3) 0turn 1turn)' : `conic-gradient(${score < 70 ? 'var(--amber-solid)' : 'var(--mint-solid)'} 0turn ${score / 100}turn, var(--surface-3) ${score / 100}turn 1turn)`;

  return (
    <div>
      <div style={sx('margin-bottom:16px;max-width:80ch')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Journal</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Not a diary. A record of which habits cost you money, with the receipts attached.</p>
      </div>

      <div style={sx('display:inline-flex;gap:3px;margin-bottom:20px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)')} role="tablist">
        {[['coach', 'Coach'], ['calendar', 'P&L calendar'], ['behaviour', 'Behaviour']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={sx(tab === id ? TAB_ON : TAB_OFF)}>{label}</button>
        ))}
      </div>

      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,232px),1fr));gap:14px;margin-bottom:22px')}>
        {jStats.map((c) => (
          <div key={c.k} style={sx('padding:17px 18px;border:1px solid var(--line);border-radius:18px;background:var(--surface);background-image:linear-gradient(180deg,rgba(255,255,255,.028),transparent 46%);box-shadow:var(--shadow-card)')}>
            <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-faint)")}>{c.k}</div>
            <div style={sx("margin-top:13px;font:700 27px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.035em", { color: c.fg })}>{c.v}</div>
            <div style={sx('margin-top:8px;font-size:11.5px;line-height:1.5;color:var(--ink-3);text-wrap:pretty')}>{c.note}</div>
          </div>
        ))}
      </div>

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
              <h3 style={sx(H3)}>What the last 90 days say</h3>
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
              <div style={sx('display:flex;gap:18px')}>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flex: 'none', marginTop: 2, color: 'var(--ink-faint)' }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
              <span>Click any day to see the trades behind the number and which rules were broken that session.</span>
            </div>
          </section>

          {dayCell && (
            <aside style={sx('width:100%;max-width:360px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxDrawer .2s ease-out')}>
              <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:10px')}>
                <div>
                  <div style={sx('font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>{dayCell.day} {monthLabel}</div>
                  <div style={sx("margin-top:7px;font:700 26px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.02em", { color: dayCell.n < 0 ? 'var(--red)' : 'var(--mint)' })}>{fmtMoney(dayCell.n, cur, { sign: true })}</div>
                </div>
                <button type="button" onClick={() => setDay(null)} aria-label="Close" style={sx('width:26px;height:26px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-3);display:grid;place-items:center')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <div style={sx('padding:13px 18px 6px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>Trades</div>
              {dayCell.trades.map((t) => {
                const pnl = Number(pick(t, 'realizedPnl', 'pnl', 'netPnl')) || 0;
                const hold = pick(t, 'openedAt') && pick(t, 'closedAt') ? fmtHold((new Date(pick(t, 'closedAt')) - new Date(pick(t, 'openedAt'))) / 1000) : '';
                return (
                  <div key={pick(t, 'tradeUid', 'trade_uid') || t.id} style={sx('display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--line);font-size:13px')}>
                    <span style={sx('font-weight:600;flex:1')}>{pick(t, 'symbol')}</span>
                    <span style={sx('color:var(--ink-3);font-size:12px')}>{String(pick(t, 'side') || '').toUpperCase() === 'BUY' ? 'Long' : 'Short'}{hold ? ` · ${hold}` : ''}</span>
                    <span style={sx('font-weight:600;font-variant-numeric:tabular-nums', { color: pnl < 0 ? 'var(--red)' : 'var(--mint)' })}>{fmtMoney(pnl, cur, { sign: true })}</span>
                  </div>
                );
              })}
              <div style={sx('padding:13px 18px 6px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>Rules broken</div>
              {drawerBreaks.length === 0 ? (
                <div style={sx('padding:10px 18px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-3)')}>None recorded on this day.</div>
              ) : drawerBreaks.map((b, i) => (
                <div key={i} style={sx('display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--line);font-size:12.5px')}>
                  <span style={sx('width:6px;height:6px;border-radius:50%;background:var(--red-solid);flex:none')} />
                  <span style={sx('flex:1;color:var(--ink-2)')}>{b.text}</span>
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
                <h3 style={sx(H3)}>Habit ledger · 90 days</h3>
                <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>Ranked by how often it happened. Pricing per event is coming.</p>
              </div>
              <span style={sx("font:600 18px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;color:var(--red)")}>{habits.length ? `${habits.reduce((s, t) => s + (t.matchCount ?? 0), 0)} events` : '—'}</span>
            </div>
            {habits.length === 0 && (
              <div style={sx('padding:46px 20px;text-align:center')}>
                <div style={sx('font-size:14px;font-weight:600')}>Nothing priced yet</div>
                <p style={sx('margin:7px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:48ch')}>Once you have traded, every broken rule gets a rupee figure attached and ranks here by what it cost you.</p>
              </div>
            )}
            {habits.map((t) => {
              const ruleName = (TAG_RULE[t.tag] ?? ['daily-loss', 'Daily loss protection'])[1];
              return (
                <div key={t.tag} style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
                  <div style={sx('display:flex;align-items:baseline;gap:12px;flex-wrap:wrap')}>
                    <span style={sx('font-size:13.5px;font-weight:600;flex:1;min-width:180px')}>{tagLabel(t.tag)}</span>
                    <span style={sx('font-size:12px;color:var(--ink-3)')}>{t.matchCount ?? 0} of {t.tradeCount ?? 0} trades</span>
                    <span style={sx("font:600 14px/1 'Space Grotesk',sans-serif;font-variant-numeric:tabular-nums;color:var(--red)")}>{Math.round((t.confidence ?? 0) * 100)}%</span>
                  </div>
                  <div style={sx('margin:10px 0;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden')}><div style={sx('height:100%;border-radius:999px;background:var(--red-solid)', { width: `${Math.round(((t.matchCount ?? 0) / maxMatch) * 100)}%` })} /></div>
                  <p style={sx('margin:0 0 11px;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:84ch')}>{t.description || t.evidence}</p>
                  <button type="button" onClick={() => navigate('/dashboard/rules')} style={sx('padding:7px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>Arm {ruleName}</button>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
