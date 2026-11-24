import { useCallback, useState } from 'react';
import { VideoLightbox } from '../common/WatchDemoCard';
import { LESSONS, dashVideoOf, formatLength } from '../../content/tutorials';
import { trackCtaClick } from '../../lib/analytics';
import { sx } from '../dashboard/shell/sx';

/**
 * "▶ Watch (1:32)" — a tutorial video, inline, at the exact spot in the
 * dashboard where its question comes up (24 Nov 2026): the kill switch video
 * beside "switch on the rules you want", rule lock beside the rule lock, the
 * safety video beside the key form. Plays in the same popup as everywhere
 * else; nothing loads until it is pressed. Renders nothing for a lesson
 * without a video.
 */
export default function VideoLink({ lesson, label, source, style, asButton = false }) {
  const l = LESSONS.find((x) => x.key === lesson);
  const v = dashVideoOf(l);
  const video = v ? { id: v.id, start: v.start, lang: v.lang, short: v.short, title: l.title } : null;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!l || !video) return null;

  const play = () => {
    try { trackCtaClick(`dash_video_${source ?? lesson}`); } catch { /* best-effort */ }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={play}
        style={sx(
          asButton
            ? 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer'
            : 'display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:none;color:var(--ink-2);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-align:left',
          style,
        )}
      >
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#FF0000;color:#fff')}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
        </span>
        <span style={sx(asButton ? '' : 'text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line-strong)')}>{label ?? l.title}</span>
        <span style={sx('color:var(--ink-faint);font-weight:500')}>{formatLength(v.seconds)}{v.lang ? ` · ${v.lang}` : ''}</span>
      </button>
      {open && <VideoLightbox video={video} title={l.title} onClose={close} />}
    </>
  );
}
