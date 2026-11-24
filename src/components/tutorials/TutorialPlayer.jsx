import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatLength } from '../../content/tutorials';

/**
 * A tutorial in a popup, with sound: 16:9 for a normal video, 9:16 for a
 * Short. Previous / next walk `list` (the section it was opened from); Esc or
 * a click outside closes. The page behind does not scroll while it is open.
 *
 * Colours are fixed dark on purpose: a video sits best on near-black in both
 * the site and the dashboard's light theme.
 */
export default function TutorialPlayer({ list, index, setIndex, onClose }) {
  const t = list[index];
  const last = list.length - 1;
  const go = useCallback((step) => setIndex(Math.min(last, Math.max(0, index + step))), [index, last, setIndex]);
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!t) return null;
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
  if (t.start) params.set('start', String(t.start));

  // Width that fits the screen height for each shape.
  const width = t.short ? 'min(400px, calc((100dvh - 160px) * 9 / 16))' : 'min(1000px, calc((100dvh - 160px) * 16 / 9))';

  const arrow = (dir) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); go(dir); }}
      disabled={dir < 0 ? index === 0 : index === last}
      aria-label={dir < 0 ? 'Previous video' : 'Next video'}
      style={{
        display: list.length > 1 ? 'grid' : 'none', placeItems: 'center', width: 44, height: 44, flex: 'none',
        border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
        opacity: (dir < 0 ? index === 0 : index === last) ? 0.25 : 1,
      }}
      className="tp-arrow"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 16, background: 'rgba(3,5,9,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <style>{'@media (max-width: 640px){.tp-arrow{display:none !important}}'}</style>
      {arrow(-1)}
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            <svg width="21" height="15" viewBox="0 0 28 20" aria-hidden="true" style={{ flex: 'none' }}>
              <path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
              <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700 }}>{t.title}</span>
            <span style={{ flex: 'none', fontSize: 12, color: '#94a3b8' }}>
              {formatLength(t.seconds)}{t.lang ? ` · ${t.lang}` : ''}{list.length > 1 ? ` · ${index + 1}/${list.length}` : ''}
            </span>
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close video"
            style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flex: 'none', border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: t.short ? '9 / 16' : '16 / 9', overflow: 'hidden', borderRadius: 16, background: '#000' }}>
          <iframe
            key={t.id}
            src={`https://www.youtube-nocookie.com/embed/${t.id}?${params.toString()}`}
            title={t.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            frameBorder="0"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
        {list.length > 1 && (
          <div className="tp-phone-nav" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <style>{'@media (min-width: 641px){.tp-phone-nav{display:none !important}}'}</style>
            <button type="button" onClick={() => go(-1)} disabled={index === 0} style={{ padding: '10px 16px', border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, opacity: index === 0 ? 0.3 : 1 }}>← Previous</button>
            <button type="button" onClick={() => go(1)} disabled={index === last} style={{ padding: '10px 16px', border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, opacity: index === last ? 0.3 : 1 }}>Next →</button>
          </div>
        )}
      </div>
      {arrow(1)}
    </div>,
    document.body,
  );
}
