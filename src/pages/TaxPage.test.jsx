import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * REGRESSION GUARDS FOR THE TAX CENTRE.
 *
 * These exist because the 30% F&O calculation was reintroduced once already,
 * copied out of a design fixture into `TaxPage.jsx`:
 *
 *     const fnoTax = Math.max(0, economic) * 0.3;
 *
 * It shipped invisibly. The account was down for the year, so `max(0, loss)`
 * was zero and the card read 0 — correct by accident. On a profitable year it
 * would have shown a confident, wrong tax figure to someone about to file.
 *
 * So the profitable-year fixture below is the important one: a loss-year test
 * alone passes against the broken formula and proves nothing.
 *
 * The rule these defend: the Tax Centre is a PRESENTATION layer. It renders
 * what the versioned tax engine returns. It may format currency and choose
 * what to show; it may never compute a tax amount, a rate, a deduction or a
 * set-off. The frontend must not be able to invent a tax number.
 *
 * They deliberately render the real page rather than an extracted card —
 * a guard that tests a copy would not catch a regression added to the page.
 */

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'test-token' } }),
}));

vi.mock('../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({ selectedAccount: { id: 'acct-1' } }),
}));

const fetchTaxSummary = vi.fn();
const fetchTaxPositions = vi.fn();
vi.mock('../api/tradesApi', () => ({
  fetchTaxSummary: (...args) => fetchTaxSummary(...args),
  fetchTaxPositions: (...args) => fetchTaxPositions(...args),
}));

const TaxPage = (await import('./TaxPage')).default;

/**
 * DESIGN-FIXTURE RULE: every number here is a VISUAL EXAMPLE chosen to make a
 * guard fail loudly. None of it is authoritative tax logic, and none of its
 * arithmetic may be lifted into production code — which is exactly how the
 * original bug got in.
 */
function summary(overrides = {}) {
  const base = {
    calculationStatus: 'ENABLED',
    pnlReconciliationStatus: 'PASSED',
    dataCompleteness: 'complete',
    fy: 2026,
    versions: { taxRules: 'IN-2026-27-v1', pnlEngine: '4.2.0', calcEngine: '4.2.0' },
    counts: { positions: 303, walletTransactions: 2631, expiredOptionsRecovered: 6, needsReview: 0 },
    bridge: {
      grossTradingPnl: -3003.16,
      tradingCommission: -5702.83,
      netTradingPnl: -8705.99,
      funding: -18.02,
      liquidationFees: -206.89,
      completeEconomicPnl: -8930.9,
    },
    taxableBusinessIncome: 0,
    lossAvailableForSetOff: 8930.9,
    walletAdjustments: {
      excluded: { cashflow: -3112.89, settlement: 109.72, commission: -5702.83, capitalMovement: 8928.08 },
    },
    illustrativeVda: { gains: 14506.64, losses: -23212.63, taxRate: 0.3, tax: 4351.99, tds: 0 },
    currency: 'USD',
    inrConversion: { status: 'NOT_AVAILABLE', reason: 'Figures are denominated in USD.' },
    disclaimer: 'test disclaimer',
  };
  return { ...base, ...overrides };
}

async function renderWith(data) {
  fetchTaxSummary.mockResolvedValue(data);
  render(<TaxPage />);
  await waitFor(() => expect(screen.getByText(/tax treatment scenarios/i)).toBeInTheDocument());
  return document.body.textContent ?? '';
}

beforeEach(() => {
  fetchTaxSummary.mockReset();
  fetchTaxPositions.mockReset();
  fetchTaxPositions.mockResolvedValue({
    positions: [
      {
        positionKey: 'k1',
        symbol: 'ETHUSD',
        side: 'long',
        instrumentType: 'FNO',
        quantity: 400,
        grossPnl: 44.71,
        fees: 10.01,
        realizedPnl: 34.7,
        closedAt: '2026-05-02T10:00:00Z',
        lotMatches: 4,
      },
    ],
    totals: {
      FNO: { positions: 1, grossPnl: 44.71, fees: 10.01, realizedPnl: 34.7, winners: 1, losers: 0 },
      SPOT: { positions: 0, grossPnl: 0, fees: 0, realizedPnl: 0, winners: 0, losers: 0 },
      UNKNOWN: { positions: 0, grossPnl: 0, fees: 0, realizedPnl: 0, winners: 0, losers: 0 },
    },
  });
});

describe('F&O card — the frontend must never compute a tax amount', () => {
  it('PROFITABLE YEAR: shows taxable income, and no rupee tax at any rate', async () => {
    // The case the original bug would have failed. 125,000 taxed at 30% is
    // 37,500 — that figure must not appear anywhere on the page.
    const text = await renderWith(
      summary({
        bridge: {
          grossTradingPnl: 150000,
          tradingCommission: -20000,
          netTradingPnl: 130000,
          funding: -2000,
          liquidationFees: -3000,
          completeEconomicPnl: 125000,
        },
        taxableBusinessIncome: 125000,
        lossAvailableForSetOff: 0,
      }),
    );

    // USD fixture, so US grouping. The point of the test is the ABSENCE of a
    // computed tax, not the separator.
    expect(text).toContain('125,000');
    expect(text).toMatch(/your slab/i);
    expect(text).toMatch(/CA review/i);

    // 30% of the economic result, in every form it could render.
    expect(text).not.toContain('37,500');
    expect(text).not.toContain('37500');
    expect(text).not.toMatch(/estimated (f&o|fno) tax/i);
    expect(text).not.toMatch(/f&o tax/i);
  });

  it('LOSS YEAR: passes on substance, not because max(0, loss) happens to be 0', async () => {
    const text = await renderWith(summary());

    expect(text).toContain('8,930.90'); // the loss, stated
    expect(text).toMatch(/your slab/i); // rate deferred to a CA, not asserted

    // The broken formula also produced 0 here, so a zero on screen proves
    // nothing. What proves it: the page defers the RATE rather than applying
    // one, which the old code could not do.
    expect(text).not.toMatch(/estimated (f&o|fno) tax/i);
  });

  it('SOURCE OF TRUTH: renders the API figure, never one derived from P&L', async () => {
    // taxableBusinessIncome deliberately disagrees with completeEconomicPnl.
    // A UI that re-derives income from P&L shows 100,000 and fails.
    const text = await renderWith(
      summary({
        bridge: { ...summary().bridge, completeEconomicPnl: 100000 },
        taxableBusinessIncome: 42000,
        lossAvailableForSetOff: 0,
      }),
    );

    expect(text).toContain('42,000');
    expect(text).not.toContain('30,000'); // 100,000 x 30%
  });
});

describe('VDA scenario — illustrative, and still not computed here', () => {
  it('renders the API tax figure rather than gains x 30%', async () => {
    // Gains and tax are deliberately inconsistent: 50,000 x 30% is 15,000, but
    // the engine says 9,999. The UI must show what the engine says.
    const text = await renderWith(
      summary({ illustrativeVda: { gains: 50000, losses: -1000, taxRate: 0.3, tax: 9999, tds: 0 } }),
    );

    expect(text).toContain('9,999');
    expect(text).not.toContain('15,000');
    expect(text).toMatch(/illustrative/i);
  });
});

describe('provenance comes from the API', () => {
  it('renders the exact versions served, with no fixture fallback', async () => {
    await renderWith(
      summary({
        versions: { taxRules: 'TEST-RULE-999', pnlEngine: 'TEST-PNL-777', calcEngine: 'TEST-CALC-888' },
      }),
    );

    // The methodology panel is collapsed; open it via its trigger.
    screen.getByRole('button', { name: /view methodology/i }).click();
    await waitFor(() => expect(document.body.textContent).toContain('TEST-RULE-999'));

    const opened = document.body.textContent ?? '';
    expect(opened).toContain('TEST-RULE-999');
    expect(opened).toContain('TEST-PNL-777');
    expect(opened).toContain('TEST-CALC-888');
    // The values the page used to hardcode.
    expect(opened).not.toContain('v2026.1');
  });
});

describe('counts come from the API', () => {
  it.each([
    [0, 6],
    [3, 2],
  ])('renders needsReview=%i and recovered=%i as served', async (needsReview, recovered) => {
    const text = await renderWith(
      summary({
        counts: { positions: 10, walletTransactions: 20, expiredOptionsRecovered: recovered, needsReview },
      }),
    );

    expect(text).toContain(`${needsReview} positions need review`);
    expect(text).toContain(`${recovered} expired options recovered`);
  });
});

describe('the reconciliation gate still withholds figures', () => {
  it('shows nothing but the notice while P&L is unreconciled', async () => {
    fetchTaxSummary.mockResolvedValue(
      summary({
        calculationStatus: 'INVALID_PENDING_RECONCILIATION',
        calculationStatusMessage: 'Tax calculation requires reconciliation.',
      }),
    );
    render(<TaxPage />);
    await waitFor(() =>
      expect(screen.getAllByText(/tax calculation requires reconciliation/i).length).toBeGreaterThan(0),
    );

    const text = document.body.textContent ?? '';
    expect(text).not.toContain('8,930.90');
    expect(text).not.toMatch(/tax treatment scenarios/i);
  });
});

describe('three views, each answering a different question', () => {
  it('opens on Overview and offers the other two', async () => {
    await renderWith(summary());

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tax transactions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CA report' })).toBeInTheDocument();
    // Overview is the default view.
    expect(document.body.textContent).toMatch(/tax treatment scenarios/i);
  });

  it('Tax transactions lists positions and keeps the two regimes apart', async () => {
    await renderWith(summary());
    screen.getByRole('button', { name: 'Tax transactions' }).click();

    await waitFor(() => expect(document.body.textContent).toContain('ETHUSD'));

    const text = document.body.textContent ?? '';
    // Both categories are offered as separate tabs, never one merged list.
    expect(text).toMatch(/F&O \/ Business/);
    expect(text).toMatch(/VDA \/ 115BBH/);
    // Position-level, with the FIFO lot count kept visible but distinct.
    expect(text).toMatch(/lots.*FIFO matches|FIFO matches/i);
  });

  it('CA report carries the export handoff, not the scenarios', async () => {
    await renderWith(summary());
    screen.getByRole('button', { name: 'CA report' }).click();

    await waitFor(() => expect(document.body.textContent).toMatch(/generate ca pack/i));

    const text = document.body.textContent ?? '';
    expect(text).toMatch(/hand it to your CA/i);
    // The argument lives on Overview; this view is the handoff.
    expect(text).not.toMatch(/tax treatment scenarios/i);
  });
});

describe('currency is never assumed', () => {
  it('renders USD figures with a dollar sign, never a rupee sign', async () => {
    // Delta India settles in USD. Rendering those with a rupee sign understated
    // an Indian tax base ~84x — the worst bug this page has had.
    const text = await renderWith(summary());

    expect(text).toContain('$8,930.90');
    expect(text).not.toContain('₹8,930.90');
    // And says so plainly rather than leaving the reader to notice.
    expect(text).toMatch(/figures are in USD/i);
    expect(text).toMatch(/INR CONVERSION PENDING/i);
  });

  it('uses rupees — and Indian grouping — only when the API says INR', async () => {
    const text = await renderWith(
      summary({
        currency: 'INR',
        inrConversion: { status: 'CONVERTED', reason: '' },
        bridge: { ...summary().bridge, completeEconomicPnl: -125000 },
      }),
    );

    expect(text).toContain('₹1,25,000'); // en-IN grouping, not 125,000
    expect(text).not.toMatch(/figures are in USD/i);
  });

  it('never silently defaults to rupees when the unit is unknown', async () => {
    const text = await renderWith(summary({ currency: undefined, inrConversion: undefined }));
    expect(text).not.toContain('₹8,930.90');
  });
});
