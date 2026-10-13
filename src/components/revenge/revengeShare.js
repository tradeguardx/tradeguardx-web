import { moneyOf } from './revengeFormat';

/* Share-card data: fixed brand colours (share art is seen outside the app's
   theme), and the trader's numbers in first person. */
export const C = {
  bg: '#080a14',
  ink: '#eef3fa',
  ink2: '#b6c2d4',
  ink3: '#7d8aa0',
  line: 'rgba(255,255,255,.08)',
  brand: '#00d4aa',
  tone: { mint: '#3ae8c0', amber: '#f8cd68', red: '#ff8a7a' },
};
export const GRADE = {
  calm: { label: 'Calm', tone: 'mint' },
  someTilt: { label: 'Some tilt', tone: 'amber' },
  revengeProne: { label: 'Revenge-prone', tone: 'amber' },
  onTilt: { label: 'On tilt', tone: 'red' },
};
const RANK = { problem: 0, warning: 1, good: 2, na: 3 };
// First person: it is their card, about them.
const STAT = {
  reentry: (v) => [`${Math.round(v)}%`, 'of my losses, I was back in within 15 min'],
  sizeUp: (v) => [`${v}×`, 'my usual size, right after a loss'],
  sameCoin: (v) => [`${Math.round(v)}%`, 'of my losses, I went straight back into the same coin'],
  streaks: (v) => [`${Math.round(v)}%`, 'of the time, I kept trading after 2 losses in a row'],
  tiltDays: (v) => [String(v), v === 1 ? 'day trading after a loss made it worse' : 'days trading after a loss made them worse'],
  cost: (v) => [`${Math.round(v)}%`, 'of everything I lost came from revenge trades'],
};

/** Up to three of their numbers, worst first. */
export function shareStats(report, { amounts = false } = {}) {
  const out = [...(report?.checks ?? [])]
    .filter((c) => c.value != null && STAT[c.id] && c.status !== 'na')
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.weight - a.weight)
    .slice(0, 3)
    .map((c) => {
      const [big, small] = STAT[c.id](c.value);
      return { key: c.id, big, small, tone: c.status === 'problem' ? 'red' : c.status === 'warning' ? 'amber' : 'mint' };
    });
  if (amounts && report?.worstDay?.pnl < 0 && out.length) {
    out[out.length - 1] = { key: 'worstDay', big: moneyOf(report.currency)(report.worstDay.pnl, { signed: true }), small: 'my worst day', tone: 'red' };
  }
  return out;
}

export function shareCaption(report, link) {
  const g = GRADE[report?.grade]?.label;
  const [first] = shareStats(report);
  const stat = first ? ` ${first.big} ${first.small}.` : '';
  return `My revenge score: ${report.score}/100${g ? ` — ${g.toLowerCase()}` : ''}.${stat} What's yours? ${link}`;
}


/* What the PNG export copies from each element. html-to-image copies EVERY
   computed property by default (~480 KB of inline CSS for this card), and
   current Chrome then draws the SVG it builds with no styles at all — plain
   black serif text. The card is all inline styles, so these are all it uses. */
export const EXPORT_STYLE_PROPS = ['display', 'position', 'inset', 'top', 'left', 'right', 'bottom', 'width', 'height', 'min-width', 'max-width', 'box-sizing', 'overflow', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'justify-content', 'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'place-items', 'background', 'background-color', 'background-image', 'color', 'font', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'font-variant-numeric', 'border', 'border-top', 'border-radius', 'border-color', 'border-width', 'border-style', 'white-space', 'vertical-align', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'text-anchor'];
