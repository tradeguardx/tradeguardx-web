import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { shareIntent, shareLink, shareTargets } from '../../lib/shareCards';
import { sx } from '../dashboard/shell/sx';
import { getUserZone } from '../../lib/userZone';
import RevengeShareCard from './RevengeShareCard';
import { EXPORT_STYLE_PROPS, shareCaption } from './revengeShare';

const PREVIEW_SCALE = 0.7; // 432 × 540 → 302 × 378: fits a phone with room to spare
const FILE = 'tradeguardx-revenge-score.png';

/**
 * Share the revenge score: the card, two privacy switches, five destinations
 * and a download — the same plumbing as the trade share modal (PNG via
 * html-to-image, the native share sheet on a phone, a prefilled intent plus a
 * saved PNG on a desktop), around a different card.
 *
 * The trader's name is always on the card — it is their score, posted as
 * them. Money is OFF by default: a public post should not publish an
 * account's size by accident.
 */
export default function RevengeShareModal({ open, onClose, report, handle = null, referral = null }) {
  const [variant, setVariant] = useState('chaser');
  const [amounts, setAmounts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const exportRef = useRef(null);
  const link = shareLink(referral);
  const caption = useMemo(() => (report ? shareCaption(report, link.replace(/^https:\/\//, '')) : ''), [report, link]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const renderFile = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error('no export node');
    const dataUrl = await toPng(node, { pixelRatio: 2.5, cacheBust: true, backgroundColor: '#080a14', includeStyleProperties: EXPORT_STYLE_PROPS });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], FILE, { type: 'image/png' });
  }, []);

  const saveFile = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000); // revoking at once cancels Safari's download
  }, []);

  const download = useCallback(async () => {
    setBusy(true);
    try {
      saveFile(await renderFile());
      setDone({ text: `Saved ${FILE} (1080 × 1350)`, ok: true });
    } catch {
      setDone({ text: 'Could not build the image. Try again, or screenshot the card.', ok: false });
    } finally { setBusy(false); }
  }, [renderFile, saveFile]);

  /* Same decision as the trade share modal: the capability is probed inside
     the click (a popup opened after the image builds is no longer a user
     gesture), the phone's share sheet takes the real file, and on a desktop
     we save the PNG and open the composer with the caption. */
  const shareTo = useCallback(async (name) => {
    let canShareFiles = false;
    try { canShareFiles = !!navigator.canShare?.({ files: [new File([new Blob()], 'probe.png', { type: 'image/png' })] }); } catch { canShareFiles = false; }
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
        try { await navigator.clipboard.writeText(caption); } catch { /* the caption is on screen */ }
        setDone({ text: `Saved the PNG and copied the caption — ${name} only takes an upload, so add it there.`, ok: true });
      } else if (win) {
        setDone({ text: `Opened ${name} with your caption. Attach the PNG we just saved.`, ok: true });
      } else {
        setDone({ text: `Saved the PNG. ${name} did not open — allow pop-ups, or copy the caption and post it yourself.`, ok: false });
      }
    } catch (err) {
      if (err?.name === 'AbortError') setDone(null);
      else setDone({ text: 'Could not build the image. Try again, or screenshot the card.', ok: false });
    } finally { setBusy(false); }
  }, [caption, referral, renderFile, saveFile]);

  const copyCaption = useCallback(async () => {
    try { await navigator.clipboard.writeText(caption); setDone({ text: 'Caption copied', ok: true }); } catch { setDone({ text: 'Could not copy — select the caption and copy it', ok: false }); }
  }, [caption]);

  if (!open || !report) return null;
  // Into the dashboard root, so the theme tokens reach the panel (it opens on
  // a click, so the root is always mounted by then).
  const host = document.querySelector('[data-tgx]') ?? document.body;
  const end = report.period?.to ? new Date(report.period.to) : new Date();
  const monthLabel = end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: getUserZone() }).toUpperCase();
  const card = { variant, report, monthLabel, amounts, handle };

  return createPortal(
    <div data-tgx-modal="1" role="dialog" aria-modal="true" aria-label="Share your revenge score" onClick={onClose} style={sx('position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(3,5,10,.72);backdrop-filter:blur(4px)')}>
      <div onClick={(e) => e.stopPropagation()} style={sx('position:relative;width:100%;max-width:780px;max-height:calc(100vh - 32px);overflow:auto;border-radius:20px;border:1px solid var(--line);background:var(--surface);color:var(--ink);box-shadow:var(--shadow-pop)')}>
        <button type="button" aria-label="Close" onClick={onClose} style={sx('position:absolute;top:12px;right:12px;z-index:1;display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:10px;background:var(--surface-2);color:var(--ink-2);cursor:pointer')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="rv-share" style={sx('display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px;padding:24px')}>
          {/* The card, as it will look */}
          <div data-share-preview="1" style={sx('display:grid;place-items:center;padding:14px;border-radius:16px;background:var(--surface-2)')}>
            <div style={{ width: 432 * PREVIEW_SCALE, height: 540 * PREVIEW_SCALE, borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 50px -20px rgba(0,0,0,.6)' }}>
              <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}><RevengeShareCard {...card} /></div>
            </div>
          </div>

          <div style={sx('min-width:0;display:flex;flex-direction:column;gap:16px')}>
            <div>
              <h2 style={sx("margin:0;font:600 20px/1.25 'Space Grotesk',sans-serif;letter-spacing:-.02em")}>Share your revenge score</h2>
              <p style={sx('margin:5px 0 0;font-size:13px;line-height:1.5;color:var(--ink-3)')}>Every trader has one. Most never look. Post yours and ask them theirs.</p>
            </div>

            <div role="radiogroup" aria-label="Design" style={sx('display:flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)')}>
              {[['chaser', 'The character'], ['meter', 'Tilt meter']].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={variant === k} onClick={() => { setVariant(k); setDone(null); }} style={sx('flex:1;padding:8px 10px;border:0;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer', variant === k ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--ink-3)' })}>{label}</button>
              ))}
            </div>

            <div style={sx('display:grid;gap:8px')}>
              <Toggle on={amounts} onChange={setAmounts} label="Show ₹ amounts" sub="Off: only percentages and counts" />
            </div>

            <div>
              <div style={sx("font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px")}>Share to</div>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                {shareTargets('card').map((t) => (
                  <button key={t.name} type="button" disabled={busy} onClick={() => shareTo(t.name)} aria-label={`Share to ${t.name}`} title={t.name} style={sx('display:grid;place-items:center;width:46px;height:46px;border:0;border-radius:13px;cursor:pointer', { background: t.bg, color: t.fg, opacity: busy ? 0.6 : 1 })}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {t.s && <path d={t.s} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />}
                      {t.f && <path d={t.f} fill="currentColor" />}
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" disabled={busy} onClick={download} style={sx('min-height:46px;padding:11px 18px;border:0;border-radius:12px;background:var(--mint-solid);color:var(--on-mint);font-size:14px;font-weight:800;cursor:pointer', { opacity: busy ? 0.6 : 1 })}>
              {busy ? 'Building the image…' : 'Download PNG'}
            </button>

            <div style={sx('padding:11px 13px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2)')}>
              <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:6px')}>
                <span style={sx("flex:1;font:600 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)")}>Caption</span>
                <button type="button" onClick={copyCaption} style={sx('padding:0;border:0;background:none;color:var(--mint);font-size:12px;font-weight:700;cursor:pointer')}>Copy</button>
              </div>
              <p style={sx('margin:0;font-size:12.5px;line-height:1.5;color:var(--ink-2);user-select:all')}>{caption}</p>
            </div>

            {done && <p role="status" style={sx('margin:0;font-size:12.5px;line-height:1.45', { color: done.ok ? 'var(--mint)' : 'var(--red)' })}>{done.text}</p>}
          </div>
        </div>
      </div>

      {/* The file is built from this full-size copy: the preview is scaled. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <RevengeShareCard ref={exportRef} {...card} />
      </div>
    </div>,
    host,
  );
}

function Toggle({ on, onChange, label, sub }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} style={sx('display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);text-align:left;cursor:pointer')}>
      <span style={sx('flex:1;min-width:0')}>
        <span style={sx('display:block;font-size:13px;font-weight:700')}>{label}</span>
        {sub && <span style={sx('display:block;margin-top:2px;font-size:11.5px;color:var(--ink-3)')}>{sub}</span>}
      </span>
      <span aria-hidden style={sx('flex:none;position:relative;width:38px;height:22px;border-radius:999px;transition:background .2s', { background: on ? 'var(--mint-solid)' : 'var(--surface-3)' })}>
        <span style={sx('position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s', { left: on ? 19 : 3 })} />
      </span>
    </button>
  );
}
