import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import VenueMark from './VenueMark';
import { venueFor } from '../../lib/venues';
import { connectTutorialFor, formatLength, lessonFor } from '../../content/tutorials';
import { trackCtaClick } from '../../lib/analytics';
import TutorialPlayer from '../tutorials/TutorialPlayer';
import { sx } from './shell/sx';

/**
 * Choose the exchange. The first real decision in setup, and the only one in
 * it that is genuinely the user's — everything after is derived, pasted or
 * defaulted.
 *
 * Extracted because it is now rendered on the accounts page and as step one
 * of the setup flow. Two copies of the list of venues we support is two
 * places to forget a venue, and the one that gets forgotten is always the
 * newest — the one people are being told about.
 */
export default function VenuePicker({ venues, loading, onPick, columns = 'repeat(auto-fit,minmax(min(100%,190px),1fr))' }) {
  const [playing, setPlaying] = useState(null);
  if (loading && venues.length === 0) {
    return <p style={sx('margin:0;font-size:12.5px;color:var(--ink-3)')}>Loading exchanges…</p>;
  }

  return (
    <>
    <div style={sx('display:grid;gap:9px', { gridTemplateColumns: columns })}>
      {venues.map((pf) => {
        /* `planned` venues are shown rather than hidden: "is my exchange
           coming" is a question people ask before they sign up, and an empty
           space does not answer it. */
        const planned = pf.status === 'planned';
        /* "Watch setup" (24 Nov 2026): the exchange's own setup video, in a
           popup, for someone who wants to see the steps before choosing.
           Beside the card's button, not inside it: a button in a button is
           invalid and would also pick the exchange. */
        const video = planned ? null : connectTutorialFor(pf.brokerId);
        /* No video yet: the same footer row opens the written steps instead,
           so every card has its help in the same place (25 Nov 2026). */
        const lesson = planned || video ? null : lessonFor(pf.brokerId);
        /* The exchange's own caveat ("not MT4/MT5"), behind an ⓘ so every
           card reads as just its name (owner, 25 Nov 2026). */
        const info = planned ? null : venueFor(pf.brokerId)?.pickerNote ?? null;
        return (
          <div
            key={pf.brokerId}
            style={sx(
              'position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:13px;background:var(--surface-2)',
              planned ? { opacity: 0.5 } : {},
            )}
          >
          <button
            type="button"
            disabled={planned}
            onClick={() => onPick(pf.brokerId)}
            style={sx(
              'flex:1;display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer',
              planned ? { cursor: 'not-allowed' } : {},
            )}
          >
            <VenueMark slug={pf.brokerId} name={pf.name} size={30} radius={9} />
            <span style={sx('flex:1;min-width:0', info ? { paddingRight: 22 } : null)}>
              <span style={sx('display:block;font-size:13px;font-weight:600;line-height:30px')}>{pf.name}</span>
              {planned && <span style={sx('display:block;margin-top:-4px;font-size:11.5px;color:var(--ink-3)')}>Coming soon</span>}
            </span>
          </button>
          {info && <VenueInfo id={`venue-info-${pf.brokerId}`} name={pf.name} text={info} />}
          {video && (
            <button
              type="button"
              onClick={() => { try { trackCtaClick(`setup_picker_video_${pf.brokerId}`); } catch { /* best-effort */ } setPlaying(video); }}
              aria-label={`Watch how to set up ${pf.name}`}
              style={sx('display:flex;align-items:center;gap:7px;width:100%;padding:8px 13px;border:0;border-top:1px solid var(--line);border-radius:0 0 12px 12px;background:transparent;font-size:11.5px;font-weight:600;color:var(--ink-2);text-align:left;cursor:pointer')}
            >
              <svg width="16" height="12" viewBox="0 0 28 20" aria-hidden="true">
                <path fill="#FF0000" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
                <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" />
              </svg>
              Watch setup video
              <span style={sx('margin-left:auto;color:var(--ink-faint);font-weight:500')}>{formatLength(video.seconds)}{video.lang ? ` · ${video.lang}` : ''}</span>
            </button>
          )}
          {lesson && (
            <Link
              to={`/dashboard/tutorials#${lesson.key}`}
              onClick={() => { try { trackCtaClick(`setup_picker_steps_${pf.brokerId}`); } catch { /* best-effort */ } }}
              aria-label={`Read how to set up ${pf.name}`}
              style={sx('display:flex;align-items:center;gap:7px;width:100%;padding:8px 13px;border-top:1px solid var(--line);border-radius:0 0 12px 12px;font-size:11.5px;font-weight:600;color:var(--ink-2);text-decoration:none')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--ink-3)' }}>
                <path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z" /><path d="M8 9h6M8 13h6" />
              </svg>
              Setup steps
              <span style={sx('margin-left:auto;color:var(--ink-faint);font-weight:500')}>{lesson.steps?.length ?? ''} steps</span>
            </Link>
          )}
          </div>
        );
      })}
    </div>
    <p style={sx('margin:12px 0 0;font-size:12.5px;color:var(--ink-3)')}>
      Not sure yet? <Link to="/dashboard/tutorials" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Watch all tutorials →</Link>
    </p>
    {playing && <TutorialPlayer list={[playing]} index={0} setIndex={() => {}} onClose={() => setPlaying(null)} />}
    </>
  );
}

/**
 * ⓘ in a card's corner: the exchange's one caveat, on hover or focus (desktop)
 * and on tap (phone). Outside the card's pick button, so pressing it never
 * picks the exchange.
 */
function VenueInfo({ id, name, text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span
      ref={ref}
      style={sx('position:absolute;top:15px;right:10px')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`About ${name}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={sx('display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--ink-3);cursor:pointer')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" />
        </svg>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={sx('position:absolute;top:calc(100% + 6px);right:-4px;z-index:20;width:max-content;max-width:min(240px,70vw);padding:8px 10px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:12px;line-height:1.45;font-weight:500;color:var(--ink-2)')}
        >
          {text}
        </span>
      )}
    </span>
  );
}
