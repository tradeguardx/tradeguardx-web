import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { getFoundingMemberConfig } from '../lib/foundingMember';
import { CHALLENGE, logDays, publishedDays, tally, currentDay } from '../content/thirtyDays';

/**
 * /30-days — a public log of the founder trading his own kill switch for 30 days.
 *
 * The persuasive weight of this page is that it's checkable, so the component
 * invents nothing: every figure comes from src/content/thirtyDays.js and the
 * tally is summed from the same entries rendered below it. If a day is missing
 * from the file it's missing from the page — there is no filler.
 *
 * Visually it borrows the site's dark surface but leans into a paper/binder
 * motif for the log itself, using Fraunces (already loaded for headings) as the
 * journal voice rather than pulling in a handwriting font and a third
 * render-blocking font request.
 */

const STATUS = {
  armed: { label: 'RULES HELD', color: '#00d4aa', bg: 'rgba(0,212,170,0.08)', border: 'rgba(0,212,170,0.3)' },
  warned: { label: 'WARNED', color: '#f0b429', bg: 'rgba(240,180,41,0.08)', border: 'rgba(240,180,41,0.3)' },
  blocked: { label: 'ORDER BLOCKED', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.32)' },
  // "ACCOUNT LOCKED" rather than "KILL SWITCH FIRED" — always true (the daily
  // loss lock is armed before any close is attempted), whereas which mechanism
  // actually closed the position can vary day to day and belongs in the day's
  // note, not a badge that reads the same regardless.
  locked: { label: 'ACCOUNT LOCKED', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)' },
  flat: { label: 'NO TRADES', color: '#8593a7', bg: 'rgba(133,147,167,0.08)', border: 'rgba(133,147,167,0.25)' },
};

// Solid fills for the discipline grid — a status reads at a glance even at ~14px.
const GRID_FILL = {
  armed: '#00d4aa',
  warned: '#f0b429',
  blocked: '#ef4444',
  locked: '#e0403e',
  flat: 'rgba(133,147,167,0.55)',
};

const PAPER = '#f3efe3';
const PAPER_INK = '#3b3a36';
const PAPER_MUTED = '#7c776b';

function money(v, { sign = true } = {}) {
  if (v == null) return '—';
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  return `${s}$${Math.abs(v).toFixed(2)}`;
}

function niceDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────── video ─────────────────────────────── */

/** The site's brand shield — same path as the navbar mark. */
function ShieldMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

/**
 * Click-to-load YouTube — works for both normal videos and Shorts, and always
 * plays inline (an <iframe> embed, never a redirect to youtube.com). Thirty live
 * iframes would each pull ~1MB of player chrome and tank the page, so we render
 * a facade and only mount the real iframe once someone actually asks for it.
 *
 * The facade is our OWN branded poster, not YouTube's raw thumbnail — the video
 * frame sits dimmed and blurred behind a TradeGuardX overlay (shield + wordmark,
 * day number, status, P&L), so the log reads as one designed surface instead of
 * a wall of scraped Shorts chrome. `poster` overrides the background image if you
 * want to hand-pick a frame; otherwise we fall back to the YT thumbnail.
 *
 * `short` renders the player portrait (9:16) and caps its height so a vertical
 * Short doesn't take over the column; the poster matches.
 */
function VideoEmbed({ id, day, short, poster, status, pnl }) {
  const [live, setLive] = useState(false);
  const s = STATUS[status] ?? STATUS.armed;
  const shape = short
    ? 'mx-auto aspect-[9/16] w-full max-w-[300px]'
    : 'aspect-video w-full';

  if (live) {
    return (
      <div className={`relative overflow-hidden rounded-xl border ${shape}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={`Day ${day} recap`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      </div>
    );
  }

  const bg = poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <button
      type="button"
      onClick={() => setLive(true)}
      aria-label={`Play the Day ${day} recap video`}
      className={`group relative block overflow-hidden rounded-xl border text-left transition-colors ${shape}`}
      style={{ borderColor: 'rgba(0,212,170,0.18)', backgroundColor: '#05080b' }}
    >
      {/* the actual video frame, pushed way back so it's texture, not content */}
      <img
        src={bg}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-[2px] transition-opacity duration-300 group-hover:opacity-40"
      />
      {/* brand wash — teal glow top, ink floor so the caption sits on solid ground */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 0%, rgba(0,212,170,0.14), transparent 55%), linear-gradient(180deg, rgba(5,8,11,0.35) 0%, rgba(5,8,11,0.2) 45%, rgba(5,8,11,0.92) 100%)',
        }}
      />

      <span className="relative flex h-full flex-col justify-between p-4">
        {/* brand lockup */}
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(0,212,170,0.16)' }}>
            <ShieldMark className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-[13px] font-bold text-white" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
            TradeGuardX
          </span>
          <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em]"
            style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
          >
            {s.label}
          </span>
        </span>

        {/* centre play button */}
        <span className="flex flex-1 items-center justify-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: '#00d4aa', color: '#04120e', boxShadow: '0 8px 30px -6px rgba(0,212,170,0.6)' }}
          >
            <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor" aria-hidden>
              <path d="M19 9.27a2 2 0 0 1 0 3.46L3 21.66a2 2 0 0 1-3-1.73V2.07A2 2 0 0 1 3 .34Z" />
            </svg>
          </span>
        </span>

        {/* footer: day + P&L */}
        <span className="flex items-end justify-between">
          <span>
            <span className="block font-display text-2xl font-black leading-none text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
              Day {String(day).padStart(2, '0')}
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              30 Days of Discipline
            </span>
          </span>
          {pnl != null && (
            <span
              className="rounded-lg px-2.5 py-1 font-display text-sm font-bold"
              style={{
                color: pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#cbd5e1',
                backgroundColor: 'rgba(5,8,11,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {money(pnl)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/* ─────────────────────────────── day entry ─────────────────────────────── */

function DayStat({ label, value, tone }) {
  return (
    <div>
      <p className="font-display text-lg font-bold leading-none" style={{ color: tone || 'var(--tgx-ink, #e9ece8)' }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-slate-500">{label}</p>
    </div>
  );
}

function DayEntry({ day, isLatest, reduce }) {
  const s = STATUS[day.status] ?? STATUS.flat;
  const pnlTone = day.pnl == null ? '#8593a7' : day.pnl > 0 ? '#22c55e' : day.pnl < 0 ? '#ef4444' : '#8593a7';
  const hasMedia = Boolean(day.video || day.image);

  // Deliberately a CSS animation rather than framer's whileInView. The build
  // prerenders this route, and an IntersectionObserver reveal gets snapshotted
  // mid-flight — every entry below the fold was being written into the static
  // HTML as `opacity: 0`, so the whole log read as blank until JS booted (and
  // stayed blank if it never did). The log IS the page; it must not depend on
  // scroll observation to be visible.
  return (
    <article
      id={`day-${String(day.n).padStart(2, '0')}`}
      className={`relative scroll-mt-24 pb-12 sm:pb-16 md:pl-12 ${reduce ? '' : 'animate-slide-up'}`}
    >
      {/* binder hole on the spine — desktop only */}
      <span
        aria-hidden
        className="absolute left-0 top-1.5 hidden h-4 w-4 rounded-full border-2 md:block"
        style={{
          backgroundColor: '#07090f',
          borderColor: isLatest ? '#00d4aa' : 'rgba(255,255,255,0.14)',
          boxShadow: isLatest ? '0 0 0 4px rgba(0,212,170,0.13)' : 'none',
          marginLeft: '-6px',
        }}
      />

      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          Day {String(day.n).padStart(2, '0')}
        </h3>
        <time dateTime={day.date} className="text-[13px] text-slate-500">
          {niceDate(day.date)}
        </time>
        <span
          className="rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em]"
          style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
        >
          {s.label}
        </span>
        {day.loosened && (
          <span
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em]"
            style={{ color: '#f0b429', backgroundColor: 'rgba(240,180,41,0.08)', borderColor: 'rgba(240,180,41,0.3)' }}
          >
            RULE LOOSENED
          </span>
        )}
      </header>

      {day.draft && (
        <p
          className="mb-4 rounded-lg border px-3.5 py-2.5 text-[13px] font-semibold"
          style={{ color: '#f0b429', backgroundColor: 'rgba(240,180,41,0.07)', borderColor: 'rgba(240,180,41,0.3)' }}
        >
          DRAFT — placeholder text, not counted in the tally. Remove <code>draft: true</code> to publish.
        </p>
      )}

      <div className={hasMedia ? 'grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-8' : ''}>
        {hasMedia && (
          <div className="space-y-3">
            {day.video && (
              <VideoEmbed
                id={day.video}
                day={day.n}
                short={day.short}
                poster={day.poster}
                status={day.status}
                pnl={day.pnl}
              />
            )}
            {day.image && (
              <img
                src={day.image}
                alt={`Day ${day.n} trade card`}
                loading="lazy"
                className="w-full rounded-xl border"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        )}

        <div className="min-w-0">
          {/* the day's numbers */}
          <div className="mb-5 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border px-4 py-3.5"
            style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <DayStat label="P&L" value={money(day.pnl)} tone={pnlTone} />
            <DayStat label="Trades" value={day.trades ?? 0} tone="#e9ece8" />
            <DayStat label="Blocked" value={day.blocked ?? 0} tone={day.blocked ? '#ef4444' : '#e9ece8'} />
            <DayStat label="Cooldowns" value={day.cooldowns ?? 0} tone={day.cooldowns ? '#f0b429' : '#e9ece8'} />
          </div>

          {day.quote && (
            <p
              className="mb-4 border-l-2 pl-4 font-display text-lg italic leading-snug"
              style={{ borderColor: 'rgba(0,212,170,0.4)', color: '#00d4aa' }}
            >
              {day.quote}
            </p>
          )}

          {(day.note ?? []).map((p, i) => (
            <p
              key={p.slice(0, 32)}
              className={i === 0 ? 'mb-3 text-[16px] leading-relaxed text-slate-200' : 'mb-3 text-[15px] leading-relaxed text-slate-400'}
            >
              {p}
            </p>
          ))}

          {Boolean(day.tags?.length) && (
            <ul className="mt-4 flex flex-wrap gap-2 p-0">
              {day.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-md border px-2.5 py-1 text-[11.5px] text-slate-500"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────── the 30-day arc ─────────────────────────── */

/**
 * The signature element: 30 cells, one per day, colored by that day's status —
 * green rules-held, amber warned, red kill-switch, faint upcoming. Makes the
 * whole commitment visible at a glance (how far in, how clean, how many left)
 * and is the most screenshot-able part of the page. All derived from the log.
 */
function DisciplineArc({ statusByDay, current, total, reduce }) {
  const cleanDays = [...statusByDay.values()].filter((s) => s === 'armed' || s === 'flat').length;
  const eventfulDays = statusByDay.size - cleanDays;
  const pct = Math.round((Math.min(current, total) / total) * 100);

  return (
    <section className="mb-10 sm:mb-14" aria-label="The 30-day arc">
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(0,212,170,0.04), transparent)' }}
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-lg font-bold text-white">The 30-day arc</h2>
          <span className="text-[13px] text-slate-400">
            <b className="font-semibold text-white">{cleanDays}</b> clean
            {eventfulDays > 0 && <> · <b className="font-semibold" style={{ color: '#f0b429' }}>{eventfulDays}</b> eventful</>}
            {' · '}<span className="text-slate-500">{Math.max(total - current, 0)} to go</span>
          </span>
        </div>

        {/* the grid */}
        <div className="grid gap-1.5 grid-cols-[repeat(10,minmax(0,1fr))] sm:grid-cols-[repeat(15,minmax(0,1fr))]">
          {Array.from({ length: total }, (_, i) => {
            const n = i + 1;
            const st = statusByDay.get(n);
            const isCurrent = n === current;
            const fill = st ? GRID_FILL[st] ?? GRID_FILL.flat : 'transparent';
            const label = st ? `Day ${n}: ${(STATUS[st] ?? STATUS.flat).label}` : `Day ${n}: upcoming`;
            return (
              <div
                key={n}
                title={label}
                aria-label={label}
                className="relative aspect-square rounded-[5px] border transition-transform"
                style={{
                  backgroundColor: fill,
                  borderColor: st ? 'transparent' : 'rgba(255,255,255,0.09)',
                  boxShadow: isCurrent && !reduce ? '0 0 0 2px rgba(0,212,170,0.9), 0 0 12px rgba(0,212,170,0.5)' : 'none',
                }}
              >
                {isCurrent && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: st ? '#04120e' : '#00d4aa' }}>
                    {n}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-slate-400">
          {[
            ['armed', 'Rules held'],
            ['warned', 'Warned'],
            ['locked', 'Locked'],
          ].map(([k, lbl]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: GRID_FILL[k] }} />
              {lbl}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] border" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            Upcoming
          </span>
        </div>

        {/* progress to 30 */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-semibold text-white">Day {current} of {total}</span>
            <span className="text-slate-500">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00b894, #00d4aa)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── page ─────────────────────────────── */

export default function ThirtyDaysPage() {
  const reduce = useReducedMotion();
  const days = logDays();
  const t = tally();
  const day = currentDay();
  const founding = getFoundingMemberConfig();
  const trialCopy = founding ? `Start free for ${founding.months === 1 ? '30 days' : `${founding.months} months`}` : 'Start free';
  const latestN = days.length ? days[0].n : 0;
  // Map day-number → status for the arc grid (published days only).
  const statusByDay = new Map(publishedDays().map((d) => [d.n, d.status]));

  useSEO({
    title: '30 Days of Discipline — trading my own kill switch in public',
    description:
      `Day ${day} of 30. I trade my own rules on ${CHALLENGE.exchange} with a ${CHALLENGE.lossCap} daily loss cap and post the result every day — including the days TradeGuardX has to stop me.`,
    url: 'https://tradeguardx.com/30-days',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: '30 Days of Discipline',
      description: CHALLENGE.tagline,
      url: 'https://tradeguardx.com/30-days',
      blogPost: days
        .filter((d) => !d.draft)
        .map((d) => ({
          '@type': 'BlogPosting',
          headline: `Day ${d.n} — ${(STATUS[d.status] ?? STATUS.flat).label}`,
          datePublished: d.date,
          articleBody: (d.note ?? []).join(' '),
          url: `https://tradeguardx.com/30-days#day-${String(d.n).padStart(2, '0')}`,
        })),
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.07), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-16 sm:px-7 sm:pt-20">
        {/* ── hero ── */}
        <header className="mb-12 sm:mb-16">
          <span
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.06)', borderColor: 'rgba(0,212,170,0.35)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full" style={{ backgroundColor: 'rgba(0,212,170,0.6)' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#00d4aa' }} />
            </span>
            Account still open · Day <b className="font-display text-[13px] font-bold">{String(day).padStart(2, '0')}</b> of {CHALLENGE.totalDays}
          </span>

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            I&rsquo;m trading my own kill switch
            <span className="block" style={{ color: '#00d4aa' }}>in public for 30 days.</span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-slate-400">
            {CHALLENGE.tagline} <span className="text-slate-200">Including the days it goes badly — especially those.</span>
          </p>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-slate-500">
            <span>Live on {CHALLENGE.exchange}</span>
            {CHALLENGE.rules.map((r) => (
              <span key={r} className="text-slate-300">
                <span className="mx-1.5 text-slate-700">·</span>
                {r}
              </span>
            ))}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
            >
              {trialCopy} →
            </Link>
            <a
              href="#day-01"
              className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
            >
              Start from Day 1
            </a>
          </div>

          {/* the unfair advantage: it's not a claim, the product recorded it */}
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] leading-snug text-slate-400"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="#00d4aa" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Every number here is my <span className="text-slate-200">live Delta account</span>, recorded by TradeGuardX — not a demo.</span>
          </p>
        </header>

        {/* ── the 30-day arc: grid + progress ── */}
        <DisciplineArc statusByDay={statusByDay} current={day} total={CHALLENGE.totalDays} reduce={reduce} />

        {/* ── the tally: an index card ── */}
        <section className="mb-14 sm:mb-20" aria-label="Running tally">
          <div
            className="rounded-lg px-5 py-6 sm:px-8 sm:py-7"
            style={{
              backgroundColor: PAPER,
              color: PAPER_INK,
              boxShadow: '0 20px 50px -22px rgba(0,0,0,0.9)',
              transform: reduce ? 'none' : 'rotate(-0.35deg)',
            }}
          >
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.19em]" style={{ color: '#8b8578' }}>
              The tally · updated daily
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
              {[
                { v: t.logged, l: 'days logged' },
                { v: t.blocked, l: 'orders blocked' },
                { v: t.cooldowns, l: 'cooldowns triggered' },
                { v: t.loosened, l: 'rules loosened', good: t.loosened === 0 },
              ].map((s) => (
                <div key={s.l}>
                  <b
                    className="block font-display text-[34px] font-bold leading-none tracking-tight sm:text-[42px]"
                    style={{ color: s.good ? '#128a6e' : PAPER_INK }}
                  >
                    {s.v}
                  </b>
                  <span className="mt-1.5 block text-[12.5px]" style={{ color: PAPER_MUTED }}>
                    {s.l}
                  </span>
                </div>
              ))}
            </div>

            {t.net != null && (
              <p className="mt-6 text-[13px]" style={{ color: PAPER_MUTED }}>
                Net across {t.logged} day{t.logged === 1 ? '' : 's'}:{' '}
                <b style={{ color: t.net >= 0 ? '#128a6e' : '#b0413e' }}>{money(t.net)}</b>
                {' · '}
                {t.green} green, {t.red} red, {t.trades} trade{t.trades === 1 ? '' : 's'} total
              </p>
            )}

            <p
              className="mt-5 border-t pt-4 font-display text-[17px] italic"
              style={{ borderColor: '#c9c2ae', color: '#6a6559' }}
            >
              Account still open. That&rsquo;s the only score that counts.
            </p>
          </div>
        </section>

        {/* ── the log ── */}
        <main>
          <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">The log</h2>
            <span className="text-[12px] uppercase tracking-[0.1em] text-slate-500">
              newest first · {days.length} of {CHALLENGE.totalDays} posted
            </span>
          </div>

          {days.length === 0 ? (
            <p className="rounded-xl border border-white/10 px-5 py-8 text-center text-slate-500">
              Day 1 goes up soon.
            </p>
          ) : (
            <div className="relative">
              {/* the spine the pages clip into */}
              <div
                aria-hidden
                className="absolute bottom-0 left-0 top-2 hidden w-px md:block"
                style={{ background: 'linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.06) 70%, transparent)' }}
              />
              {days.map((d) => (
                <DayEntry key={d.n} day={d} isLatest={d.n === latestN} reduce={reduce} />
              ))}
            </div>
          )}
        </main>

        {/* ── inline conversion ── */}
        <section
          className="mt-6 rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(0,212,170,0.05), transparent)',
          }}
        >
          <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            Same rules. Your account.
          </h3>
          <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-slate-400">
            Everything in this log is TradeGuardX doing its job on a real Delta Exchange account — the
            same daily loss cap, warnings and kill switch you can set on yours in about two minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
            >
              {trialCopy}
            </Link>
            <Link
              to="/crypto-kill-switch"
              className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
            >
              How the kill switch works
            </Link>
          </div>
          <p className="mt-5 text-[12px] leading-relaxed text-slate-600">
            This is a personal trading log, not a track record or a recommendation. Crypto derivatives
            carry substantial risk — you can lose more than you expect. Nothing here is financial advice.
          </p>
        </section>
      </div>
    </div>
  );
}
