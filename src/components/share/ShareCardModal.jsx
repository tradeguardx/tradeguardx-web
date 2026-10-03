import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import ShareCardPreview from './ShareCardPreview';
import ShareReel from './reel/ShareReel';
import { STORIES } from '../../lib/reelStories';
import { moneyFns } from '../../lib/shareData';
import { useThemeScope } from '../../lib/themeScope';
import {
  DOWNLOAD_LABEL,
  EXPORT,
  SHARE_CARDS,
  SHARE_KINDS,
  exportFileName,
  segment,
  shareCaption,
  shareCard,
  shareIntent,
  SHARE_SIZE,
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
  handle,
  referral = null,
  /** No demo default — see the note on ShareCardPreview's `rules`. */
  rules = [],
  /** {k,v,c} blocks for the reel's rail — a different shape from `rules`. */
  ruleBlocks = null,
  /** This account's real cards, from shareBuild.js. Omitted only by the
      standalone preview page, which falls back to the handoff's demo data. */
  cards = null,
  /** Which tabs have enough real activity to stand behind. */
  kinds = SHARE_KINDS,
  /** This account's reel stories, keyed like the cards. Omitted by the
      preview page, which plays the handoff's demo reels instead. */
  stories = null,
  currency = 'USD',
}) {
  const [kind, setKind] = useState(initialKind);
  const [fmt, setFmt] = useState('card');
  const [amounts, setAmounts] = useState(true);
  const [rulesOn, setRulesOn] = useState(true);
  // { text, ok } — `ok` false is a plain note, not a green tick. The reel has
  // no video export yet, and dressing that up as a success was the one thing
  // the simulated version of this modal did that we cannot keep.
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef(null);
  const scopeRef = useThemeScope();

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
      setDone(null);
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

  const { mask, sym } = useMemo(() => moneyFns(currency), [currency]);
  const card = useMemo(() => shareCard(kind, { amounts, cards, mask, sym }), [kind, amounts, cards, mask, sym]);
  const caption = useMemo(() => shareCaption(card, referral), [card, referral]);
  const targets = useMemo(() => shareTargets(fmt), [fmt]);

  // Only the stories that exist. `week` and `month` have cards but no reel
  // yet, and ShareReel falls back to the trade story for an unknown id — so
  // without this the Week tab would silently play someone else's trade.
  const reelStory = (stories ?? STORIES)[card.reelStory] ?? null;
  const reelReady = Boolean(reelStory);

  /*
   * Why there is no reel, in the user's terms.
   *
   * There is one reason left for a trade, and it is not the one this used to
   * give. Every trade now gets a reel — a guard close gets the "it kept
   * going without me" story, an ordinary close gets its own run — so the only
   * way to arrive here is that the chart itself could not be drawn, because
   * Binance does not list the venue's symbol. Saying "you closed this one
   * yourself" was describing a restriction that no longer exists.
   */
  const reelWhy = reelReady
    ? ''
    : kind === 'trade'
      ? 'No reel for this trade: we could not price its chart — the venue’s symbol is not one we can pull candles for, and the chart is what the reel animates. The card is ready.'
      : kind === 'week'
        ? 'No reel for this week yet — it needs at least two trading days. This card shares as a PNG.'
        : `There is no reel for ${(cards?.[kind] ?? SHARE_CARDS[kind]).tab.toLowerCase()} — it would need an intraday equity curve we do not record. This card shares as a PNG.`;
  // Reel format can be previewed but not yet exported or posted.
  const noVideo = fmt === 'reel';

  // Any change clears the success line: it refers to the thing that was just
  // done, and leaving it up after the format changes makes it describe an
  // action nobody took.
  const change = useCallback((fn) => (...a) => { fn(...a); setDone(null); }, []);

  const copyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setDone({ text: 'Caption copied', ok: true });
    } catch {
      setDone({ text: 'Could not copy — select the caption below and copy it manually', ok: false });
    }
  }, [caption]);

  /*
   * The PNG is the off-screen copy of ShareCardPreview below, rendered at
   * EXPORT.width and scaled by EXPORT.pixelRatio — 432 × 2.5 = 1080, so the
   * file is exactly the 1080×1350 the handoff asks for. It is a second mount
   * of the same component rather than a capture of the visible one because the
   * visible one is fluid: on a phone it is ~280px wide and the export would
   * inherit that width, and forcing the on-screen card to 432px to export it
   * would make the modal scroll sideways mid-share.
   */
  const renderFile = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error('no export node');
    const dataUrl = await toPng(node, {
      pixelRatio: EXPORT.pixelRatio,
      cacheBust: true,
      backgroundColor: EXPORT.bg,
    });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], exportFileName(kind), { type: 'image/png' });
  }, [kind]);

  const saveFile = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    // Revoking immediately cancels the download in Safari.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const download = useCallback(async () => {
    if (fmt === 'reel') {
      setDone({ text: 'The reel has no downloadable video yet — switch to Card · PNG.', ok: false });
      return;
    }
    setBusy(true);
    try {
      saveFile(await renderFile());
      setDone({ text: `Saved ${exportFileName(kind)} (${SHARE_SIZE.w} × ${SHARE_SIZE.h})`, ok: true });
    } catch {
      setDone({ text: 'Could not build the image. Try again, or screenshot the card.', ok: false });
    } finally {
      setBusy(false);
    }
  }, [fmt, kind, renderFile, saveFile]);

  /*
   * One button, two worlds. On a phone the share sheet takes the actual file,
   * which is the only path where the image and the caption travel together —
   * so the destination the user tapped is a hint, not a route, and the sheet
   * decides. On a desktop browser no web intent accepts an image, so we save
   * the PNG and open the composer with the caption, and say both happened.
   *
   * The capability is probed with an empty PNG rather than the real one so the
   * decision is made synchronously, inside the click. Building the card takes a
   * few hundred milliseconds, and a window.open() after that await is no longer
   * part of a user gesture — every popup blocker eats it. The composer is
   * therefore opened first and the file built afterwards.
   */
  const shareTo = useCallback(async (name) => {
    if (fmt === 'reel') {
      setDone({ text: 'The reel cannot be posted from here yet — switch to Card · PNG.', ok: false });
      return;
    }

    let canShareFiles = false;
    try {
      canShareFiles = !!navigator.canShare?.({ files: [new File([new Blob()], 'probe.png', { type: 'image/png' })] });
    } catch { canShareFiles = false; }

    const intent = canShareFiles ? null : shareIntent(name, { caption, referral });
    const win = intent && !intent.manual ? window.open(intent.url, '_blank', 'noopener,noreferrer') : null;

    setBusy(true);
    try {
      const file = await renderFile();

      if (canShareFiles) {
        await navigator.share({ files: [file], text: caption });
        setDone({ text: 'Shared', ok: true });
        return;
      }

      saveFile(file);
      if (intent.manual) {
        try { await navigator.clipboard.writeText(caption); } catch { /* the caption is on screen anyway */ }
        setDone({ text: `Saved the PNG and copied the caption — ${name} only takes an upload, so add it there.`, ok: true });
      } else if (win) {
        setDone({ text: `Opened ${name} with your caption. Attach the PNG we just saved — a web post cannot carry it for us.`, ok: true });
      } else {
        setDone({ text: `Saved the PNG. ${name} did not open — allow pop-ups for this site, or copy the caption and post it yourself.`, ok: false });
      }
    } catch (err) {
      // The user backing out of the share sheet is not a failure.
      if (err?.name === 'AbortError') setDone(null);
      else setDone({ text: 'Could not build the image. Try again, or screenshot the card.', ok: false });
    } finally {
      setBusy(false);
    }
  }, [caption, fmt, referral, renderFile, saveFile]);

  if (!open) return null;

  const label = (t) => ({ font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8, ...t });

  const body = (
    <div
      data-tgx-modal="1"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      /*
       * flex + margin:auto rather than grid + place-items:center. A centred
       * grid item that is taller than its container overflows equally in both
       * directions, and the half above the top edge cannot be scrolled to —
       * with the reel playing this modal is tall enough for that to eat its
       * own header. Auto margins centre when there is room and collapse to
       * zero when there is not.
       */
      style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(3,5,10,.74)', backdropFilter: 'blur(8px)', display: 'flex', padding: 24, overflowY: 'auto' }}
    >
      <div style={{ margin: 'auto', width: '100%', maxWidth: 860, border: '1px solid var(--line)', borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden', animation: 'tgxSlide .18s ease-out' }}>
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
            {kinds.map((k) => {
              const s = segment(kind, 'kind', k);
              return (
                <button key={k} type="button" onClick={change(() => { setKind(k); if (!(stories ?? STORIES)[(cards?.[k] ?? SHARE_CARDS[k]).reelStory]) setFmt('card'); })} style={{ padding: '7px 14px', border: 0, borderRadius: 999, background: s.bg, color: s.fg, boxShadow: s.sh, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                  {(cards?.[k] ?? SHARE_CARDS[k]).tab}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, padding: '18px 22px 22px', flexWrap: 'wrap' }}>
          {/* Sticky so the card stays in view while the controls scroll past
              it — the preview is the thing being judged, and scrolling to the
              toggles used to take it off screen. */}
          <div data-share-preview="1" style={{ flex: '1 1 320px', minWidth: 0, position: 'sticky', top: 0, display: 'grid', placeItems: 'center', padding: 18, borderRadius: 18, background: 'radial-gradient(ellipse at 30% 0%,rgba(0,212,170,.18),transparent 60%),#05070d' }}>
            {fmt === 'reel' && reelReady ? (
              /*
               * The reel plays here, in the slot the card was in. The handoff's
               * overlay linked out to a reel page, which meant pressing play
               * closed the modal and left the dashboard — you lost your tab,
               * your toggles and your place, to watch 18 seconds. It is the
               * same component that exports to MP4, so nothing is lost by
               * showing it inline. Tap it to pause.
               */
              <div style={{ height: 'min(56vh, 500px)', width: 'auto', maxWidth: '100%', aspectRatio: '9/16', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px -25px rgba(0,0,0,.9)' }}>
                <ShareReel story={card.reelStory} data={reelStory} id={card.tradeUid ?? card.reelStory} handle={handle} referral={referral} rules={rulesOn ? rules : []} ruleBlocks={ruleBlocks} sym={sym} venue={card.venue} />
              </div>
            ) : (
              <PreviewCanvas
                card={card}
                rulesOn={rulesOn}
                rules={rules}
                handle={handle}
                referral={referral}
              />
            )}
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={label()}>Format</div>
              <div style={{ display: 'flex', gap: 3, padding: 4, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)' }}>
                {[['card', 'Card · PNG'], ['reel', 'Reel · 18s video']].map(([v, text]) => {
                  const s = segment(fmt, 'fmt', v);
                  const off = v === 'reel' && !reelReady;
                  return (
                    <button key={v} type="button" disabled={off} onClick={change(() => setFmt(v))} style={{ flex: 1, padding: '9px 10px', border: 0, borderRadius: 9, background: s.bg, color: s.fg, boxShadow: s.sh, fontSize: 12.5, fontWeight: 600, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.45 : 1 }}>
                      {text}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--ink-3)' }}>
                {reelReady
                  ? 'The reel is Guardy setting your rules, trading, and the guard stepping in, ending on this card. Best for Stories and Reels. It plays here — tap to pause.'
                  : reelWhy}
              </div>
            </div>

            <div>
              <div style={label()}>Share to</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
                {targets.map((t) => (
                  <button key={t.name} type="button" onClick={() => shareTo(t.name)} disabled={busy || noVideo} className="tgx-share-target" aria-disabled={busy || noVideo} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '10px 4px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 600, minHeight: 44, cursor: busy || noVideo ? 'not-allowed' : 'pointer', opacity: noVideo ? 0.45 : 1 }}>
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
              {/* Disabled rather than labelled "Download MP4" and then
                  apologising on click. The reel has no video export yet, and a
                  button that names a file it cannot write is the one thing the
                  simulated version of this modal did that we cannot keep. */}
              <button type="button" onClick={download} disabled={busy || noVideo} style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '11px 14px', border: 0, borderRadius: 11, background: 'var(--mint-solid)', color: '#02241d', fontSize: 13, fontWeight: 700, cursor: busy ? 'progress' : noVideo ? 'not-allowed' : 'pointer', opacity: busy ? 0.75 : noVideo ? 0.45 : 1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 19h14" /></svg>
                {busy ? 'Building…' : DOWNLOAD_LABEL(fmt)}
              </button>
              <button type="button" onClick={copyCaption} style={{ flex: '1 1 150px', minHeight: 44, padding: '11px 14px', border: '1px solid var(--line-strong)', borderRadius: 11, background: 'var(--surface-2)', color: 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Copy caption
              </button>
            </div>
            {noVideo && (
              <div style={{ marginTop: -8, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' }}>
                Saving the reel as a video is not wired up yet — switch to <b style={{ color: 'var(--ink-2)' }}>Card · PNG</b> to download or post this one.
              </div>
            )}

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
                disabled={fmt === 'reel'}
                title="Show dollar amounts"
                sub={fmt === 'reel'
                  ? 'The reel quotes its figures as it animates — hiding them is card-only for now.'
                  : 'Turn off to share the story without your numbers.'}
              />
            </div>

            {done && (
              <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', border: `1px solid ${done.ok ? 'var(--mint-line)' : 'var(--line-strong)'}`, borderRadius: 10, background: done.ok ? 'var(--mint-tint)' : 'var(--surface-2)', fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: done.ok ? 'var(--mint)' : 'var(--ink-2)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}>
                  {done.ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>}
                </svg>
                {done.text}
              </div>
            )}

            {referral && (
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-faint)' }}>
                Every card carries your code <b style={{ color: 'var(--ink-2)' }}>{referral}</b>. Friends who join with it get 14 days free, and you earn a voucher.
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        The thing that actually becomes the PNG. Off-screen rather than
        display:none — html-to-image measures layout, and a hidden subtree has
        none. aria-hidden and inert keep it out of the reading order and the
        tab order; it is a render target, not content.
      */}
      <div aria-hidden="true" inert={true} style={{ position: 'fixed', top: 0, left: -99999, pointerEvents: 'none', opacity: 0 }}>
        <CardCanvas
          forwardRef={exportRef}
          card={card}
          rulesOn={rulesOn}
          rules={rules}
          handle={handle}
          referral={referral}
        />
      </div>
    </div>
  );

  // The wrapper is what useThemeScope writes the token attributes onto. It
  // has no styles of its own: the overlay inside it is position:fixed, so an
  // empty block element around it costs nothing.
  const scoped = <div ref={scopeRef}>{body}</div>;

  return typeof document === 'undefined' ? scoped : createPortal(scoped, document.body);
}

/**
 * The card on its export canvas, at design size.
 *
 * ShareCardPreview is a FIXED-TYPOGRAPHY composition: every font size, radius
 * and gap inside it is in absolute pixels, tuned for a 432px card. Let it get
 * narrower and it does not shrink, it reflows — "Delta Exchange" wraps onto two
 * lines and clips, the hero figure loses its decimals off the right edge, and
 * the rule chips stack. Which is exactly what the Story preview did.
 *
 * So the card is never rendered at anything but its design width. Fitting it
 * into a smaller box is a transform, the same way ShareReel fits its 1080x1920
 * stage into whatever space it is given. One composition, one scale factor,
 * and the preview is the artefact.
 */
const DESIGN_W = EXPORT.width;

// 4:5, the one shape. See SHARE_SIZE in shareCards.js for why there is only one.
const DESIGN_H = Math.round((DESIGN_W * SHARE_SIZE.h) / SHARE_SIZE.w);

function CardCanvas({ card, rulesOn, rules, handle, referral, forwardRef }) {
  return (
    <div ref={forwardRef} style={{ width: DESIGN_W, height: DESIGN_H, background: EXPORT.bg }}>
      <ShareCardPreview
        card={card}
        rulesOn={rulesOn}
        rules={rules}
        handle={handle}
        referral={referral}
        width={DESIGN_W}
      />
    </div>
  );
}

/**
 * The canvas at the largest size the panel can hold, with nothing left over.
 *
 * The host used to be a fixed-height box with the canvas centred inside it, so
 * whenever the panel's WIDTH was the binding constraint — a Square or a Post in
 * a narrow column — the leftover height showed as a band of empty panel under
 * the card. Measuring the width and deriving the height from it means the host
 * IS the canvas: there is no leftover to show.
 */
const PREVIEW_MAX_VH = 0.62;
const PREVIEW_MAX_PX = 560;

function PreviewCanvas(props) {
  const designH = DESIGN_H;

  const probeRef = useRef(null);
  const [avail, setAvail] = useState({ w: 0, h: PREVIEW_MAX_PX });

  useLayoutEffect(() => {
    const el = probeRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => {
      const w = el.getBoundingClientRect().width;
      const h = Math.min(PREVIEW_MAX_PX, (window.innerHeight || 900) * PREVIEW_MAX_VH);
      if (w > 0) setAvail({ w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  const scale = avail.w > 0 ? Math.min(avail.w / DESIGN_W, avail.h / designH) : 0;

  return (
    <>
      {/* Zero-height probe: it only ever reports the column's width. */}
      <div ref={probeRef} style={{ width: '100%', height: 0 }} />
      {scale > 0 && (
        <div style={{ width: DESIGN_W * scale, height: designH * scale, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 70px -25px rgba(0,0,0,.9)' }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            <CardCanvas {...props} />
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({ on, onClick, title, sub, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', border: 0, background: 'transparent', color: 'var(--ink)', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
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
