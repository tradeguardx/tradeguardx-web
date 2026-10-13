import { sx } from '../dashboard/shell/sx';
import { CARD, GRADE, GRID, LABEL, istDay, istTime, moneyOf } from './revengeFormat';
import { CheckCard, Chip, ScoreRing, Section, Stat } from './RevengeParts';
import RulePlan from './RevengeRulePlan';

const RANK = { problem: 0, warning: 1, good: 2, na: 3 };

/**
 * The report body: score, profile, streaks, the six checks, the worst day.
 * Shared by the sidebar page and the setup step, so they can never disagree.
 *
 * `reveal`: the moment it unlocks — the score counts up and each section
 * drops in after the one before. Otherwise it simply renders.
 */
export default function RevengeReportView({ report, periodLabel, months = 1, reveal = false, animateScore = reveal, cta }) {
  const money = moneyOf(report?.currency);
  const grade = report?.grade ? GRADE[report.grade] : null;
  const p = report.profile;
  const s = report.streaks;
  let step = 0;
  const enter = () => (reveal ? { className: 'rv-in', style: { animationDelay: `${0.25 + 0.12 * step++}s` } } : {});

  return (
    <div>
      <section className={reveal ? 'rv-pop' : undefined} style={sx(`margin-top:20px;padding:22px 24px;${CARD};display:flex;align-items:center;gap:24px;flex-wrap:wrap`)}>
        <ScoreRing score={report.score} tone={grade?.tone ?? 'neutral'} animate={animateScore} />
        <div style={sx('flex:1;min-width:min(260px,100%)')}>
          <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <span style={sx(LABEL)}>Revenge score{periodLabel ? ` · ${periodLabel}` : ''}</span>
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
        <div {...enter()}>
          <div style={sx('margin-top:12px;display:grid;gap:8px')}>
            {report.insights.map((t, i) => (
              <div key={i} style={sx('padding:11px 14px;border-radius:12px;border:1px solid var(--amber-line);background:var(--amber-tint);font-size:13px;line-height:1.5;color:var(--ink-2)')}>{t}</div>
            ))}
          </div>
        </div>
      )}

      {report.enoughData ? (
        <div {...enter()}>
          <Section title="What makes up your score" note="Each check, what we found, and the rule that fixes it.">
            <div style={sx('display:grid;gap:12px')}>
              {[...report.checks]
                .sort((a, b) => RANK[a.status] - RANK[b.status] || b.weight - a.weight)
                .map((c) => <CheckCard key={c.id} check={c} money={money} />)}
            </div>
          </Section>
        </div>
      ) : (
        <div style={sx(`margin-top:20px;padding:18px 20px;${CARD};font-size:13.5px;line-height:1.55;color:var(--ink-2)`)}>
          We need at least {report.minTrades} closed trades in a period to score it fairly — this one has {report.trades}.
          {months < 3 ? ' Try a longer period.' : ' Trade a little more and refresh.'}
        </div>
      )}

      {report.trades > 0 && p && (
        <div {...enter()}>
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
        </div>
      )}

      {report.trades > 0 && s && (
        <div {...enter()}>
          <Section title="Streaks" note="Trades in the order they closed.">
            <div style={sx(GRID)}>
              <Stat label="Longest winning streak" value={s.longestWin ? `${s.longestWin.length} in a row` : '—'} sub={s.longestWin ? `${money(s.longestWin.pnl, { signed: true })} · ${istDay(s.longestWin.to)}` : null} tone={s.longestWin ? 'mint' : null} />
              <Stat label="Longest losing streak" value={s.longestLoss ? `${s.longestLoss.length} in a row` : '—'} sub={s.longestLoss ? `${money(s.longestLoss.pnl, { signed: true })} · ${istDay(s.longestLoss.to)}` : null} tone={s.longestLoss ? 'red' : null} />
              <Stat label="A winning streak, on average" value={s.avgWinLength == null ? '—' : `${s.avgWinLength} wins`} sub={s.avgWinPnl == null ? null : `${money(s.avgWinPnl, { signed: true })} per streak`} />
              <Stat label="A losing streak, on average" value={s.avgLossLength == null ? '—' : `${s.avgLossLength} losses`} sub={s.avgLossPnl == null ? null : `${money(s.avgLossPnl, { signed: true })} per streak`} />
            </div>
          </Section>
        </div>
      )}

      {report.worstDay && (
        <div {...enter()}>
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
        </div>
      )}

      {/* The end: what to switch on, then the one ask. */}
      {report.enoughData && <RulePlan report={report} cta={cta} enterProps={enter()} />}
    </div>
  );
}
