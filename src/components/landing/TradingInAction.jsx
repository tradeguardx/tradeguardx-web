import { useState } from 'react';
import { trackCtaClick } from '../../lib/analytics';
import { DAYS } from '../../content/thirtyDays';

/**
 * "Trading in Action" — a horizontally-scrollable shelf of the same YouTube
 * Shorts already wired for /30-days (single source of truth: src/content/
 * thirtyDays.js, so a new day added there shows up here automatically). The
 * point of the section is proof, not a demo reel — these are real sessions on
 * the founder's own Delta Exchange account.
 *
 * Deliberately a native horizontal scroll-snap row (touch/trackpad/arrow-key
 * scrollable) rather than a JS-driven carousel or scroll-jacked pinned
 * section — it's simpler, works everywhere, and doesn't fight the page's own
 * vertical scroll the way a hijacked scroll section can.
 */

// All days with a video, oldest first — not a fixed count. Add a day to
// thirtyDays.js and it shows up here automatically, no second place to update.
const CLIPS = DAYS.filter((d) => d.video).sort((a, b) => a.n - b.n);

function ShieldGlyph({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function money(v) {
  const s = v < 0 ? '−' : '+';
  return `${s}$${Math.abs(v).toFixed(2)}`;
}

/** The outcome chip — real P&L, colored by sign, "Locked" appended on a day the
 * account was actually locked. This is what makes the arc readable without
 * clicking play: scroll and the colors alone tell the story. */
function OutcomeChip({ day }) {
  if (day.pnl == null) return null;
  const win = day.pnl >= 0;
  const color = win ? '#22c55e' : '#ef4444';
  const bg = win ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)';
  return (
    <span
      className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 font-display text-[12px] font-bold"
      style={{ backgroundColor: bg, color }}
    >
      {money(day.pnl)}
      {day.status === 'locked' && <span className="opacity-80">· Locked</span>}
    </span>
  );
}

/** One card in the shelf — a branded poster that swaps for an inline player on click. */
function ClipCard({ day, index }) {
  const [live, setLive] = useState(false);

  const play = () => {
    try {
      trackCtaClick(`landing_trading_in_action_day${day.n}`);
    } catch {
      /* analytics is best-effort */
    }
    setLive(true);
  };

  return (
    <div
      className="relative aspect-[9/16] w-[230px] shrink-0 snap-center overflow-hidden rounded-2xl border sm:w-[260px]"
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#05070c' }}
    >
      {live ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${day.video}?autoplay=1&rel=0&playsinline=1`}
          title={`Day ${day.n} — TradeGuardX enforcing on Delta Exchange`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={`Play Day ${day.n} — TradeGuardX enforcing on Delta Exchange`}
          className="group absolute inset-0 block h-full w-full text-left"
        >
          <img
            src={`https://i.ytimg.com/vi/${day.video}/hqdefault.jpg`}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-[1.5px] transition-opacity duration-300 group-hover:opacity-50"
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 70% at 50% 0%, rgba(0,212,170,0.16), transparent 55%), linear-gradient(180deg, rgba(5,7,12,0.3) 0%, rgba(5,7,12,0.15) 40%, rgba(5,7,12,0.92) 100%)',
            }}
          />
          <span className="relative flex h-full flex-col justify-between p-3.5">
            <span className="flex flex-col items-start gap-2">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(0,212,170,0.18)' }}>
                  <ShieldGlyph className="h-3 w-3" style={{ color: 'var(--accent, #00d4aa)' }} />
                </span>
                <span className="font-display text-[11px] font-bold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                  TradeGuardX
                </span>
              </span>
              <OutcomeChip day={day} />
            </span>
            <span className="flex flex-1 items-center justify-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: '#00d4aa', color: '#04120e', boxShadow: '0 8px 26px -6px rgba(0,212,170,0.6)' }}
              >
                <svg width="16" height="18" viewBox="0 0 20 22" fill="currentColor" aria-hidden>
                  <path d="M19 9.27a2 2 0 0 1 0 3.46L3 21.66a2 2 0 0 1-3-1.73V2.07A2 2 0 0 1 3 .34Z" />
                </svg>
              </span>
            </span>
            <span
              className="font-display text-[13px] font-bold text-white"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
            >
              Day {String(day.n).padStart(2, '0')}
            </span>
          </span>
        </button>
      )}
      {/* card order, decorative — helps the shelf read as a sequence while scrolling */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ backgroundColor: 'rgba(5,7,12,0.6)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}
      >
        {index + 1}
      </span>
    </div>
  );
}

export default function TradingInAction() {
  if (CLIPS.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1240px] py-8">
      <div className="px-[18px] sm:px-7">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: 'rgba(0,212,170,0.32)', color: 'var(--accent, #00d4aa)' }}
        >
          Trading in action
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
          Watch it <span style={{ color: 'var(--accent, #00d4aa)' }}>enforce</span>, live.
        </h2>
        <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-slate-400">
          Real sessions on a live Delta Exchange account, green days and red ones — including the days the account got locked. Scroll to watch a few.
        </p>
      </div>

      <div
        className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pl-[18px] pr-[18px] sm:pl-7 sm:pr-7"
        style={{ scrollbarWidth: 'none' }}
      >
        {CLIPS.map((day, i) => (
          <ClipCard key={day.n} day={day} index={i} />
        ))}
        {/* trailing spacer so the last card can snap fully into view, not flush to the edge */}
        <span aria-hidden className="shrink-0" style={{ width: '1px' }} />
      </div>
    </section>
  );
}
