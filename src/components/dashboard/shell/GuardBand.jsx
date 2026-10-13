import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { useAuth } from '../../../context/AuthContext';
import { bandMessagesOf } from '../../../lib/messages';
import NoticeCard from './NoticeCard';

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
  // Rules during setup carries its own setup card, with the same ask.
  if (life?.setup && pathname.startsWith('/dashboard/rules')) return null;

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

  const dismiss = top.dismissible
    ? () => {
        const v = { id: keyOf(top), until: dismissUntil(top.dismissDays ?? 1) };
        try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(v)); } catch { /* still hides for this visit */ }
        setDismissed(v);
      }
    : undefined;

  return (
    <NoticeCard
      data-tgx-band="1"
      data-band-id={top.id}
      tone={top.tone === 'red' ? 'red' : 'mint'}
      eyebrow={life?.setup ? life.plan : null}
      title={top.title}
      body={top.body}
      cta={top.to ? { label: top.cta, to: top.to } : null}
      onDismiss={dismiss}
      style={{ marginBottom: 20 }}
    />
  );
}
