import { useState } from 'react';
import ShareReel from '../components/share/reel/ShareReel';

/**
 * A harness for reviewing the share reel. Not a product page.
 *
 * It exists because the reel has to be judged at the two sizes it will
 * actually appear at — a phone-width column and a desktop card — and those
 * look different enough that reviewing one tells you little about the other.
 * The width control below is the point of the page.
 *
 * Excluded from the sitemap and prerender in publicRoutes.js.
 */
const WIDTHS = [
  { k: 'Phone', w: 360 },
  { k: 'Narrow card', w: 300 },
  { k: 'Desktop', w: 480 },
  { k: 'Large', w: 620 },
];

export default function ReelPreviewPage() {
  const [story, setStory] = useState('trade');
  const [width, setWidth] = useState(360);
  const [captions, setCaptions] = useState(true);
  const [colour, setColour] = useState('');

  const btn = (active) => ({
    padding: '8px 14px',
    borderRadius: 10,
    border: `1px solid ${active ? '#00d4aa' : 'rgba(255,255,255,.16)'}`,
    background: active ? 'rgba(0,212,170,.14)' : 'rgba(255,255,255,.04)',
    color: active ? '#3ff0c8' : '#c9d2e0',
    font: "600 13px/1 Manrope, sans-serif",
    cursor: 'pointer',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#05070d', color: '#f6f9fc', padding: '28px 20px 60px', fontFamily: 'Manrope, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ font: "700 26px/1.2 'Space Grotesk', sans-serif", margin: 0 }}>Share reel — preview</h1>
        <p style={{ margin: '8px 0 20px', fontSize: 13.5, color: '#8794a8', maxWidth: '62ch' }}>
          Tap the reel to pause. It stops on its own when scrolled out of view, and honours reduced-motion by
          showing the final card with a play button.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {['trade', 'day'].map((s) => (
            <button key={s} type="button" style={btn(story === s)} onClick={() => setStory(s)}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {WIDTHS.map((o) => (
            <button key={o.k} type="button" style={btn(width === o.w)} onClick={() => setWidth(o.w)}>
              {o.k} · {o.w}px
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <button type="button" style={btn(captions)} onClick={() => setCaptions((v) => !v)}>captions</button>
          {['', 'mint', 'violet', 'gold'].map((c) => (
            <button key={c || 'auto'} type="button" style={btn(colour === c)} onClick={() => setColour(c)}>
              {c || 'auto (from id)'}
            </button>
          ))}
        </div>

        <div style={{ width, maxWidth: '100%', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px -30px rgba(0,0,0,.9)' }}>
          <ShareReel story={story} id="demo-trade-1" color={colour || undefined} captions={captions} />
        </div>
      </div>
    </div>
  );
}
