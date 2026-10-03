import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ShareCardPreview from './ShareCardPreview';
import { chartGeometry } from '../../lib/shareBuild';
import { BRAND } from '../../lib/shareCards';

/**
 * The card is the artefact a user posts under their own name, so its colour
 * has to agree with its number. Every figure and badge on it used to be
 * hard-coded mint, which meant a trade the user had just lost money on arrived
 * as a large green number under a green badge.
 */
const CARD = (over = {}) => ({
  sym: 'XRPUSDT', meta: 'Short', badge: 'Guard closed', label: 'Stopped by my loss limit',
  hero: '₹5', dec: '.97', pill: '−₹5.97', pillRed: true, pillText: 'Loss limit · held 40m',
  ach: 'Stopped at the limit', tier: 'RARE', date: '28 Sept 2026', ...over,
});

// jsdom rewrites hex colours to rgb() in inline styles; SVG attributes keep
// their hex. Assert in the form each one actually lands in.
const RED = 'rgb(255, 138, 128)';
const MINT = 'rgb(63, 240, 200)';
const html = (card) => render(<ShareCardPreview card={card} rules={[]} />).container.innerHTML;

describe('the card’s colour follows its outcome', () => {
  it('paints a red card red', () => {
    const h = html(CARD({ tone: 'red' }));
    expect(h).toContain(RED);
    expect(h).not.toContain(MINT);
  });

  it('paints a mint card mint', () => {
    const h = html(CARD({ tone: 'mint', pillRed: false }));
    expect(h).toContain(MINT);
  });

  it('defaults to mint rather than rendering colourless', () => {
    expect(html(CARD())).toContain(MINT);
  });

  it('gives each tier its own badge', () => {
    // The tier is earned now, so COMMON must not look like LEGENDARY.
    const chip = (t) => {
      const { getByText } = render(<ShareCardPreview card={CARD({ tier: t })} rules={[]} />);
      return getByText(t).style.background;
    };
    const seen = new Set(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(chip));
    expect(seen.size).toBe(4);
  });

  it('draws the trade’s own path, with the saving shaded', () => {
    // The chart used to be a fixed polyline — the same descending line on
    // every card — so a winning trade got a falling green line and the picture
    // contradicted the number above it.
    const chart = chartGeometry({ P: [0, 200, 61496], A: [61496, 5000, -5610] });
    const { container, getByText } = render(
      <ShareCardPreview card={CARD({ tone: 'mint', chart, heroNote: 'avoided', heldLabel: '−₹5,610.21' })} rules={[]} />,
    );
    const h = container.innerHTML;
    expect(h).toContain('-area');
    expect(h).toContain('-gap');
    // The marker where the rule fired. It is an HTML div over the SVG now,
    // because the SVG is stretched to the panel and a stretched circle is an
    // ellipse — the old marker was a blob whose flattening changed with the
    // card's shape. jsdom rewrites the hex to rgb() in inline styles.
    expect(h).toContain('rgb(240, 180, 41)');
    // One stroke, not a 7px ghost under a 3px line. Two polylines in total:
    // the trade's own path and the dashed after-path. (Guardy's mouth is a
    // <path> with its own 7px stroke, which is why this counts elements
    // rather than grepping for a width.)
    expect(h).toContain('stroke-width="2.2"');
    expect(h.match(/<polyline/g)).toHaveLength(2);
    // And the dotted line says what it is.
    expect(h).toContain('ENTRY');
    expect(h).toContain('avoided');
    // The two figures the headline compares, as a pair rather than a pill and
    // a run-on sentence.
    expect(getByText(/If I.d held/)).toBeTruthy();
    expect(getByText('−₹5,610.21')).toBeTruthy();
  });

  it('draws no chart at all rather than a decorative one', () => {
    // A card with no priced counterfactual has no path to show. Inventing a
    // shape there is what made every card look the same.
    const h = html(CARD({ tone: 'red' }));
    expect(h).not.toContain('<svg viewBox="0 0 260');
    expect(h).not.toContain('polygon');
  });

  it('puts the hook above the fold, not below the brand and the rules', () => {
    // On a Story people see the top third and swipe. The story used to start a
    // third of the way down, under a logo and a row of settings.
    const h = html(CARD({ tone: 'mint', headline: 'My daily target banked it.' }));
    expect(h.indexOf('My daily target banked it.')).toBeLessThan(h.indexOf('max loss') === -1 ? h.length : h.indexOf('max loss'));
    expect(h).toContain('My daily target banked it.');
  });

  it('carries the character the reel introduces', () => {
    // A chart is a chart. Guardy is the only part of this nobody else can copy.
    const chart = chartGeometry({ P: [0, 10], A: [10, -10] });
    const h = html(CARD({ tone: 'mint', chart }));
    expect(h).toContain('M0 -112 L96 -74');
  });

  it('makes the ask a button, not a footnote', () => {
    // "Would yours hold?" is the reason the card exists and it was 8.5px grey.
    const { getByText } = render(<ShareCardPreview card={CARD()} rules={[]} />);
    expect(getByText('Would yours hold?').closest('span').style.background).toContain('gradient');
  });

  it('tells a stranger what this is', () => {
    // A share card travels to people with no context. Everything else on it
    // assumes you already know what a killswitch is and that this one exists.
    const { getByText } = render(<ShareCardPreview card={CARD()} rules={[]} />);
    expect(getByText(BRAND.tagline)).toBeTruthy();
  });

  it('makes no claim about which venues are live', () => {
    /*
     * "Live on Delta · CoinDCX · Shark" came off the footer.
     *
     * It was a claim about the PRODUCT, printed on an artefact the USER
     * publishes under their own name — so it had to be re-verified every time
     * a venue's status moved, on every card already in the wild. The footer's
     * job is whose trade it was and the ask.
     */
    const h = html(CARD());
    for (const v of ['Delta', 'CoinDCX', 'Shark']) expect(h).not.toContain(`${v} ·`);
    expect(h).not.toContain(BRAND.venues);
  });

  it('keeps the footer to the handle, the date and the ask', () => {
    const { getByText } = render(<ShareCardPreview card={CARD()} handle="@prashant.pathak" referral="TGX-A1B2" rules={[]} />);
    expect(getByText('@prashant.pathak · 28 Sept 2026')).toBeTruthy();
    expect(getByText('Would yours hold?')).toBeTruthy();
    expect(getByText('TGX-A1B2')).toBeTruthy();
  });

  it('gives the instrument the size a trader reads first', () => {
    const { getByText } = render(<ShareCardPreview card={CARD()} rules={[]} />);
    const px = parseFloat(getByText('XRPUSDT').style.font.match(/(\d+(?:\.\d+)?)px/)[1]);
    expect(px).toBeGreaterThanOrEqual(15);
  });
});

describe('one shape, and the chart keeps its own', () => {
  /*
   * The card had a Post / Story / Square picker, and all the slack a 9:16
   * gave landed on the chart — the one flexible thing in the column. The
   * picker is gone (4:5 is what every platform in the Share-to row takes
   * as-is), but the rule it taught stays: the chart is locked to 3:1 and
   * everything above it is free to take a line more or less without changing
   * the shape of the curve. The curve IS the claim the card is making.
   */
  const chart = chartGeometry({ P: [0, 200, 61496], A: [61496, 5000, -5610] });
  const panel = (container) => [...container.querySelectorAll('div')]
    .find((d) => d.style.aspectRatio === '3 / 1');

  it('is 4:5, with no way to ask for anything else', () => {
    const { container } = render(<ShareCardPreview card={CARD({ tone: 'mint', chart })} rules={[]} />);
    expect(container.firstChild.style.aspectRatio).toBe('4 / 5');
  });

  it('locks the chart to 3:1 and lets it narrow rather than squash', () => {
    const { container } = render(<ShareCardPreview card={CARD({ tone: 'mint', chart })} rules={[]} />);
    const box = panel(container);
    expect(box).toBeTruthy();
    expect(box.style.maxHeight).toBe('100%');
  });
});

describe('legibility', () => {
  // The card had eighteen elements and all but two were 7–10px grey on
  // near-black. At a glance it read as one bright number floating on noise,
  // and a reposted screenshot — which is how these actually travel — lost
  // everything else.
  const sizes = (html) => [...html.matchAll(/font(?:-size)?:\s*(?:\d+\s+)?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));

  it('has nothing smaller than 8.5px in the design space', () => {
    // 8.5px at the 432px design width is 21px in the 1080px export.
    const chart = chartGeometry({ P: [0, 10], A: [10, -10] });
    const h = render(
      <ShareCardPreview card={CARD({ tone: 'mint', chart, heldLabel: '−₹5' })} rules={['−₹35,000 max loss']} />,
    ).container.innerHTML;
    for (const px of sizes(h)) expect(px).toBeGreaterThanOrEqual(8.5);
  });

  it('drops the achievement row rather than adding another line of fine print', () => {
    // The tier moved into the badge, so a whole row of 9.5px text could go.
    const { queryByText, getByText } = render(<ShareCardPreview card={CARD({ ach: 'Saved by the guard' })} rules={[]} />);
    expect(queryByText('Saved by the guard')).toBeNull();
    expect(getByText('RARE')).toBeTruthy();
  });
});
