import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ShareCardPreview from './ShareCardPreview';
import { shareCard } from '../../lib/shareCards';
import { ruleChips, ruleLabels } from '../../lib/shareData';

/**
 * The card renders its rule chips as text. Handing it the rail's {k,v,c}
 * objects instead of strings throws "Objects are not valid as a React child"
 * from inside a <span>, which the app's error boundary turns into a blank
 * dashboard — no console hint about rules, no failing unit test, because the
 * shapes are both perfectly valid data.
 */
const BUNDLE = {
  instances: [
    { templateSlug: 'daily-loss', enabled: true, config: { mode: 'amount', dailyLossAmount: 220 } },
    { templateSlug: 'daily-profit-target', enabled: true, config: { mode: 'amount', dailyTargetAmount: 400 } },
  ],
};

describe('ShareCardPreview', () => {
  const card = shareCard('trade');

  it('renders the account’s rule chips as text', () => {
    const { container } = render(<ShareCardPreview card={card} rules={ruleLabels(BUNDLE)} />);
    expect(container.textContent).toContain('−$220 max loss');
    expect(container.textContent).toContain('+$400 target');
  });

  it('throws on the rail shape, which is why there are two', () => {
    expect(() => render(<ShareCardPreview card={card} rules={ruleChips(BUNDLE)} />)).toThrow();
  });

  it('renders with no rules at all', () => {
    const { container } = render(<ShareCardPreview card={card} rules={[]} />);
    expect(container.textContent).toContain(card.hero);
  });

  it('omits the referral chip when there is no code', () => {
    const { container } = render(<ShareCardPreview card={card} rules={[]} referral={null} />);
    expect(container.textContent).toContain('Would yours hold?');
    expect(container.textContent).not.toMatch(/ARJUN/);
  });
});

describe('no demo value is one missing prop away', () => {
  /*
   * `rules` defaulted to DEFAULT_RULE_CHIPS — '−$220 max loss', '+$400
   * target' and two more belonging to the handoff's demo account. The real
   * host always passes an array, so it never fired; it was one missing prop
   * away from printing four rules this user never set onto the artefact they
   * publish under their own name. The same shape of default has already
   * shipped '@arjun.trades', 'ARJUN14' and 'Delta Exchange' onto real cards.
   */
  it('shows no rules at all when none are passed', () => {
    const { container } = render(<ShareCardPreview card={shareCard('trade')} />);
    expect(container.textContent).not.toContain('max loss');
    expect(container.textContent).not.toContain('trades/day');
  });

  it('shows no handle and no referral when none are known', () => {
    const { container } = render(<ShareCardPreview card={shareCard('trade')} />);
    expect(container.textContent).not.toMatch(/arjun|ARJUN/);
  });
});
