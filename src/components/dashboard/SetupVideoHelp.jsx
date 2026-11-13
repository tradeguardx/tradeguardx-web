import { useCallback, useState } from 'react';
import { VideoLightbox } from '../common/WatchDemoCard';
import { HOW_TO_USE_VIDEO } from '../../lib/demoVideo';
import { trackCtaClick } from '../../lib/analytics';
import { sx } from './shell/sx';

/**
 * "How to use TradeGuardX" — during setup, on every step, in the same shape as
 * the WhatsApp strip below it (owner, 13 Nov 2026). The button plays the
 * walkthrough in an in-page lightbox; nothing loads until it is pressed.
 */
export default function SetupVideoHelp() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const play = () => {
    try {
      trackCtaClick('setup_how_to_video');
    } catch {
      /* analytics is best-effort */
    }
    setOpen(true);
  };

  return (
    <>
      <aside className="setup-video-help" style={sx('margin-top:26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface-2)')}>
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:rgba(255,0,0,.12);color:#ff3b3b')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
        </span>
        <span style={sx('flex:1;min-width:min(230px,100%)')}>
          <span style={sx('display:block;font-size:13.5px;font-weight:700;color:var(--ink)')}>How to use TradeGuardX</span>
          <span style={sx('display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--ink-3)')}>
            A 7-minute walkthrough of the whole setup — connect your exchange, set your rules, and see the kill switch work.
          </span>
        </span>
        <button
          type="button"
          onClick={play}
          style={sx('flex:none;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:10px 16px;border:0;border-radius:12px;background:#FF0000;color:#fff;font-size:13.5px;font-weight:800;white-space:nowrap;cursor:pointer')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          Watch video
        </button>
      </aside>
      {open && <VideoLightbox video={HOW_TO_USE_VIDEO} onClose={close} />}
    </>
  );
}
