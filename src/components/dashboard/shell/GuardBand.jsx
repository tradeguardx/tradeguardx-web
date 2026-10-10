import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { useAuth } from '../../../context/AuthContext';
import { bandMessagesOf } from '../../../lib/messages';
import { sx } from './sx';

/**
 * The dashboard's one band.
 *
 * What it says comes from lib/messages.js, which ranks every possible
 * message — plan off, setup, a locked account, a key that cannot act, no
 * rules, a plan ending. The band shows the single most important one.
 * One banner, one action: a second line under it was a second alarm, and
 * the facts it repeated were already elsewhere on the page.
 */
const DISMISS_KEY = 'tgx.band.dismissed';

/** { id, until } — the message dismissed, and when it comes back. */
function readDismissed() {
  try {
    const v = JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? 'null');
    return v && typeof v.id === 'string' && typeof v.until === 'number' ? v : null;
  } catch { return null; }
}

/* t6: hidden for the rest of the day. pc: hidden for 3 days. Each then
   returns until the date it is about (spec §t6, §pc). */
function dismissUntil(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export default function GuardBand() {
  const { selected, life, now } = useGuard();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);

  // Plan & billing explains the state itself; a band above it repeats it.
  if (pathname.startsWith('/dashboard/account/billing')) return null;

  /*
   * The band exists to point somewhere. On the page it points AT it is a
   * louder copy of what is already on screen, so a message whose CTA is this
   * page drops out and the next one takes its place.
   */
  const elsewhere = (to) => Boolean(to) && !pathname.startsWith(to.split('?')[0]);
  // Dismissed for that exact sentence only (a new date is a new message),
  // and only until its window runs out.
  const keyOf = (m) => `${m.id}:${m.title}`;
  const hidden = (m) => m.dismissible && dismissed?.id === keyOf(m) && now < dismissed.until;

  const messages = bandMessagesOf({ life, selected, user }).filter((m) => elsewhere(m.to) && !hidden(m));
  if (messages.length === 0) return null;
  const [top] = messages;

  const tone = top.tone;
  const fg = `var(--${tone})`;
  const warn = tone === 'red' || tone === 'amber';

  return (
    /*
     * NOT data-tgx-stack. That shared rule stacks every child and gives each
     * width:100%, which on a phone stretched the 17px warning triangle across
     * the band — reading as a centred icon above left-aligned text — and blew
     * the link up into a full-width button. The icon belongs beside the title,
     * so it is nested with it and the band handles its own stacking.
     */
    <div data-tgx-band="1" data-band-id={top.id} className="guard-band" role="status" style={sx('align-items:flex-start;gap:12px;padding:12px 24px', { borderTop: `1px solid var(--${tone}-line)`, background: `var(--${tone}-tint)` })}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:flex-start;gap:10px')}>
        {warn ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none', marginTop: 2 }}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9.5v4M12 16.4h.01" /></svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
        )}
        <div style={sx('flex:1;min-width:0')}>
          <div style={sx('font-size:13.5px;font-weight:700;line-height:1.35', { color: warn ? fg : 'var(--ink)' })}>{top.title}</div>
          <div style={sx('font-size:12.5px;line-height:1.5;color:var(--ink-2);margin-top:3px;max-width:96ch')}>{top.body}</div>
        </div>
      </div>
      <Link className="guard-band__cta" to={top.to} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap', { border: `1px solid var(--${tone}-line)`, color: fg })}>{top.cta}</Link>
      {top.dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            const v = { id: keyOf(top), until: dismissUntil(top.dismissDays ?? 1) };
            try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(v)); } catch { /* still hides for this visit */ }
            setDismissed(v);
          }}
          style={sx('flex:none;display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--ink-3)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}
