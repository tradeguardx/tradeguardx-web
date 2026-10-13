import { useEffect, useState } from 'react';
import { sx } from '../dashboard/shell/sx';
import { CARD } from './revengeFormat';

/**
 * "Building your revenge report" — what the trader watches while we read
 * their trades.
 *
 * Driven by the server's real progress (queued → fetching → analysing →
 * ready). The steps never jump: each one ticks at least STEP_MS after the one
 * before, so an instant answer from the tax import still reads as four
 * deliberate steps rather than a flash.
 */
const STEP_MS = 650;
const TARGET = { queued: 0, fetching: 1, analysing: 2, ready: 4, error: 0 };

export default function RevengeBuilding({ status, accountName, exchangeName, compact = false }) {
  const target = TARGET[status?.status] ?? 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= target) return undefined;
    const t = setTimeout(() => setShown((n) => Math.min(target, n + 1)), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, target]);

  const days = status?.windowDays ?? 30;
  const read = status?.fillsRead ?? 0;
  const steps = [
    { label: `Connecting to ${exchangeName || 'your exchange'}` },
    { label: `Reading your last ${days} days`, detail: read ? `${read.toLocaleString('en-IN')} trades read` : null },
    { label: 'Finding what you did after each loss' },
    { label: 'Scoring your discipline' },
  ];

  return (
    <section aria-live="polite" aria-busy="true" style={sx(`padding:${compact ? '26px 20px' : '38px 24px'};${CARD};text-align:center;overflow:hidden;position:relative`)}>
      <div style={sx('position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 50% at 50% 0%,var(--mint-tint),transparent 70%)')} />

      {/* The scanner: a sweep turning over a row of breathing candles. */}
      <div aria-hidden="true" style={sx('position:relative;margin:0 auto;width:132px;height:132px;border-radius:50%;border:1px solid var(--line-strong);background:var(--surface-2);overflow:hidden')}>
        <div className="rv-motion" style={sx('position:absolute;inset:-30%;background:conic-gradient(from 0deg,transparent 0 70%,var(--mint-tint) 85%,var(--mint) 100%);animation:rvSweep 2.2s linear infinite;opacity:.8')} />
        <div style={sx('position:absolute;inset:14px;border-radius:50%;background:var(--surface);display:flex;align-items:flex-end;justify-content:center;gap:6px;padding-bottom:34px')}>
          {[0.5, 0.9, 0.4, 1, 0.65, 0.8].map((h, i) => (
            <span key={i} className="rv-motion" style={sx('display:block;width:7px;border-radius:2px;transform-origin:bottom', { height: `${18 + h * 26}px`, background: i % 3 === 2 ? 'var(--red)' : 'var(--mint)', animation: `rvBar 1.4s ease-in-out ${i * 0.13}s infinite` })} />
          ))}
        </div>
      </div>

      <h2 style={sx("position:relative;margin:22px 0 0;font:600 22px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Building your revenge report</h2>
      <p style={sx('position:relative;margin:7px auto 0;max-width:46ch;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>
        Reading {accountName ? <b style={sx('color:var(--ink-2)')}>{accountName}</b> : 'your account'} straight from {exchangeName || 'your exchange'} — read-only, nothing is changed.
      </p>

      <ol style={sx('position:relative;margin:22px auto 0;padding:0;list-style:none;max-width:360px;text-align:left;display:grid;gap:10px')}>
        {steps.map((st, i) => {
          const done = shown > i;
          const active = shown === i;
          return (
            <li key={st.label} style={sx('display:flex;align-items:center;gap:11px;font-size:13.5px', { color: done ? 'var(--ink)' : active ? 'var(--ink-2)' : 'var(--ink-faint)' })}>
              <span style={sx('flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%', done ? { background: 'var(--mint-solid)', color: 'var(--on-mint)' } : { border: '1.5px solid var(--line-strong)' })}>
                {done ? (
                  <svg className="rv-pop" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
                ) : active ? (
                  <span className="rv-motion" style={sx('width:8px;height:8px;border-radius:50%;background:var(--mint);animation:rvPulse 1s ease-in-out infinite')} />
                ) : null}
              </span>
              <span style={{ flex: 1 }}>{st.label}</span>
              {st.detail && (done || active) && <span style={sx("flex:none;font:500 11.5px/1 'JetBrains Mono',monospace;color:var(--ink-3);font-variant-numeric:tabular-nums")}>{st.detail}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
