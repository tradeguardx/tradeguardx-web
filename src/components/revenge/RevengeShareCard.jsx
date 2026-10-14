import { forwardRef } from 'react';
import { C, CHARACTER, GRADE, HEADLINE, MASKED, checkOf, moneyShort, oneIn } from './revengeShare';

/**
 * The revenge score as a post: 432 × 540, exported at 2.5× to 1080 × 1350
 * (4:5, the shape every feed shows uncropped). Two designs:
 *
 *   'chaser' — a character name, a gauge, the worst chain (loss → back in →
 *              loss) and three of their numbers.
 *   'meter'  — the score big, where it sits from "on tilt" to "calm", and how
 *              fast they trade again after a loss.
 *
 * Share art, so FIXED brand colours, not theme tokens: it is seen on someone
 * else's phone and has to look the same everywhere. Every figure is the
 * server's. Money and the name appear only when switched on.
 */
const BAR = ['#ef5a5a', '#f2a615', '#5b76f7', '#1fc99a']; // on tilt → revenge-prone → steady → calm
const FONT = { head: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace" };

const RevengeShareCard = forwardRef(function RevengeShareCard({ variant = 'chaser', report, monthLabel, amounts = false, handle = null }, ref) {
  const grade = GRADE[report.grade];
  const tone = C.tone[grade?.tone ?? 'mint'];
  return (
    <div ref={ref} style={{ width: 432, height: 540, boxSizing: 'border-box', position: 'relative', overflow: 'hidden', padding: '24px 24px 20px', background: `radial-gradient(ellipse 70% 45% at 20% 0%, ${tone}26, transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, ${C.brand}14, transparent 70%), ${C.bg}`, color: C.ink, fontFamily: 'Manrope, system-ui, sans-serif', display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: C.brand, display: 'grid', placeItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#02241d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
        </span>
        <span style={{ font: `700 15px/1 ${FONT.head}`, letterSpacing: '-.01em' }}>TradeGuardX</span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `600 9.5px/1 ${FONT.mono}`, letterSpacing: '.14em', color: C.ink3, textTransform: 'uppercase' }}>
          {variant === 'meter' ? `Revenge score${monthLabel ? ` · ${monthLabel}` : ''}` : monthLabel}
        </span>
      </div>

      {variant === 'meter' ? <Meter report={report} amounts={amounts} /> : <Chaser report={report} amounts={amounts} />}

      <span style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `600 15px/1.25 ${FONT.head}` }}>What’s your revenge score?</div>
          <div style={{ marginTop: 3, fontSize: 11, color: C.ink3 }}>Free from your own trades · <span style={{ color: C.brand, fontWeight: 700 }}>tradeguardx.com</span></div>
        </div>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {variant === 'chaser' && <span style={{ padding: '6px 11px', borderRadius: 999, background: C.brand, color: '#02241d', fontSize: 11, fontWeight: 800 }}>Check yours →</span>}
          {handle && <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{handle}</span>}
        </div>
      </div>
    </div>
  );
});

export default RevengeShareCard;

/* ── The Chaser: gauge, character, the worst chain, three numbers ─────── */
function Chaser({ report, amounts }) {
  const ch = CHARACTER[report.grade] ?? CHARACTER.someTilt;
  const chTone = C.tone[ch.tone];
  const reentry = checkOf(report, 'reentry');
  const size = checkOf(report, 'sizeUp');
  const tilt = checkOf(report, 'tiltDays');
  const chain = report.worstChain;
  const money = (n) => (amounts ? moneyShort(n, report.currency) : MASKED);
  const filled = reentry ? Math.max(1, Math.round((reentry.value / 100) * 12)) : 0;

  return (
    <>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Gauge score={report.score} />
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `600 9.5px/1 ${FONT.mono}`, letterSpacing: '.14em', color: C.ink3, textTransform: 'uppercase' }}>My revenge score</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ font: `700 54px/1 ${FONT.head}`, letterSpacing: '-.04em' }}>{report.score}</span>
            <span style={{ fontSize: 14, color: C.ink3 }}>/ 100</span>
          </div>
          <span style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px 5px 6px', borderRadius: 999, border: `1px solid ${chTone}66`, background: `${chTone}1f`, color: chTone, fontSize: 12.5, fontWeight: 800 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: chTone, display: 'grid', placeItems: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#1a1205"><path d="M13 2s1 4-2 7-4 5-2 9c-3-1-5-4-4-8 1 2 3 2 3 2s-1-5 5-10zm1 8s5 3 4 8a6 6 0 01-6 4c3-2 3-5 2-8 2 1 2 3 2 3s1-3-2-7z" /></svg>
            </span>
            {ch.name}
          </span>
        </div>
      </div>

      {chain && (
        <div style={{ marginTop: 20, padding: '12px 11px', borderRadius: 13, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ flex: 1, font: `600 9px/1 ${FONT.mono}`, letterSpacing: '.14em', color: C.tone.red, textTransform: 'uppercase' }}>My worst chain</span>
            <span style={{ font: `500 9px/1 ${FONT.mono}`, letterSpacing: '.1em', color: C.ink3, textTransform: 'uppercase' }}>{day(chain.loss.at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Link3 label={`${time(chain.loss.at)} · Loss`} value={money(chain.loss.pnl)} color={C.tone.red} />
            <Arrow text={`${chain.back.gapMin}m`} />
            <Link3 label={`${time(chain.back.at)} · Back in`} value={chain.back.size ? `${chain.back.size}× size` : chain.back.symbol} color={C.tone.amber} />
            <Arrow />
            <Link3 label="Then" value={money(chain.next.pnl)} color={C.tone.red} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {reentry && (
          <Tile big={oneIn(reentry.value)} small="losses, I was back in within 15 min" color={C.tone.red}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: 50 }}>
              {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < filled ? C.tone.red : 'rgba(255,255,255,.14)' }} />)}
            </div>
          </Tile>
        )}
        {size && (
          <Tile big={`${size.value}×`} small="my usual size, right after a loss" color={C.tone.amber}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 18 }}>
              <span style={{ width: 8, height: Math.max(4, 18 / Math.max(1, size.value)), borderRadius: 2, background: 'rgba(255,255,255,.25)' }} />
              <span style={{ width: 8, height: 18, borderRadius: 2, background: C.tone.amber }} />
            </div>
          </Tile>
        )}
        {amounts && report.worstDay?.pnl < 0 ? (
          <Tile big={moneyShort(report.worstDay.pnl, report.currency)} small="my worst day this month" color={C.tone.red}>
            <svg width="54" height="18" viewBox="0 0 54 18"><path d="M1 3l9 2 8-1 8 6 9-2 9 8 9 1" fill="none" stroke={C.tone.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Tile>
        ) : tilt ? (
          <Tile big={String(tilt.value)} small={tilt.value === 1 ? 'day trading after a loss made it worse' : 'days trading after a loss made them worse'} color={C.tone.red}>
            <svg width="54" height="18" viewBox="0 0 54 18"><path d="M1 3l9 2 8-1 8 6 9-2 9 8 9 1" fill="none" stroke={C.tone.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Tile>
        ) : null}
      </div>
    </>
  );
}

function Gauge({ score }) {
  // 180° arc, four bands, needle at the score (0 = on tilt, left; 100 = calm, right).
  const cx = 70; const cy = 70; const r = 54;
  const pt = (deg, rad = r) => [cx + rad * Math.cos((Math.PI * deg) / 180), cy - rad * Math.sin((Math.PI * deg) / 180)];
  const arc = (a0, a1) => { const [x0, y0] = pt(a0); const [x1, y1] = pt(a1); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
  const deg = 180 - (Math.max(0, Math.min(100, score ?? 0)) / 100) * 180;
  const [nx, ny] = pt(deg, r - 12);
  return (
    <svg width="140" height="88" viewBox="0 0 140 88" style={{ flex: 'none' }}>
      {[[180, 137], [133, 92], [88, 47], [43, 0]].map(([a0, a1], i) => <path key={i} d={arc(a0, a1)} fill="none" stroke={BAR[i]} strokeWidth="11" strokeLinecap="round" />)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#eef3fa" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6.5" fill="#eef3fa" />
      <circle cx={cx} cy={cy} r="3" fill={C.bg} />
      <text x="8" y="86" style={{ font: `600 7.5px ${FONT.mono}`, fill: C.ink3, letterSpacing: '.1em' }}>ON TILT</text>
      <text x="132" y="86" textAnchor="end" style={{ font: `600 7.5px ${FONT.mono}`, fill: C.ink3, letterSpacing: '.1em' }}>CALM</text>
    </svg>
  );
}

function Link3({ label, value, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '7px 8px', borderRadius: 9, border: `1px solid ${color}55`, background: `${color}14` }}>
      <div style={{ font: `600 7.5px/1 ${FONT.mono}`, letterSpacing: '.08em', color: C.ink3, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ marginTop: 5, font: `700 14px/1 ${FONT.head}`, color, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function Arrow({ text }) {
  return (
    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {text && <span style={{ font: `600 8px/1 ${FONT.mono}`, color: C.tone.amber }}>{text}</span>}
      <svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 4h11M9 1l3 3-3 3" fill="none" stroke={C.ink3} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function Tile({ big, small, color, children }) {
  return (
    <div style={{ minWidth: 0, padding: '13px 11px 12px', borderRadius: 12, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,.035)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {children}
      <div style={{ font: `700 21px/1 ${FONT.head}`, color, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>{big}</div>
      <div style={{ fontSize: 9.5, lineHeight: 1.35, color: C.ink2 }}>{small}</div>
    </div>
  );
}

/* ── Tilt meter: the score, where it sits, how fast they jump back in ─── */
function Meter({ report, amounts }) {
  const pos = Math.max(0, Math.min(100, report.score ?? 0));
  const gaps = report.reentryGaps;
  const max = Math.max(1, ...(gaps?.buckets ?? []).map((b) => b.count));
  const reentry = checkOf(report, 'reentry');
  const size = checkOf(report, 'sizeUp');
  const line = reentry ? `${oneIn(reentry.value)} losses, I was back in within 15 minutes${size && size.value > 1.1 ? `, at ${size.value}× my usual size` : ''}.` : null;
  const zone = pos < 25 ? 0 : pos < 50 ? 1 : pos < 75 ? 2 : 3;
  return (
    <>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <svg width="200" height="86" viewBox="0 0 200 86" style={{ display: 'block', margin: '0 auto' }}>
          <defs><linearGradient id="rvMeterNum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ff9f8f" /></linearGradient></defs>
          <text x="100" y="78" textAnchor="middle" style={{ font: `700 92px ${FONT.head}`, letterSpacing: '-.05em' }} fill="url(#rvMeterNum)">{report.score}</text>
        </svg>
        <div style={{ marginTop: 4, font: `600 19px/1.2 ${FONT.head}`, letterSpacing: '-.02em' }}>{HEADLINE[report.grade] ?? report.verdict}</div>
      </div>

      <div style={{ marginTop: 14, position: 'relative' }}>
        <div style={{ height: 9, borderRadius: 999, background: `linear-gradient(90deg, ${BAR[0]}, ${BAR[1]} 38%, ${BAR[2]} 66%, ${BAR[3]})` }} />
        <span style={{ position: 'absolute', top: -5, left: `calc(${pos}% - 9px)`, width: 18, height: 18, borderRadius: '50%', background: '#eef3fa', border: `3px solid ${C.bg}`, boxSizing: 'border-box' }} />
        <div style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between', font: `600 7.5px/1 ${FONT.mono}`, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {['On tilt', 'Revenge-prone', 'Steady', 'Calm'].map((l, i) => <span key={l} style={{ color: i === zone ? '#eef3fa' : C.ink3 }}>{l}</span>)}
        </div>
      </div>

      {gaps?.losses > 0 && (
        <div style={{ marginTop: 14, padding: '11px 12px', borderRadius: 13, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1, font: `600 8.5px/1 ${FONT.mono}`, letterSpacing: '.12em', color: C.ink3, textTransform: 'uppercase' }}>After a loss, I trade again in…</span>
            <span style={{ font: `500 8.5px/1 ${FONT.mono}`, color: C.ink3 }}>{gaps.losses} losses</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', gap: 7, height: 104 }}>
            {gaps.buckets.map((b, i) => {
              const c = i < 2 ? C.tone.red : i === gaps.buckets.length - 1 ? C.tone.mint : 'rgba(255,255,255,.22)';
              return (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
                  <span style={{ font: `700 11px/1 ${FONT.head}`, color: i < 2 || i === gaps.buckets.length - 1 ? c : C.ink2 }}>{b.count}</span>
                  <span style={{ width: '100%', height: Math.max(3, (b.count / max) * 80), borderRadius: 4, background: c }} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 5, display: 'flex', gap: 7 }}>
            {gaps.buckets.map((b) => <span key={b.label} style={{ flex: 1, textAlign: 'center', font: `500 8px/1 ${FONT.mono}`, color: C.ink3 }}>{b.label}</span>)}
          </div>
          {line && <div style={{ marginTop: 9, fontSize: 10.5, lineHeight: 1.4, color: C.ink2 }}>{line}</div>}
        </div>
      )}

      {amounts && report.worstDay?.pnl < 0 && (
        <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', padding: '9px 12px', borderRadius: 11, border: `1px solid ${C.tone.red}55`, background: `${C.tone.red}12` }}>
          <span style={{ flex: 1, font: `600 8.5px/1 ${FONT.mono}`, letterSpacing: '.12em', color: C.tone.red, textTransform: 'uppercase' }}>Worst day</span>
          <span style={{ font: `700 17px/1 ${FONT.head}`, color: C.tone.red }}>{moneyShort(report.worstDay.pnl, report.currency)}</span>
        </div>
      )}
    </>
  );
}

const IST = { timeZone: 'Asia/Kolkata' };
const time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', hour12: false });
const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' });
