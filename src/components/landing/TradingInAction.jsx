import { forwardRef, useEffect, useRef, useState } from 'react';
import { trackCtaClick } from '../../lib/analytics';
import { DAYS } from '../../content/thirtyDays';

/**
 * "Trading in Action" — a horizontally-scrollable shelf of the same YouTube
 * Shorts already wired for /30-days (single source of truth: src/content/
 * thirtyDays.js, so a new day added there shows up here automatically). The
 * point of the section is proof, not a demo reel — these are real sessions on
 * the founder's own Delta account.
 *
 * Deliberately a native horizontal scroll-snap row (touch/trackpad/arrow-key
 * scrollable) rather than a JS-driven carousel or scroll-jacked pinned
 * section — it's simpler, works everywhere, and doesn't fight the page's own
 * vertical scroll the way a hijacked scroll section can.
 */

// All days with a video, oldest first — not a fixed count. Add a day to
// thirtyDays.js and it shows up here automatically, no second place to update.
const CLIPS = DAYS.filter((d) => d.video).sort((a, b) => a.n - b.n);

const CHANNEL_URL = 'https://www.youtube.com/@TradeGuardX';

/** YouTube's play mark (red rounded rectangle, white triangle). */
function YouTubeMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 20" aria-hidden>
      <path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
      <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" />
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
  // A titled clip (a walkthrough or proof video) is not a trading day: no P&L.
  if (day.title || day.pnl == null) return null;
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

/** How long each card previews before the next one takes over. */
const PREVIEW_MS = 8000;

/** No silent autoplay for anyone who asked for less motion or less data. */
function previewsAllowed() {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (navigator.connection?.saveData) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * A silent, looping, control-less embed under the card's overlay. It stays
 * invisible until YouTube has had a moment to get past its own title flash
 * and spinner, then fades in over the cover. Clicks go to the card.
 */
function MutedPreview({ id }) {
  const [ready, setReady] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <iframe
      aria-hidden
      tabIndex={-1}
      title="preview"
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.02] transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
      onLoad={() => { timer.current = setTimeout(() => setReady(true), 1200); }}
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0`}
      allow="autoplay; encrypted-media"
      frameBorder="0"
    />
  );
}

/** One card in the shelf — a branded poster that swaps for an inline player on click. */
const ClipCard = forwardRef(function ClipCard({ day, index, preview, onPlay }, ref) {
  const [live, setLive] = useState(false);

  const play = () => {
    try {
      trackCtaClick(`landing_trading_in_action_day${day.n}`);
    } catch {
      /* analytics is best-effort */
    }
    onPlay?.();
    setLive(true);
  };

  return (
    <div
      ref={ref}
      data-index={index}
      className="relative aspect-[9/16] w-[170px] shrink-0 snap-center overflow-hidden rounded-2xl border sm:w-[184px]"
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#05070c' }}
    >
      {live ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${day.video}?autoplay=1&rel=0&playsinline=1`}
          title={day.title || `Day ${day.n} — TradeGuardX enforcing on Delta`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${day.title || `Day ${day.n} — TradeGuardX enforcing on Delta`}`}
          className="group absolute inset-0 block h-full w-full text-left"
        >
          <img
            // maxresdefault (1280x720) is the video's own cover; for a Short the
            // 9:16 cover sits in its middle at full height, so object-cover
            // crops the card straight to it, sharp. hqdefault (480x360) is the
            // fallback if a video has no HD thumbnail.
            src={`https://i.ytimg.com/vi/${day.video}/maxresdefault.jpg`}
            onError={(e) => {
              const fb = `https://i.ytimg.com/vi/${day.video}/hqdefault.jpg`;
              if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
            }}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {preview && <MutedPreview id={day.video} />}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,7,12,0.55) 0%, rgba(5,7,12,0) 22%, rgba(5,7,12,0) 70%, rgba(5,7,12,0.85) 100%)',
            }}
          />
          <span className="relative flex h-full flex-col justify-between p-3">
            <span className="flex flex-col items-start gap-2">
              <span className="flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2" style={{ backgroundColor: 'rgba(5,7,12,0.72)', backdropFilter: 'blur(4px)' }}>
                <YouTubeMark className="h-3 w-[17px]" />
                <span className="font-display text-[10.5px] font-bold text-white">Shorts</span>
              </span>
              <OutcomeChip day={day} />
            </span>
            <span className="flex flex-1 items-center justify-center">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform duration-200 group-hover:scale-110"
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
              {day.title || `Day ${String(day.n).padStart(2, '0')}`}
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
});

/** Last card in the row, same size as a clip: the channel itself. */
function ChannelCard() {
  return (
    <a
      href={CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => { try { trackCtaClick('landing_trading_in_action_channel_card'); } catch { /* best-effort */ } }}
      className="group relative flex aspect-[9/16] w-[170px] shrink-0 snap-center flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border p-4 text-center sm:w-[184px]"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'radial-gradient(120% 60% at 50% 30%, rgba(255,0,0,0.16), transparent 70%), #0a0d14' }}
    >
      <YouTubeMark className="h-[34px] w-[48px] transition-transform duration-200 group-hover:scale-110" />
      <span className="font-display text-[15px] font-bold text-white">@TradeGuardX</span>
      <span className="text-[12px] leading-snug text-slate-400">Live kill switch tests, setups and real trading days.</span>
      <span className="mt-1 rounded-full px-4 py-2 text-[12.5px] font-bold text-white" style={{ backgroundColor: '#FF0000' }}>
        Watch on YouTube
      </span>
    </a>
  );
}

/**
 * Which card plays its silent preview: one at a time, only among cards fully
 * on screen, moving on every PREVIEW_MS. One embed at a time keeps the page
 * light. Stops for good once the visitor plays a clip with sound.
 */
function usePreviewRotation(count) {
  const cards = useRef([]);
  const [active, setActive] = useState(-1);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped || count === 0 || !previewsAllowed() || typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Set();
    let cur = -1;
    const set = (i) => { cur = i; setActive(i); };
    const sorted = () => [...visible].sort((a, b) => a - b);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = Number(e.target.dataset.index);
        if (e.intersectionRatio >= 0.85) visible.add(i); else visible.delete(i);
      }
      // Keep the playing card while it is still on screen.
      if (!visible.has(cur)) set(sorted()[0] ?? -1);
    }, { threshold: [0, 0.85, 1] });
    cards.current.forEach((el) => el && io.observe(el));
    const timer = setInterval(() => {
      const list = sorted();
      if (list.length) set(list.find((i) => i > cur) ?? list[0]);
    }, PREVIEW_MS);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [count, stopped]);

  return { cards, active: stopped ? -1 : active, stop: () => setStopped(true) };
}

export default function TradingInAction() {
  const { cards, active, stop } = usePreviewRotation(CLIPS.length);
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
          Real accounts, real trades: a kill switch firing on Exness, a two-minute Delta setup, and green and red days — including the ones the account got locked. Scroll to watch.
        </p>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { trackCtaClick('landing_trading_in_action_channel'); } catch { /* best-effort */ } }}
          className="mt-5 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 transition-colors hover:bg-white/[0.06] lg:hidden"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
        >
          <YouTubeMark className="h-[15px] w-[21px]" />
          <span className="text-[13px] font-semibold text-white">@TradeGuardX</span>
          <span className="text-[13px] text-slate-400">· Watch every video on YouTube</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden><path d="M7 17 17 7M9 7h8v8" /></svg>
        </a>
      </div>

      <div
        className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pl-[18px] pr-[18px] sm:pl-7 sm:pr-7"
        style={{ scrollbarWidth: 'none' }}
      >
        {CLIPS.map((day, i) => (
          <ClipCard
            key={day.n}
            ref={(el) => { cards.current[i] = el; }}
            day={day}
            index={i}
            preview={active === i}
            onPlay={stop}
          />
        ))}
        <ChannelCard />
        {/* trailing spacer so the last card can snap fully into view, not flush to the edge */}
        <span aria-hidden className="shrink-0" style={{ width: '1px' }} />
      </div>
    </section>
  );
}
