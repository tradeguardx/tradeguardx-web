import { beforeAll, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ShareReel from './ShareReel';
import PriceChart from './PriceChart';
import { CUES, STORIES } from '../../../lib/reelStories';
import { ownTradeStory } from '../../../lib/reelBuild';

/**
 * Every story renders at a real size.
 *
 * The maths is covered in reelMotion.test.js; this covers the other half — a
 * layer that throws for one story and not another, which is exactly what
 * adding a bar race to a component built around a price line risks. The reel
 * only paints once its host measures non-zero, so jsdom needs both a
 * ResizeObserver and a box; without them `scale` stays 0 and nothing below the
 * stage is ever constructed, which would make this test pass on a component
 * that cannot render at all.
 */
beforeAll(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) { this.cb = cb; }
    observe() { this.cb([]); }
    disconnect() {}
  };
  Element.prototype.getBoundingClientRect = function rect() {
    return { width: 360, height: 640, top: 0, left: 0, right: 360, bottom: 640, x: 0, y: 0, toJSON() {} };
  };
});

describe('ShareReel', () => {
  it('mounts every story and draws its stage', () => {
    for (const story of Object.keys(STORIES)) {
      const { container, unmount } = render(<ShareReel story={story} id={`demo-${story}`} captions />);
      expect(container.textContent, story).toContain('TradeGuard');
      unmount();
    }
  });

  it('shows the week’s own day labels, not a price line', () => {
    const { container } = render(<ShareReel story="week" id="w" />);
    for (const d of STORIES.week.days) expect(container.textContent).toContain(d.d);
  });

  it('renders each story’s own heading and stamp', () => {
    // Not the captions: the first one starts at T = 0.5 and the reel opens on
    // a black frame, so at mount there is correctly no caption to assert on.
    for (const [id, story] of Object.entries(STORIES)) {
      const { container, unmount } = render(<ShareReel story={id} id={id} />);
      expect(container.textContent, id).toContain(story.sym);
      expect(container.textContent, id).toContain(story.stamp);
      unmount();
    }
  });

  it('falls back to the trade story on an unknown id', () => {
    const { container } = render(<ShareReel story="quarter" id="x" />);
    expect(container.textContent).toContain(STORIES.trade.sym);
    expect(container.textContent).not.toContain(STORIES.month.sym);
  });

  it('plays a trade that no rule ever touched', () => {
    /*
     * The own-trade story hands the reel an `A` of ONE point, which is a
     * shape nothing in this component had seen: XA is 0, the reveal tween
     * widens the x-axis from XN to XN, and PriceChart's after-path loop runs
     * zero times. Every one of those is a place an off-by-one turns into NaN
     * in a transform and a blank stage. This is the test that the format is
     * actually available to the accounts that have no guard closes — which,
     * on the day this was written, was most of them.
     */
    const story = ownTradeStory({
      trade: { symbol: 'ETHUSD', side: 'short', openedAt: '2026-08-04T04:00:00Z', closedAt: '2026-08-04T05:06:00Z' },
      card: { available: true, meta: 'Short', badge: 'Closed green', label: 'Banked on this trade', pill: '+$177.99', pillRed: false, date: '4 Aug 2026' },
      paths: { P: [0, 60, 120, 177.99] },
      rulesKept: 4,
    });
    const { container } = render(<ShareReel story="trade" data={story} id="own" />);
    expect(container.textContent).toContain('ETHUSD');
    expect(container.textContent).toContain('Closed at +$177.99');
    // No claim about a path the trade did not take.
    expect(container.textContent).not.toContain('If you');
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('is 9:16, the shape the export is', () => {
    const { container } = render(<ShareReel story="month" id="m" />);
    expect(container.firstChild.style.aspectRatio).toBe('9 / 16');
    expect(CUES.END).toBe(17.6);
  });
});

describe('nothing on the reel is the handoff’s demo', () => {
  // The card was fixed for this and the reel was not — the same hard-coded
  // "Delta Exchange" and orange dot sat in TWO places here, the header and the
  // end card, so a Shark trade's reel announced the wrong exchange twice in a
  // video the user posts under their own name.
  const SHARK = { name: 'Shark', mark: 'S', bg: '#12b5a6', fg: '#02261f' };

  it('names the venue it was given, in both places', () => {
    const { container } = render(<ShareReel story="trade" id="t" venue={SHARK} />);
    expect(container.textContent).toContain('Shark');
    expect(container.textContent).not.toContain('Delta');
  });

  it('shows no venue at all rather than a guess', () => {
    const { container } = render(<ShareReel story="trade" id="t" />);
    expect(container.textContent).not.toContain('Delta');
  });

  it('never puts the demo account’s handle on someone else’s trade', () => {
    // '@arjun.trades' was the default, so an account with no handle attributed
    // its result to a stranger.
    const { container } = render(<ShareReel story="trade" id="t" venue={SHARK} />);
    expect(container.textContent).not.toContain('arjun');
  });

  it('uses the handle it is given', () => {
    const { container } = render(<ShareReel story="trade" id="t" venue={SHARK} handle="@test.yt" />);
    expect(container.textContent).toContain('@test.yt');
  });
});

describe('the chart with nothing after the close', () => {
  /*
   * The own-trade story's `A` is a single point. That makes XA = 0, and the
   * after-path loop, the reveal tween and the "saved" polygon all index off
   * it — so this covers the frame the smoke test above cannot reach, the one
   * AFTER the reveal has run, where an off-by-one would draw a stray line
   * across the panel or emit NaN into a polygon.
   */
  const P = [0, 60, 120, 177.99];
  const A = [177.99];

  it('draws no second line and no shaded region', () => {
    const { container } = render(
      <svg>
        <PriceChart
          id="t"
          story={{ mode: 'own', limit: 0, limitLabel: '', limitC: '#2fe3bd' }}
          P={P}
          A={A}
          w={880}
          h={560}
          xMax={P.length - 1}
          lo={-40}
          hi={200}
          drawP={1}
          afterP={1}
        />
      </svg>,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('NaN');
    // The trade's own path, clipped mint above zero and red below it — and
    // nothing else. A third polyline would be the after-path, drawn from a
    // single point, claiming a move the reel has no business claiming.
    expect(html.match(/<polyline/g)).toHaveLength(2);
    expect(html).not.toContain('stroke="#8794a8"');
  });
});
