import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The hero device, animated: a compressed trading day, start to finish.
 *
 * A screenshot can only claim the product works. This shows the whole mechanic
 * in one loop — the trader setting a limit while calm, a trade that goes green,
 * the reversal, the limit crossed, enforcement landing without anyone deciding
 * anything in the moment, and the lock counting down. It mirrors the real
 * /dashboard/live layout, so what a visitor watches here is what they get after
 * signing up.
 *
 * Timings are generous: this plays behind copy people are reading, so every
 * phase has to survive being glanced at rather than watched.
 */

const LOSS_LIMIT = 300;
const MAX_TRADES = 3;
const TARGET = 500;
const LOCK_SECONDS = 8 * 3600 + 12 * 60 + 33;

const PHASES = [
  // Setup — the premise. Rules are chosen before the session, not during it.
  { key: 'setup_loss', screen: 'setup', label: 'Setting your rules', pnl: 0, trades: 0, hold: 2800 },
  { key: 'setup_target', screen: 'setup', label: 'Setting your rules', pnl: 0, trades: 0, hold: 2400 },
  { key: 'saved', screen: 'setup', label: 'Rules saved', pnl: 0, trades: 0, hold: 1800 },
  // The session.
  { key: 'open', screen: 'live', label: 'Trade open', pnl: 145, trades: 1, hold: 2300 },
  { key: 'turn', screen: 'live', label: 'Trade open', pnl: -60, trades: 2, hold: 1900 },
  { key: 'warn', screen: 'live', label: 'Approaching limit', pnl: -228, trades: 2, hold: 2100 },
  { key: 'breach', screen: 'live', label: 'Daily loss limit hit', pnl: -300, trades: 3, hold: 1600 },
  { key: 'enforce', screen: 'live', label: 'Kill switch firing', pnl: -300, trades: 3, hold: 2600 },
  { key: 'locked', screen: 'live', label: 'Locked until tomorrow', pnl: -300, trades: 3, hold: 5000 },
];

const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const MUTED = '#8b98a5';

const money = (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toFixed(0)}`;

function hhmmss(total) {
  const s = Math.max(0, total);
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

/** Digits landing one at a time, so a value reads as being entered. */
function useTypedNumber(target, active, stepMs = 280) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) {
      setText('');
      return undefined;
    }
    const full = String(target);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setText(full.slice(0, n));
      if (n >= full.length) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [target, active, stepMs]);
  return text;
}

export default function HeroLiveDemo() {
  const reduce = useReducedMotion();
  // Reduced motion gets the end state — the outcome is the point, and a still
  // frame tells that story without moving.
  const [i, setI] = useState(reduce ? PHASES.length - 1 : 0);
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS);

  const phase = PHASES[i];
  const isLocked = phase.key === 'locked';

  useEffect(() => {
    if (reduce) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % PHASES.length), phase.hold);
    return () => clearTimeout(t);
  }, [i, reduce, phase.hold]);

  // The countdown runs only while locked, and resets each time the loop reaches
  // it, so the number is always falling rather than frozen.
  useEffect(() => {
    if (!isLocked) {
      setSecondsLeft(LOCK_SECONDS);
      return undefined;
    }
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isLocked]);

  const lossTyped = useTypedNumber(LOSS_LIMIT, phase.key === 'setup_loss');
  const targetTyped = useTypedNumber(TARGET, phase.key === 'setup_target');

  const pnl = phase.pnl;
  const isLoss = pnl < 0;
  const fired = phase.key === 'enforce' || isLocked;
  const accent = fired || isLoss ? RED : GREEN;

  const pct = isLoss
    ? 50 - Math.min(Math.abs(pnl) / LOSS_LIMIT, 1) * 50
    : 50 + Math.min(pnl / TARGET, 1) * 50;
  const usedPct = Math.round(Math.min(Math.abs(Math.min(pnl, 0)) / LOSS_LIMIT, 1) * 100);

  const card = {
    padding: '14px 16px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  };
  const capLabel = { margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED };

  const setupFields = [
    { key: 'setup_loss', label: 'Daily loss limit', typed: lossTyped, value: LOSS_LIMIT, colour: RED },
    { key: 'setup_target', label: 'Daily profit target', typed: targetTyped, value: TARGET, colour: GREEN },
  ];

  return (
    <div
      className="tgx-demo-card"
      style={{
        position: 'relative',
        borderRadius: 22,
        padding: 20,
        background: 'linear-gradient(160deg, rgba(18,24,22,0.96), rgba(8,11,10,0.98))',
        border: `1px solid ${fired ? 'rgba(248,113,113,0.30)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: fired ? '0 0 80px -26px rgba(248,113,113,0.55)' : '0 28px 70px -32px rgba(0,0,0,0.9)',
        transition: 'border-color 400ms ease, box-shadow 400ms ease',
      }}
    >
      {/* Enforcement stamp — lands once, at the moment the switch fires, and
          stays for the lock. Deliberately the same visual language as the
          "REJECTED" card further down the page. */}
      {fired && (
        <motion.div
          key={isLocked ? 'stamp-locked' : 'stamp-fire'}
          initial={reduce ? { opacity: 1, scale: 1, rotate: -11 } : { opacity: 0, scale: 2.6, rotate: -26 }}
          animate={{ opacity: 1, scale: 1, rotate: -11 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 16, mass: 0.7 }}
          style={{
            position: 'absolute', top: '46%', left: '50%',
            translateX: '-50%', translateY: '-50%',
            zIndex: 4, pointerEvents: 'none', textAlign: 'center',
            padding: '10px 20px', borderRadius: 8,
            border: `3px solid ${RED}`,
            background: 'rgba(6,9,10,0.82)',
            backdropFilter: 'blur(3px)',
            boxShadow: `0 0 46px ${RED}55`,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ display: 'block', fontWeight: 900, fontSize: 22, letterSpacing: '0.07em', color: RED }}>
            {isLocked ? 'DAY LOCKED' : 'KILL SWITCH'}
          </span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--mono, monospace)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>
            {isLocked ? 'No new entries till reset' : 'Daily loss limit exceeded'}
          </span>
        </motion.div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <img src="/brokers/delta-exchange.svg" alt="" style={{ height: 16, width: 'auto' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3' }}>
            {phase.screen === 'setup' ? 'Your rules' : 'BTCUSD · Perp'}
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, boxShadow: `0 0 8px ${accent}` }} />
          {phase.screen === 'setup' ? 'Setup' : fired ? 'Enforced' : 'Live'}
        </span>
      </div>

      {phase.screen === 'setup' ? (
        /* ── Setting the rules ─────────────────────────────────────────── */
        <motion.div
          key="setup"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 11 }}
        >
          {setupFields.map((f) => {
            const isActive = phase.key === f.key;
            const isDone =
              phase.key === 'saved' || (f.key === 'setup_loss' && phase.key === 'setup_target');
            return (
              <div
                key={f.key}
                style={{
                  ...card,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  borderColor: isActive ? `${f.colour}66` : 'rgba(255,255,255,0.06)',
                  transition: 'border-color 300ms ease',
                }}
              >
                <span style={{ fontSize: 13.5, color: '#c8d3dc' }}>{f.label}</span>
                <span
                  style={{
                    minWidth: 104, textAlign: 'right', padding: '9px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isActive ? `${f.colour}66` : 'rgba(255,255,255,0.08)'}`,
                    fontFamily: 'var(--mono, monospace)', fontSize: 15, fontWeight: 700,
                    color: isActive || isDone ? f.colour : MUTED,
                  }}
                >
                  ${isDone ? f.value : isActive ? f.typed : '—'}
                  {isActive && <Caret />}
                </span>
              </div>
            );
          })}

          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13.5, color: '#c8d3dc' }}>Max trades per day</span>
            <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>{MAX_TRADES}</span>
          </div>

          <motion.div
            animate={phase.key === 'saved' ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.4 }}
            style={{
              marginTop: 4, padding: '13px 16px', borderRadius: 12, textAlign: 'center',
              fontSize: 13.5, fontWeight: 800,
              background: phase.key === 'saved' ? GREEN : 'rgba(52,211,153,0.16)',
              color: phase.key === 'saved' ? '#05221c' : GREEN,
              transition: 'background 300ms ease, color 300ms ease',
            }}
          >
            {phase.key === 'saved' ? '✓ Rules saved — enforcement is live' : 'Save rules'}
          </motion.div>

          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.55, color: MUTED, textAlign: 'center' }}>
            Set once, while you’re calm. Loosening one later takes a cooling-off period.
          </p>
        </motion.div>
      ) : (
        /* ── The session ───────────────────────────────────────────────── */
        <motion.div key="live" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 16 }}>
            <div style={card}>
              <p style={capLabel}>Today’s P&amp;L</p>
              <motion.p
                key={phase.key}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ margin: '7px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: isLoss ? RED : GREEN }}
              >
                {money(pnl)}
              </motion.p>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: MUTED }}>Cap: ${LOSS_LIMIT}</p>
            </div>
            <div style={card}>
              <p style={capLabel}>Trades</p>
              <p style={{ margin: '7px 0 0', fontSize: 30, fontWeight: 800, color: '#e6edf3' }}>
                {phase.trades}
                <span style={{ fontSize: 17, color: MUTED }}> / {MAX_TRADES}</span>
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: MUTED }}>{MAX_TRADES - phase.trades} remaining</p>
            </div>
          </div>

          {/* Left of centre is loss, right is profit — the dashboard's scale. */}
          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
              <span>Daily loss limit</span>
              <span style={{ color: usedPct >= 100 ? RED : usedPct > 60 ? AMBER : MUTED }}>{usedPct}% used</span>
            </div>
            <div style={{ position: 'relative', height: 7, marginTop: 12, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={false}
                animate={{ left: `${Math.min(pct, 50)}%`, width: `${Math.abs(pct - 50)}%` }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18 }}
                style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 999, background: accent, opacity: 0.9 }}
              />
              <span style={{ position: 'absolute', left: '50%', top: -4, width: 1, height: 15, background: 'rgba(255,255,255,0.25)' }} />
              <motion.div
                initial={false}
                animate={{ left: `${pct}%` }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18 }}
                style={{ position: 'absolute', top: '50%', width: 13, height: 13, marginTop: -6.5, marginLeft: -6.5, borderRadius: 999, background: accent, boxShadow: `0 0 0 4px ${accent}33, 0 0 12px ${accent}` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 11, color: MUTED }}>
              <span style={{ color: RED }}>−${LOSS_LIMIT} · locks</span>
              <span>$0</span>
              <span style={{ color: GREEN }}>+${TARGET} · locks in</span>
            </div>
          </div>

          {/* Status, and the countdown once the lock lands. */}
          <motion.div
            key={`s-${phase.key}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              marginTop: 12, padding: '14px 16px', borderRadius: 14,
              background: fired ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${fired ? 'rgba(248,113,113,0.28)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <p style={{ margin: 0, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: fired ? RED : MUTED }}>
              {phase.label}
            </p>

            {isLocked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 9 }}>
                <div style={{ flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>Unlocks in</p>
                  <p style={{ margin: '4px 0 0', fontFamily: 'var(--mono, monospace)', fontSize: 27, fontWeight: 800, letterSpacing: '-0.01em', color: '#e6edf3' }}>
                    {hhmmss(secondsLeft)}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: MUTED }}>
                  New entries blocked until the daily reset. The account survives to trade again.
                </p>
              </div>
            ) : (
              <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55, color: '#c8d3dc' }}>
                {phase.key === 'open' && 'Long BTCUSD running. Nothing to do while you’re inside your limits.'}
                {phase.key === 'turn' && 'Trade reversed. Still inside the daily loss cap.'}
                {phase.key === 'warn' && '76% of your daily cap is gone. This is where discipline usually fails.'}
                {phase.key === 'breach' && 'You hit −$300. The rule you set this morning takes over now.'}
                {phase.key === 'enforce' && 'Orders cancelled · positions closed · new entries blocked.'}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/** Blinking caret so a value reads as being entered. */
function Caret() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
      style={{ display: 'inline-block', width: 1.5, height: 14, marginLeft: 2, background: 'currentColor', verticalAlign: 'text-bottom' }}
    />
  );
}
