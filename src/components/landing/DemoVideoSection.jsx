import { useCallback, useEffect, useState } from 'react';
import { trackCtaClick } from '../../lib/analytics';
import { demoVideoPoster, demoVideoEmbedUrl } from '../../lib/demoVideo';

// Video identity lives in lib/demoVideo so the landing page, the guides, and the
// structured data can't drift apart.
const POSTER_MAX = demoVideoPoster('maxres');
const POSTER_FALLBACK = demoVideoPoster('hq');

/** Full-colour YouTube mark — kept red-on-white per brand guidance so it stays recognisable. */
function YouTubeGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81z"
      />
      <path fill="#fff" d="M9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    </svg>
  );
}

function PlayGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

/**
 * Product demo — a poster the visitor clicks to play the walkthrough INSIDE the
 * site (a lightbox with the YouTube player), never a jump to youtube.com. Sending
 * someone to YouTube mid-scroll hands them a page full of other people's videos;
 * keeping playback here means they land back on the page when they close it.
 *
 * The iframe is only mounted once the lightbox opens, so the YouTube player and
 * its cookies cost nothing to visitors who never press play.
 */
export default function DemoVideoSection() {
  const [open, setOpen] = useState(false);
  const [poster, setPoster] = useState(POSTER_MAX);

  const close = useCallback(() => setOpen(false), []);

  const play = () => {
    try {
      trackCtaClick('landing_demo_video');
    } catch {
      /* analytics is best-effort */
    }
    setOpen(true);
  };

  // Esc to close, and freeze the page behind the lightbox so scrolling the
  // overlay doesn't scroll the landing page underneath it.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-[18px] py-8 sm:px-7">
      <div
        className="grid items-center gap-8 rounded-2xl border p-6 sm:p-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12"
        style={{
          borderColor: 'rgba(0,212,170,0.18)',
          background: 'linear-gradient(180deg, rgba(0,212,170,0.05), rgba(0,212,170,0.012))',
        }}
      >
        <div>
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgba(0,212,170,0.32)', color: 'var(--accent, #00d4aa)' }}
          >
            How to set up
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
Set up in <span style={{ color: 'var(--accent, #00d4aa)' }}>two minutes</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Connect your Delta key, set your limits, done. Watch the whole thing start to finish.
          </p>

          <button
            type="button"
            onClick={play}
            className="mt-7 inline-flex items-center gap-3 rounded-2xl px-6 py-3.5 text-[15px] font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
              color: '#05221c',
              boxShadow: '0 10px 26px -10px rgba(0,212,170,0.6)',
            }}
          >
            <YouTubeGlyph className="h-6 w-6" />
            Watch the demo
          </button>
        </div>

        <button
          type="button"
          onClick={play}
          aria-label="Play the TradeGuardX demo video"
          className="group relative block w-full overflow-hidden rounded-2xl border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#05070c' }}
        >
          <span className="block aspect-video w-full">
            <img
              src={poster}
              onError={() => setPoster(POSTER_FALLBACK)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </span>
          <span
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(5,7,12,0.15), rgba(5,7,12,0.55))' }}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20"
              style={{
                background: 'var(--accent, #00d4aa)',
                color: '#05221c',
                boxShadow: '0 0 0 10px rgba(0,212,170,0.14), 0 18px 40px -12px rgba(0,212,170,0.55)',
              }}
            >
              <PlayGlyph className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
          style={{ background: 'rgba(3,5,9,0.86)', backdropFilter: 'blur(6px)' }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="TradeGuardX demo video"
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border"
            style={{ borderColor: 'rgba(0,212,170,0.22)', background: '#05070c', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.9)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src={demoVideoEmbedUrl({ autoplay: true })}
                title="TradeGuardX demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border text-white transition-colors hover:bg-white/10 sm:right-8 sm:top-8"
            style={{ borderColor: 'rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)' }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
