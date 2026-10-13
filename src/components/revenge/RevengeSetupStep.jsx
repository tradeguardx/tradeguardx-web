import { useEffect, useRef, useState } from 'react';
import { sx } from '../dashboard/shell/sx';
import { fetchRevengeReport } from '../../api/tradesApi';
import { useRevengeUnlock } from '../../hooks/useRevengeUnlock';
import { CARD, GRADE, LABEL, monthsForDays, PERIODS } from './revengeFormat';
import { Chip, RevengeStyles, ScoreRing } from './RevengeParts';
import RevengeBuilding from './RevengeBuilding';
import RevengeReportView from './RevengeReportView';
import { RuleChips } from './RevengeRulePlan';
import { DamageStrip, GuardOffLine } from './RevengeHook';

/**
 * Setup, between "Connect key" and billing: the moment their own trading is
 * shown back to them, right before we ask them to protect it.
 *
 * Reads the last 30 days (60, then 90 if that is thin) — from the tax import
 * when it already has them, otherwise straight from the exchange, once — then
 * unlocks with the score counting up and the one finding that matters most.
 * The full report is a tap away; "Fix this" carries on to billing. Skipping
 * is always one click: this step informs, it never blocks.
 *
 * `initial` — the report this step already showed ({ report, months }), when
 * they come back from the free-trial step: shown at once, no second read.
 * `onReport` hands each finished report up, so that step can show the score.
 */
export default function RevengeSetupStep({ accessToken, tradingAccountId, accountName, exchangeName, onContinue, continueLabel, initial, onReport }) {
  const unlock = useRevengeUnlock({ accessToken, tradingAccountId });
  const [report, setReportRaw] = useState(initial?.report ?? null);
  const [months, setMonths] = useState(initial?.months ?? 1);
  const [full, setFull] = useState(false);
  const fullRef = useRef(null);
  const toggleFull = () => {
    const opening = !full;
    setFull(opening);
    if (opening) setTimeout(() => { try { fullRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* jsdom */ } }, 80);
  };
  const started = useRef(Boolean(initial?.report));
  const onReportRef = useRef(onReport);
  useEffect(() => { onReportRef.current = onReport; }, [onReport]);
  const setReport = (r, m) => {
    setReportRaw(r);
    onReportRef.current?.({ report: r, months: m });
  };

  useEffect(() => {
    if (!accessToken || !tradingAccountId || started.current) return undefined;
    /* Marked started INSIDE the timeout, not before it: React's dev double
       mount cancels the first timeout, and a flag set outside it made the
       second mount think the read had begun — an animation that never asked
       the server for anything. */
    const t = setTimeout(async () => {
      if (started.current) return;
      started.current = true;
      const out = await unlock.start('auto');
      if (out !== 'ready') return;
      // The snapshot says how far it read; the tax import has it all, so walk
      // 1 → 3 months until there is enough to score.
      const st = unlock.statusRef.current;
      const first = st?.source === 'snapshot' && st?.windowDays ? monthsForDays(st.windowDays) : 1;
      for (let m = first; m <= 3; m++) {
        const r = await fetchRevengeReport({ accessToken, tradingAccountId, months: m }).catch(() => null);
        if (r && !r.locked && !r.building && !r.needsUnlock && (r.enoughData || m === 3)) {
          setMonths(m);
          setReport(r, m);
          return;
        }
      }
      setReport({ trades: 0, enoughData: false }, 3);
    }, 0);
    return () => clearTimeout(t);
  }, [accessToken, tradingAccountId, unlock]);

  const ready = Boolean(report) && (unlock.phase === 'ready' || Boolean(initial?.report));
  const grade = report?.grade ? GRADE[report.grade] : null;
    const skip = (
    <button type="button" onClick={onContinue} style={sx('padding:6px 2px;border:0;background:none;color:var(--ink-3);font-size:12.5px;font-weight:600;text-decoration:underline;cursor:pointer')}>
      Skip to {continueLabel ? continueLabel.toLowerCase() : 'your free trial'}
    </button>
  );

  return (
    <div>
      <RevengeStyles />
      {!ready ? (
        unlock.phase === 'error' ? (
          <div style={sx(`padding:24px;${CARD};text-align:center`)}>
            <div style={sx("font:600 18px/1.3 'Space Grotesk',sans-serif")}>We couldn’t read your trades just now</div>
            <p style={sx('margin:8px auto 0;max-width:48ch;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>{unlock.error} Your report will be waiting under Review → Revenge report.</p>
            <button type="button" onClick={onContinue} style={sx('margin-top:16px;padding:11px 18px;border:0;border-radius:11px;background:var(--mint-solid);color:var(--on-mint);font-size:13.5px;font-weight:800;cursor:pointer')}>{continueLabel || 'Continue'}</button>
          </div>
        ) : (
          <>
            <RevengeBuilding status={unlock.status ?? { status: 'queued' }} accountName={accountName} exchangeName={exchangeName} />
            <div style={sx('margin-top:10px;text-align:center')}>{skip}</div>
          </>
        )
      ) : !report.enoughData ? (
        <div className="rv-in" style={sx(`padding:28px 24px;${CARD};text-align:center`)}>
          <div style={sx("font:600 20px/1.3 'Space Grotesk',sans-serif;letter-spacing:-.015em")}>Not enough trades to read yet</div>
          <p style={sx('margin:8px auto 0;max-width:50ch;font-size:13.5px;line-height:1.6;color:var(--ink-3)')}>
            We found {report.trades || 'no'} closed trade{report.trades === 1 ? '' : 's'} in the last few months — too few to call it a pattern. Your revenge report builds itself as you trade; it lives under Review → Revenge report.
          </p>
          <button type="button" onClick={onContinue} style={sx('margin-top:18px;padding:12px 20px;border:0;border-radius:12px;background:var(--mint-solid);color:var(--on-mint);font-size:14px;font-weight:800;cursor:pointer')}>{continueLabel || 'Continue'}</button>
        </div>
      ) : (
        <>
          <section className="rv-pop" style={sx(`padding:26px 24px;${CARD};text-align:center;position:relative;overflow:hidden`)}>
            <div style={sx('position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 55% at 50% 0%,var(--mint-tint),transparent 70%)')} />
            <div style={sx('position:relative;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--mint-tint);border:1px solid var(--mint-line);color:var(--mint);font-size:12px;font-weight:800;letter-spacing:.02em')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 019.6-2" /><path d="M5 11h14v9H5z" /></svg>
              Your revenge report is unlocked
            </div>
            <div style={sx('position:relative;margin-top:18px;display:grid;place-items:center')}>
              {/* A slow glow in the grade's colour behind the number: alive, not alarming. */}
              <span aria-hidden className="rv-motion" style={sx('position:absolute;width:150px;height:150px;border-radius:50%;filter:blur(34px);animation:rvPulse 2.8s ease-in-out infinite', { background: grade?.tone && grade.tone !== 'mint' ? `var(--${grade.tone}-tint)` : 'var(--mint-tint)' })} />
              <ScoreRing score={report.score} tone={grade?.tone ?? 'neutral'} animate size={124} />
            </div>
            <div style={sx('position:relative;margin-top:10px;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap')}>
              <span style={sx(LABEL)}>Revenge score · {PERIODS.find((p) => p.months === months)?.label}</span>
              {grade && <Chip tone={grade.tone}>{grade.label}</Chip>}
            </div>
            <div className="rv-in" style={sx("position:relative;margin-top:10px;font:600 21px/1.3 'Space Grotesk',sans-serif;letter-spacing:-.02em", { animationDelay: '1s' })}>{report.verdict}</div>
            <DamageStrip report={report} periodLabel={PERIODS.find((p) => p.months === months)?.label} delay={1.2} />
            <div className="rv-in" style={sx('position:relative;margin-top:16px', { animationDelay: '1.5s' })}>
              <RuleChips report={report} />
            </div>
            <div className="rv-in" style={sx('position:relative;margin-top:18px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap', { animationDelay: '1.7s' })}>
              <button type="button" onClick={onContinue} className="rv-motion" style={sx('padding:13px 22px;border:0;border-radius:12px;color:var(--on-mint);font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:var(--glow-mint);background-size:200% 100%;animation:rvShine 2.8s linear infinite', { backgroundImage: 'linear-gradient(110deg,var(--mint-solid) 40%,#fff6 50%,var(--mint-solid) 60%)', backgroundColor: 'var(--mint-solid)' })}>
                Fix this — {continueLabel ? continueLabel.toLowerCase() : 'start your 3-day free trial'} →
              </button>
              <button type="button" onClick={toggleFull} aria-expanded={full} style={sx('padding:12px 18px;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);color:var(--ink);font-size:14px;font-weight:700;cursor:pointer')}>
                {full ? 'Hide the full report' : 'See my full report'}
              </button>
            </div>
            {!continueLabel && <GuardOffLine delay={1.9} />}
          </section>

          {full && (
            <div ref={fullRef} className="rv-unblur" style={sx('scroll-margin-top:90px')}>
              <RevengeReportView
                report={report}
                periodLabel={PERIODS.find((p) => p.months === months)?.label}
                months={months}
                cta={{
                  label: continueLabel || 'Start my 3-day free trial →',
                  onClick: onContinue,
                  note: continueLabel ? null : '₹0 today · you set each limit on the Rules page',
                  trial: !continueLabel,
                }}
              />
            </div>
          )}
          <div style={sx('margin-top:12px;text-align:center')}>{skip}</div>
        </>
      )}
    </div>
  );
}
