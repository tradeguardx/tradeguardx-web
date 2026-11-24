import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CHANNEL_URL, LESSONS, SECTIONS, VIDEO_LESSONS,
  coverFor, fallbackCoverFor, formatLength, lessonFor, lessonsIn, minutes,
} from '../../content/tutorials';
import { trackCtaClick } from '../../lib/analytics';

/**
 * The course player (24 Nov 2026), Udemy-style: one player, the lesson's
 * notes under it, and the course outline beside it (below it on a phone).
 * Clicking a lesson plays it here; a tick marks lessons already watched.
 *
 * One component, two homes: `tone="site"` on the public /tutorials (always
 * dark), `tone="app"` in the dashboard, where it takes the theme tokens.
 * #exness (or a broker id like #delta-india) opens that lesson. Each lesson
 * links to the page that covers its topic in writing (`guide`).
 */

const TONES = {
  site: {
    '--t-ink': '#ffffff', '--t-ink2': '#cbd5e1', '--t-ink3': '#94a3b8', '--t-faint': '#64748b',
    '--t-line': 'rgba(255,255,255,0.08)', '--t-card': 'rgba(255,255,255,0.03)', '--t-hover': 'rgba(255,255,255,0.05)',
    '--t-accent': '#00d4aa', '--t-accent-tint': 'rgba(0,212,170,0.1)', '--t-on-accent': '#04120e',
    '--t-bg': '#07090f',
  },
  app: {
    '--t-ink': 'var(--ink)', '--t-ink2': 'var(--ink-2)', '--t-ink3': 'var(--ink-3)', '--t-faint': 'var(--ink-faint)',
    '--t-line': 'var(--line)', '--t-card': 'var(--surface-2)', '--t-hover': 'var(--surface-2)',
    '--t-accent': 'var(--mint)', '--t-accent-tint': 'var(--mint-tint)', '--t-on-accent': 'var(--on-mint)',
    '--t-bg': 'var(--bg, var(--surface))',
    // The dashboard header grows with its bands; a sticky bar would hide under it.
    '--t-tab-pos': 'static',
  },
};

const CSS = `
.crs{color:var(--t-ink)}
.crs-grid{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"main" "tabs" "side" "intro" "info";gap:0}
.crs-grid>*{min-width:0}
.crs-main{grid-area:main}.crs-intro{grid-area:intro}.crs-info{grid-area:info}.crs-side{grid-area:side}.crs-tabs{grid-area:tabs}
/* Phone and tablet (24 Nov 2026): player first, then two tabs, so the lesson
   list is one tap away instead of below every note. */
.crs-tabs{position:var(--t-tab-pos,sticky);top:var(--t-stick,76px);scroll-margin-top:var(--t-stick,76px);z-index:5;display:flex;gap:4px;margin:16px 0 14px;padding:4px;border:1px solid var(--t-line);border-radius:12px;background:var(--t-bg,#07090f)}
.crs-tabs button{flex:1;min-height:42px;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:var(--t-ink3);font-size:14px;font-weight:700;cursor:pointer}
.crs-tabs button[aria-selected="true"]{background:var(--t-accent-tint);color:var(--t-ink)}
@media(min-width:640px){.crs-tabs{top:var(--t-stick,66px);scroll-margin-top:var(--t-stick,66px)}}
.crs[data-tab="lessons"] .crs-info,.crs[data-tab="lessons"] .crs-intro{display:none}
.crs-intro>.crs-desc:first-child{margin-top:0}
.crs[data-tab="info"] .crs-side{display:none}
@media(min-width:1024px){
  .crs-grid{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"main side" "intro side" "info side";grid-template-rows:auto auto 1fr;column-gap:28px}
  .crs-tabs{display:none}
  .crs[data-tab] .crs-info,.crs[data-tab] .crs-intro,.crs[data-tab] .crs-side{display:block}
  .crs-intro>.crs-desc:first-child{margin-top:8px}
  .crs-side{position:sticky;top:88px;align-self:start;max-height:calc(100vh - 110px);overflow:auto}
}
@media(max-width:559px){
  .crs-stage{border-radius:10px}
  .crs-actions{flex-direction:column}
  .crs-actions .crs-btn{justify-content:center;min-height:46px}
  .crs-desc{font-size:14.5px}
  .crs-les{padding-top:13px;padding-bottom:13px}
  .crs-chap button{padding:10px 8px}
}
.crs-stage{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;border:1px solid var(--t-line)}
.crs-stage iframe{position:absolute;top:0;height:100%;border:0}
.crs-poster{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:#05070c;cursor:pointer}
.crs-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.crs-poster .sh{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,7,12,.25)}
.crs-soon{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;background:radial-gradient(120% 80% at 50% 0%,rgba(0,212,170,.12),transparent 60%),#05070c;color:#cbd5e1}
.crs-meta{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:16px;font-size:12.5px;color:var(--t-faint)}
.crs-title{margin:6px 0 0;font-size:clamp(20px,2.6vw,26px);line-height:1.25;font-weight:700;letter-spacing:-.02em;color:var(--t-ink)}
.crs-desc{margin:8px 0 0;max-width:70ch;font-size:15px;line-height:1.6;color:var(--t-ink3)}
.crs-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.crs-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:700;text-decoration:none;cursor:pointer;border:1px solid var(--t-line);background:transparent;color:var(--t-ink2)}
.crs-btn.primary{background:var(--t-accent);border-color:var(--t-accent);color:var(--t-on-accent)}
.crs-steps{margin-top:22px;padding:18px;border:1px solid var(--t-line);border-radius:14px;background:var(--t-card)}
.crs-steps h3{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-faint)}
.crs-steps ol{list-style:none;margin:0;padding:0;display:grid;gap:12px;counter-reset:s}
.crs-steps li{position:relative;padding-left:34px;font-size:14px;line-height:1.5;color:var(--t-ink2);counter-increment:s}
.crs-steps li::before{content:counter(s);position:absolute;left:0;top:0;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--t-accent-tint);color:var(--t-accent);font-size:11.5px;font-weight:800}
.crs-side{border:1px solid var(--t-line);border-radius:14px;background:var(--t-card)}
.crs-head{padding:16px 16px 12px;border-bottom:1px solid var(--t-line)}
.crs-head b{display:block;font-size:15px;color:var(--t-ink)}
.crs-bar{height:4px;margin-top:10px;border-radius:4px;background:var(--t-line);overflow:hidden}
.crs-bar i{display:block;height:100%;background:var(--t-accent)}
.crs-sec{border-bottom:1px solid var(--t-line)}
.crs-sec>button:not(.crs-les){display:flex;width:100%;align-items:center;gap:10px;padding:13px 16px;border:0;background:transparent;color:var(--t-ink);text-align:left;cursor:pointer}
.crs-sec>button:not(.crs-les) b{flex:1;font-size:13.5px}
.crs-sec>button:not(.crs-les)>span{font-size:11.5px;color:var(--t-faint)}
.crs-sec>button:not(.crs-les) svg{flex:none;transition:transform .2s;color:var(--t-faint)}
.crs-sec[data-open="true"]>button:not(.crs-les) svg{transform:rotate(180deg)}
.crs-les{display:flex;width:100%;gap:11px;align-items:flex-start;padding:10px 16px 10px 14px;border:0;border-left:2px solid transparent;background:transparent;text-align:left;cursor:pointer;color:var(--t-ink2)}
.crs-les:hover{background:var(--t-hover)}
.crs-les[aria-current="true"],.crs-les[aria-current="page"]{background:var(--t-accent-tint);border-left-color:var(--t-accent);color:var(--t-ink)}
.crs-les .ic{flex:none;display:grid;place-items:center;width:20px;height:20px;margin-top:1px;border-radius:50%;border:1.5px solid var(--t-line);color:var(--t-on-accent)}
.crs-les .ic.done{background:var(--t-accent);border-color:var(--t-accent)}
.crs-les .nm{flex:1;font-size:13.5px;line-height:1.4;color:var(--t-ink2)}
.crs-les[aria-current="true"] .nm,.crs-les[aria-current="page"] .nm{color:var(--t-ink);font-weight:600}
.crs-les .sub{display:block;margin-top:2px;font-size:11.5px;color:var(--t-faint)}
.crs-more{margin-top:22px;display:grid;gap:22px}
.crs-more h3{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t-faint)}
.crs-more ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.crs-more li{position:relative;padding-left:20px;font-size:14px;line-height:1.55;color:var(--t-ink2)}
.crs-more ul.pts li::before{content:'';position:absolute;left:2px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--t-accent)}
.crs-more ul.nts li::before{content:'!';position:absolute;left:0;top:1px;font-weight:800;color:#f5b545}
.crs-chap{display:grid;gap:2px}
.crs-chap button{display:flex;gap:14px;width:100%;padding:7px 8px;border:0;border-radius:8px;background:transparent;text-align:left;font-size:14px;color:var(--t-ink2);cursor:pointer}
.crs-chap button:hover{background:var(--t-hover);color:var(--t-ink)}
.crs-chap time{flex:none;width:42px;font-variant-numeric:tabular-nums;font-weight:700;color:var(--t-accent)}
.crs-faq{display:grid;gap:14px}
.crs-faq h4{margin:0;font-size:15px;font-weight:700;color:var(--t-ink)}
.crs-faq p{margin:4px 0 0;font-size:14px;line-height:1.6;color:var(--t-ink3)}
a.crs-les{text-decoration:none}
.crs-soon-tag{padding:1px 6px;border-radius:5px;background:var(--t-line);font-size:10.5px;font-weight:700;color:var(--t-ink3)}
`;

const STORE = 'tgx_tutorials_watched';
function readWatched() {
  try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch { return new Set(); }
}
function saveWatched(set) {
  try { localStorage.setItem(STORE, JSON.stringify([...set])); } catch { /* still ticked for this visit */ }
}

function Play({ size = 64 }) {
  return (
    <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: '50%', background: '#00d4aa', color: '#04120e', boxShadow: '0 10px 30px -6px rgba(0,212,170,0.6)' }}>
      <svg width={size * 0.32} height={size * 0.36} viewBox="0 0 20 22" fill="currentColor"><path d="M19 9.27a2 2 0 0 1 0 3.46L3 21.66a2 2 0 0 1-3-1.73V2.07A2 2 0 0 1 3 .34Z" /></svg>
    </span>
  );
}

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

/** The stage: cover until played, then the embed. A Short plays 9:16 in the middle of the 16:9 frame. */
function Stage({ lesson, playing, onPlay, startAt }) {
  const v = lesson.video;
  if (!v) {
    return (
      <div className="crs-stage">
        <div className="crs-soon">
          <span>
            <b style={{ display: 'block', fontSize: 18, color: '#fff' }}>Video coming soon</b>
            <span style={{ display: 'block', marginTop: 6, fontSize: 14 }}>Follow the steps below, or the written guide with screenshots.</span>
          </span>
        </div>
      </div>
    );
  }
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
  const from = startAt ?? v.start;
  if (from) params.set('start', String(from));
  return (
    <div className="crs-stage">
      {playing ? (
        <iframe
          key={`${v.id}-${startAt ?? ''}`}
          src={`https://www.youtube-nocookie.com/embed/${v.id}?${params.toString()}`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          // A 9:16 Short in a 16:9 frame: full height, 81/256 of the width.
          style={v.short ? { left: '50%', width: 'calc(100% * 81 / 256)', transform: 'translateX(-50%)' } : { left: 0, width: '100%' }}
        />
      ) : (
        <button type="button" className="crs-poster" onClick={onPlay} aria-label={`Play: ${lesson.title}`}>
          <img
            src={coverFor(v.id)}
            onError={(e) => { if (e.currentTarget.src !== fallbackCoverFor(v.id)) e.currentTarget.src = fallbackCoverFor(v.id); }}
            alt=""
          />
          <span className="sh"><Play /></span>
        </button>
      )}
    </div>
  );
}

export default function TutorialsLibrary({ tone = 'site' }) {
  const app = tone === 'app';
  const { hash } = useLocation();
  const [key, setKey] = useState(LESSONS[0].key);
  const [playing, setPlaying] = useState(false);
  const [startAt, setStartAt] = useState(null);
  const [watched, setWatched] = useState(readWatched);
  const [tab, setTab] = useState('lessons'); // phone/tablet only
  const [openSecs, setOpenSecs] = useState(() => new Set(SECTIONS.filter((s) => !s.more).map((s) => s.key)));

  const lesson = LESSONS.find((l) => l.key === key) ?? LESSONS[0];
  const next = LESSONS[LESSONS.indexOf(lesson) + 1] ?? null;

  const select = useCallback((k, { play = true } = {}) => {
    const l = LESSONS.find((x) => x.key === k);
    if (!l) return;
    setKey(k);
    setStartAt(null);
    setOpenSecs((s) => (s.has(l.section) ? s : new Set(s).add(l.section)));
    setPlaying(play && Boolean(l.video));
    if (play && l.video) {
      try { trackCtaClick(`tutorial_play_${k}${app ? '_app' : ''}`); } catch { /* best-effort */ }
      setWatched((w) => {
        if (w.has(k)) return w;
        const n = new Set(w).add(k);
        saveWatched(n);
        return n;
      });
    }
  }, [app]);

  // A hash opens that lesson without starting it: a link should not start
  // sound.
  useEffect(() => {
    const l = lessonFor(decodeURIComponent((hash || '').replace(/^#/, '')));
    if (!l) return undefined;
    const t = setTimeout(() => select(l.key, { play: false }), 0);
    return () => clearTimeout(t);
  }, [hash, select]);

  // On a phone the outline is below the player: picking a lesson there
  // should bring the player back into view.
  const toPlayer = () => {
    try {
      if (window.matchMedia('(max-width: 1023px)').matches) {
        document.getElementById('crs-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch { /* fine */ }
  };
  // Switching tabs while scrolled down into the other one: start the new tab
  // at its top, under the stuck tab bar, not halfway through.
  const showTab = (t) => {
    setTab(t);
    try {
      const bar = document.getElementById('crs-tabs');
      const stick = parseFloat(getComputedStyle(bar).top) || 0;
      if (bar && bar.getBoundingClientRect().top <= stick + 1) {
        requestAnimationFrame(() => bar.scrollIntoView({ block: 'start' }));
      }
    } catch { /* fine */ }
  };
  const pick = (k) => {
    select(k);
    toPlayer();
  };

  // Jump to a chapter: restart the embed at that second.
  const seek = (sec) => {
    select(lesson.key);
    setStartAt(sec);
    toPlayer();
  };

  const videos = VIDEO_LESSONS.length;
  const done = useMemo(() => VIDEO_LESSONS.filter((l) => watched.has(l.key)).length, [watched]);
  const pct = Math.round((done / videos) * 100);

  const guideLink = (to, text) => (app
    ? <a className="crs-btn" href={to} target="_blank" rel="noopener noreferrer">{text}</a>
    : <Link className="crs-btn" to={to}>{text}</Link>);

  return (
    <div className="crs" data-tab={tab} style={TONES[tone] ?? TONES.site}>
      <style>{CSS}</style>
      <div className="crs-grid">
        {/* ── Player and the lesson's notes ── */}
        <div id="crs-player" className="crs-main" style={{ scrollMarginTop: 80 }}>
          <Stage lesson={lesson} playing={playing} startAt={startAt} onPlay={() => select(lesson.key)} />
          <div className="crs-meta">
            <span>{SECTIONS.find((s) => s.key === lesson.section)?.title}</span>
            {lesson.video && <span>{formatLength(lesson.video.seconds)}</span>}
            {lesson.video?.lang && <span>{lesson.video.lang}</span>}
          </div>
          <h2 className="crs-title">{lesson.title}</h2>
        </div>

        {/* Description and buttons: under the title on desktop; inside
            "About this lesson" on a phone, so the lesson list sits right
            under the video (owner, 24 Nov 2026). */}
        <div className="crs-intro">
          {lesson.desc && <p className="crs-desc">{lesson.desc}</p>}

          <div className="crs-actions">
            {next && (
              <button type="button" className="crs-btn primary" onClick={() => pick(next.key)}>
                Next: {next.title}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            )}
            {lesson.guide && guideLink(lesson.guide, lesson.guideLabel ?? 'Written guide with screenshots')}
          </div>
        </div>

        {/* Phone and tablet: Lessons | About this lesson. Hidden on desktop,
            where both are on screen at once. */}
        <div id="crs-tabs" className="crs-tabs" role="tablist" aria-label="Course">
          <button type="button" role="tab" aria-selected={tab === 'lessons'} onClick={() => showTab('lessons')}>Lessons</button>
          <button type="button" role="tab" aria-selected={tab === 'info'} onClick={() => showTab('info')}>
            {lesson.video ? 'About this lesson' : 'Step by step'}
          </button>
        </div>

        <div className="crs-info">
          {lesson.steps && (
            <div className="crs-steps">
              <h3>Step by step</h3>
              <ol>{lesson.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
          )}

          {(lesson.points || lesson.chapters || lesson.faq || lesson.notes) && (
            <div className="crs-more">
              {lesson.points && (
                <section>
                  <h3>In this video</h3>
                  <ul className="pts">{lesson.points.map((x) => <li key={x}>{x}</li>)}</ul>
                </section>
              )}
              {lesson.faq && (
                <section>
                  <h3>The short answers</h3>
                  <div className="crs-faq">
                    {lesson.faq.map(([q, a]) => (
                      <div key={q}><h4>{q}</h4><p>{a}</p></div>
                    ))}
                  </div>
                </section>
              )}
              {lesson.notes && (
                <section>
                  <h3>Good to know</h3>
                  <ul className="nts">{lesson.notes.map((x) => <li key={x}>{x}</li>)}</ul>
                </section>
              )}
              {lesson.chapters && lesson.video && (
                <section>
                  <h3>Chapters</h3>
                  <div className="crs-chap">
                    {lesson.chapters.map(([sec, label]) => (
                      <button key={sec} type="button" onClick={() => seek(sec)}>
                        <time>{formatLength(sec)}</time>{label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── Course outline ── */}
        <aside className="crs-side" aria-label="Course content">
          <div className="crs-head">
            <b>Course content</b>
            <span style={{ fontSize: 12, color: 'var(--t-faint)' }}>{done} of {videos} videos watched</span>
            <div className="crs-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          </div>
          {SECTIONS.map((sec) => {
            const list = lessonsIn(sec.key);
            const secs = list.reduce((n, l) => n + (l.video?.seconds ?? 0), 0);
            const isOpen = openSecs.has(sec.key);
            const toggle = () => setOpenSecs((s) => {
              const n = new Set(s);
              if (n.has(sec.key)) n.delete(sec.key); else n.add(sec.key);
              return n;
            });
            return (
              <div key={sec.key} className="crs-sec" data-open={isOpen}>
                <button type="button" aria-expanded={isOpen} onClick={toggle}>
                  <b>{sec.title}</b>
                  <span>{list.length} {list.length === 1 ? 'lesson' : 'lessons'}{secs ? ` · ${minutes(secs)}` : ''}</span>
                  <Chevron />
                </button>
                {isOpen && list.map((l) => {
                  const seen = watched.has(l.key);
                  const inner = (
                    <>
                      <span className={`ic${seen ? ' done' : ''}`} aria-label={seen ? 'Watched' : undefined}>
                        {seen && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                      </span>
                      <span className="nm">
                        {l.title}
                        <span className="sub">
                          {l.video
                            ? <>{formatLength(l.video.seconds)}{l.video.lang ? ` · ${l.video.lang}` : ''}</>
                            : <span className="crs-soon-tag">Coming soon</span>}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <button key={l.key} type="button" className="crs-les" aria-current={l.key === key} onClick={() => pick(l.key)}>
                      {inner}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { try { trackCtaClick(`tutorials_channel${app ? '_app' : ''}`); } catch { /* best-effort */ } }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', color: 'var(--t-ink2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <svg width="22" height="16" viewBox="0 0 28 20" aria-hidden="true">
              <path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
              <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" />
            </svg>
            All videos on @TradeGuardX
          </a>
        </aside>
      </div>
    </div>
  );
}
