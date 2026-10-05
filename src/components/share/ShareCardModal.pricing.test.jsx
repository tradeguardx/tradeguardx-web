import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ShareCardModal from './ShareCardModal';

/**
 * STILL PRICING IS NOT THE SAME ANSWER AS CANNOT PRICE.
 *
 * Pass 1's `loading` goes false the moment the trades land, but the chart is
 * priced from Binance in a second pass with no flag of its own. So between the
 * two the modal had a card, no reel story, and no way to tell "we are still
 * asking" from "we asked and the answer is no". It picked the second and said
 * so — a verdict, stated before the data that decides it had arrived, about a
 * reel that then appeared a second later.
 */
const CARD = {
  available: true, reelStory: 'trade', tab: 'This trade',
  sym: 'XRPUSDT', meta: 'Short', badge: 'Closed', label: 'Taken on this trade',
  hero: '₹333', dec: '.80', pill: '−₹333.80', pillRed: true, pillText: 'Short · held 57m',
  cap: 'XRPUSDT closed at −₹333.80.', date: '4 Oct 2026', tiles: [],
};

const open = (props) => render(
  <ShareCardModal
    open
    kind="trade"
    cards={{ trade: CARD }}
    kinds={['trade']}
    stories={{}}
    rules={[]}
    currency="INR"
    onClose={() => {}}
    {...props}
  />,
).container.ownerDocument.body.textContent;

describe('why there is no reel', () => {
  it('says it is still working while the chart is being priced', () => {
    const t = open({ pricing: true });
    expect(t).toMatch(/Pricing this trade/i);
    expect(t).not.toMatch(/could not be priced/i);
  });

  it('only calls it a failure once the answer is actually in', () => {
    const t = open({ pricing: false });
    expect(t).toMatch(/could not be priced/i);
    expect(t).not.toMatch(/Pricing this trade/i);
  });

  it('names no single cause it cannot know', () => {
    /*
     * It blamed the venue's symbol. That is one of about ten ways
     * tradePaths() returns null — the window can be too short to sample,
     * entry and exit can be the same price so there is nothing to calibrate
     * against, Binance can simply refuse. Naming one was a guess dressed as
     * a diagnosis.
     */
    const t = open({ pricing: false });
    expect(t).not.toMatch(/symbol/i);
  });
});
