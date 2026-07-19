import { useCallback, useEffect, useState } from 'react';
import { trackCtaClick } from '../../lib/analytics';
import { DEMO_VIDEO_ID, demoVideoPoster, demoVideoEmbedUrl } from '../../lib/demoVideo';

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

/**
 * Compact "watch the setup walkthrough" card for content pages (guides), with
 * the same in-page lightbox as the landing section — clicking never sends the
 * reader to youtube.com mid-article.
 *
 * The iframe mounts only on play, so readers who never watch pay nothing for the
 * YouTube player or its cookies.
 */
export default function WatchDemoCard({
  title = 'Watch the setup walkthrough',
  subtitle = 'The whole flow — API key, rules, and the kill switch firing — in about three minutes.',
  source = 'guides_demo_video',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [poster, setPoster] = useState(() => demoVideoPoster('maxres'));

  const close = useCallback(() => setOpen(false), []);

  const play = () => {
    try {
      trackCtaClick(source);
    } catch {
      /* analytics is best-effort */
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={play}
        className={`group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition-colors sm:gap-5 sm:p-4 ${className}`}
        style={{ borderColor: 'rgba(0,212,170,0.20)', background: 'rgba(0,212,170,0.04)' }}
      >
        <span className="relative block w-[132px] flex-shrink-0 overflow-hidden rounded-xl sm:w-[180px]">
          <span className="block aspect-video w-full bg-black">
            <img
              src={poster}
              onError={() => setPoster(demoVideoPoster('hq'))}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </span>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              <YouTubeGlyph className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </span>
        </span>

        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent, #00d4aa)' }}>
            Video guide
          </span>
          <span className="mt-1 block text-[15px] font-bold leading-snug text-white">{title}</span>
          <span className="mt-1 hidden text-[13px] leading-relaxed text-slate-400 sm:block">{subtitle}</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
          style={{ background: 'rgba(3,5,9,0.86)', backdropFilter: 'blur(6px)' }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="TradeGuardX setup walkthrough"
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border"
            style={{ borderColor: 'rgba(0,212,170,0.22)', background: '#05070c' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src={demoVideoEmbedUrl({ autoplay: true })}
                title="TradeGuardX setup walkthrough"
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
    </>
  );
}

export { DEMO_VIDEO_ID };
