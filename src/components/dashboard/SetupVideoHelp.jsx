import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { VideoLightbox } from '../common/WatchDemoCard';
import { HOW_TO_USE_VIDEO, ownVideoFor } from '../../lib/demoVideo';
import { trackCtaClick } from '../../lib/analytics';
import { sx } from './shell/sx';

/** Hidden-strip memory, per browser. Storage can be missing or throw. */
function wasHidden(key) {
  if (!key) return false;
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function rememberHidden(key) {
  try { localStorage.setItem(key, '1'); } catch { /* still hidden for this visit */ }
}

/**
 * "How to use TradeGuardX" — during setup, on every step, in the same shape as
 * the WhatsApp strip below it (owner, 13 Nov 2026). The button plays the
 * walkthrough in an in-page lightbox; nothing loads until it is pressed.
 *
 * Also above Overview (same day). There it is seen every day by people long
 * past setup, so `hideKey` gives it a Hide button that is remembered.
 */
/*
 * `venue` (24 Nov 2026): once an exchange is chosen in setup, the strip plays
 * that exchange's own walkthrough when it has one (Exness, Shark): the exact
 * key screens the reader is about to see. Otherwise the general video.
 */
/*
 * `venueOnly` (24 Nov 2026): on a page about one exchange (an account card
 * with no key yet, the Connect key page) only that exchange's own video
 * belongs; the general one would be an answer to a different question, so the
 * strip renders nothing instead.
 */
export default function SetupVideoHelp({ top = 26, bottom = 0, hideKey = null, venue = null, venueOnly = false }) {
  const own = venue?.slug ? ownVideoFor(venue.slug) : null;
  const video = own ?? HOW_TO_USE_VIDEO;
  const heading = own ? `How to connect ${venue.name}` : 'How to use TradeGuardX';
  const blurb = own
    ? `${own.subtitle}${own.lang ? ` (${own.lang})` : ''}`
    : 'A 3-minute video: setting your rules, locking them, and a live trade that closes itself at the daily limit.';
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => wasHidden(hideKey));
  const close = useCallback(() => setOpen(false), []);
  const play = () => {
    try {
      trackCtaClick(own ? `setup_venue_video_${venue.slug}` : 'setup_how_to_video');
    } catch {
      /* analytics is best-effort */
    }
    setOpen(true);
  };

  if (hidden || (venueOnly && !own)) return null;
  const hide = () => {
    rememberHidden(hideKey);
    setHidden(true);
    try { trackCtaClick('setup_how_to_video_hidden'); } catch { /* best-effort */ }
  };

  return (
    <>
      <aside className={`setup-video-help${hideKey ? ' has-hide' : ''}`} style={sx(`position:relative;margin:${top}px 0 ${bottom}px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface-2)`)}>
        {hideKey && (
          <button
            type="button"
            onClick={hide}
            aria-label="Hide this"
            title="Hide"
            style={sx('position:absolute;top:8px;right:8px;display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--ink-faint);cursor:pointer')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
        <span aria-hidden style={sx('flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:rgba(255,0,0,.12);color:#ff3b3b')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
        </span>
        <span style={sx('flex:1;min-width:min(230px,100%)', hideKey ? { paddingRight: 28 } : null)}>
          <span style={sx('display:block;font-size:13.5px;font-weight:700;color:var(--ink)')}>{heading}</span>
          <span style={sx('display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--ink-3)')}>
            {blurb}{' '}
            <Link to={own ? `/dashboard/tutorials#${venue.slug.split(/[-_]/)[0]}` : '/dashboard/tutorials'} style={sx('color:var(--mint);font-weight:600;text-decoration:none;white-space:nowrap')}>All tutorials →</Link>
          </span>
        </span>
        <button
          type="button"
          className="svh-watch"
          onClick={play}
          style={sx('flex:none;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:10px 16px;border:0;border-radius:12px;background:#FF0000;color:#fff;font-size:13.5px;font-weight:800;white-space:nowrap;cursor:pointer')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          Watch video
        </button>
      </aside>
      {open && <VideoLightbox video={video} onClose={close} />}
    </>
  );
}
