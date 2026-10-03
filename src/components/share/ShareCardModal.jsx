import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ShareCardPreview from './ShareCardPreview';
import {
  DEFAULT_RULE_CHIPS,
  DOWNLOAD_LABEL,
  DOWNLOAD_MSG,
  SHARE_CARDS,
  SHARE_KINDS,
  segment,
  shareCaption,
  shareCard,
  shareTargets,
} from '../../lib/shareCards';

/**
 * The share modal, from reference/01_share-modal.template.html.
 *
 * Named ShareCardModal because components/share/ShareableCards.jsx already
 * exports a ShareModal — a generic wrapper around an arbitrary card. This is
 * the v2 modal from the handoff: four tabs, two formats, five destinations and
 * the two privacy toggles. The old one is untouched.
 *
 * On ≤700px it docks to the bottom of the screen, which is what
 * [data-tgx-modal] in the global stylesheet does. That is why the attribute is
 * on the overlay rather than a class — the rule already exists and is shared
 * with every other modal in the dashboard.
 */
export default function ShareCardModal({
  open,
  kind: initialKind = 'trade',
  onClose,
  onWatchReel,
  handle,
  referral = 'ARJUN14',
  rules = DEFAULT_RULE_CHIPS,
}) {
  const [kind, setKind] = useState(initialKind);
  const [fmt, setFmt] = useState('card');
  const [amounts, setAmounts] = useState(true);
  const [rulesOn, setRulesOn] = useState(true);
  const [done, setDone] = useState('');

  /*
   * Reopening from a different entry point must land on that entry point's tab
   * — the breach toast opens "This trade", the month card opens September —
   * but once open, the user owns the tabs.
   *
   * Adjusted during render rather than in an effect. An effect would paint the
   * previous card for one frame before correcting it, so opening from the
   * month card would flash the trade card first. This is React's documented
   * way to reset state when a prop changes, and it re-renders before anything
   * is committed to the screen.
   */
  const [prev, setPrev] = useState({ open, initialKind });
  if (open !== prev.open || initialKind !== prev.initialKind) {
    setPrev({ open, initialKind });
    if (open) {
      setKind(initialKind);
      setDone('');
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const card = useMemo(() => shareCard(kind, { amounts }), [kind, amounts]);
  const caption = useMemo(() => shareCaption(card, referral), [card, referral]);
  const targets = useMemo(() => shareTargets(fmt), [fmt]);

  // Any change clears the success line: it refers to the thing that was just
  // done, and leaving it up after the format changes makes it describe an
  // action nobody took.
  const change = useCallback((fn) => (...a) => { fn(...a); setDone(''); }, []);

  const copyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setDone('Caption copied');
    } catch {
      setDone('Could not copy — select the caption and copy it manually');
    }
  }, [caption]);

  if (!open) return null;

  const pillBg = card.pillRed ? 'rgba(239,68,68,.16)' : 'rgba(0,212,170,.16)';
  const pillFg = card.pillRed ? '#ff8a80' : '#3ff0c8';
  const label = (t) => ({ font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8, ...t });

  const body = (
    <div
      data-tgx-modal="1"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(3,5,10,.74)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 24, overflowY: 'auto' }}
    >
      <div style={{ width: '100%', maxWidth: 860, border: '1px solid var(--line)', borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden', animation: 'tgxSlide .18s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 18px/1.2 'Space Grotesk',sans-serif", letterSpacing: '-.02em' }}>Share your card</div>
            <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)' }}>Your rules held. Show people what that was worth.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--ink-3)', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div data-tgx-tabs="1" style={{ display: 'inline-flex', gap: 3, padding: 4, border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surface-2)', flexWrap: 'wrap' }}>
            {SHARE_KINDS.map((k) => {
              const s = segment(kind, 'kind', k);
              return (
                <button key={k} type="button" onClick={change(() => setKind(k))} style={{ padding: '7px 14px', border: 0, borderRadius: 999, background: s.bg, color: s.fg, boxShadow: s.sh, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                  {SHARE_CARDS[k].tab}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, padding: '18px 22px 22px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', minWidth: 0, display: 'grid', placeItems: 'center', padding: 22, borderRadius: 18, background: 'radial-gradient(ellipse at 30% 0%,rgba(0,212,170,.18),transparent 60%),#05070d' }}>
            <ShareCardPreview
              card={card}
              pillBg={pillBg}
              pillFg={pillFg}
              rulesOn={rulesOn}
              rules={rules}
              handle={handle}
              referral={referral}
              isReel={fmt === 'reel'}
              onWatchReel={() => onWatchReel?.(card.reelStory)}
            />
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={label()}>Format</div>
              <div style={{ display: 'flex', gap: 3, padding: 4, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)' }}>
                {[['card', 'Card · PNG'], ['reel', 'Reel · 18s video']].map(([v, text]) => {
                  const s = segment(fmt, 'fmt', v);
                  return (
                    <button key={v} type="button" onClick={change(() => setFmt(v))} style={{ flex: 1, padding: '9px 10px', border: 0, borderRadius: 9, background: s.bg, color: s.fg, boxShadow: s.sh, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      {text}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--ink-3)' }}>
                The reel is Guardy setting your rules, trading, and the guard stepping in, ending on this card. Best for Stories and Reels.
              </div>
            </div>

            <div>
              <div style={label()}>Share to</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
                {targets.map((t) => (
                  <button key={t.name} type="button" onClick={() => setDone(t.msg)} className="tgx-share-target" style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '10px 4px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 600, minHeight: 44, cursor: 'pointer' }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: t.bg, color: t.fg, display: 'grid', placeItems: 'center', boxShadow: '0 6px 14px -6px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.25)' }}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        {t.s && <path d={t.s} />}
                        {t.f && <path d={t.f} fill="currentColor" stroke="none" />}
                      </svg>
                    </span>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setDone(DOWNLOAD_MSG(fmt))} style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '11px 14px', border: 0, borderRadius: 11, background: 'var(--mint-solid)', color: '#02241d', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 19h14" /></svg>
                {DOWNLOAD_LABEL(fmt)}
              </button>
              <button type="button" onClick={copyCaption} style={{ flex: '1 1 150px', minHeight: 44, padding: '11px 14px', border: '1px solid var(--line-strong)', borderRadius: 11, background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Copy caption
              </button>
            </div>

            <div style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface-2)', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>{caption}</div>

            <div style={{ display: 'grid', gap: 2, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <Toggle
                on={rulesOn}
                onClick={change(() => setRulesOn((v) => !v))}
                title="Show my rules on the card"
                sub="The part people screenshot. It's what makes the number believable."
              />
              <Toggle
                on={amounts}
                onClick={change(() => setAmounts((v) => !v))}
                title="Show dollar amounts"
                sub="Turn off to share the story without your numbers."
              />
            </div>

            {done && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', border: '1px solid var(--mint-line)', borderRadius: 10, background: 'var(--mint-tint)', fontSize: 12.5, fontWeight: 600, color: 'var(--mint)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                {done}
              </div>
            )}

            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-faint)' }}>
              Every card carries your code <b style={{ color: 'var(--ink-2)' }}>{referral}</b>. Friends who join with it get 14 days free, and you earn a voucher.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? body : createPortal(body, document.body);
}

function Toggle({ on, onClick, title, sub }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', border: 0, background: 'transparent', color: 'var(--ink)', textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</span>
      </span>
      <span style={{ flex: 'none', position: 'relative', width: 38, height: 22, borderRadius: 999, background: on ? 'var(--mint-solid)' : 'var(--surface-3)', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.35)', transition: 'left .15s' }} />
      </span>
    </button>
  );
}
