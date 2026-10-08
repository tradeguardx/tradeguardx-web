import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * The acceptance checks from the billing-step brief, as tests.
 *
 * The CTA and "due today" appear twice in the DOM on purpose — once in the
 * sticky panel and once in the phone bar, which CSS hides above 980px. jsdom
 * applies no CSS, so every query for them uses getAll and takes the first.
 *
 * The ones worth having are about promises: what the headline says, that the
 * price and cadence follow the selected plan, that "due today" is always ₹0
 * during the trial, that the tax wording stays as written, and — the one that
 * caught a real problem — that nothing claims a reminder email we do not send.
 */

const checkout = vi.fn(async () => ({ checkoutUrl: 'https://test.checkout/x' }));
vi.mock('../../../api/paymentsApi', () => ({ createCheckoutSession: (...a) => checkout(...a) }));
vi.mock('../../../api/pricingApi', () => ({
  getPricingPlans: async () => [{
    slug: 'pro',
    intervals: [
      { interval: 'monthly', price: 1299, perMonth: 1299, savingsPct: 0 },
      { interval: 'quarterly', price: 3299, perMonth: 1100, savingsPct: 15 },
      { interval: 'yearly', price: 8999, perMonth: 750, savingsPct: 42 },
    ],
  }],
}));
vi.mock('../../../lib/analytics', () => ({ trackBilling: vi.fn() }));
const auth = { user: { access: 'none', isTrial: false }, session: { access_token: 't' } };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

const { default: BillingStep } = await import('./BillingStep');

beforeEach(() => {
  checkout.mockClear();
  auth.user = { access: 'none', isTrial: false };
});

describe('billing step', () => {
  it('leads with the problem, in the agreed words', async () => {
    render(<BillingStep />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /Accounts aren’t lost to one bad trade\.\s*They’re lost to the trades after it\./,
    );
  });

  it('shows one guard-off message, and it carries no button', async () => {
    render(<BillingStep />);
    const band = (await screen.findAllByText(/Your guard is off/)).map((n) => n.closest('div'));
    expect(band).toHaveLength(1);
    expect(band[0].querySelector('button')).toBeNull();
  });

  /* Default is yearly: the brief's choice, and the one that makes the saving
     visible rather than something you discover after subscribing. */
  it('starts on yearly and prices the button accordingly', async () => {
    render(<BillingStep />);
    expect(await screen.findByRole('radio', { name: /Yearly/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('button', { name: /Start 7 days free · Yearly/ })[0]).toBeTruthy();
  });

  it('follows the selected plan through the button and the timeline', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('radio', { name: /Monthly/ }));
    expect(screen.getAllByRole('button', { name: /Start 7 days free · Monthly/ })[0]).toBeTruthy();
    expect(screen.getByText(/First charge of ₹1,299, then every month until you cancel\./)).toBeTruthy();
  });

  it('always says ₹0 is due today', async () => {
    render(<BillingStep />);
    await screen.findAllByText('Due today');
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });

  it('sends the chosen interval to checkout', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('radio', { name: /Quarterly/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Start 7 days free · Quarterly/ })[0]);
    await vi.waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0]).toMatchObject({ planSlug: 'pro', interval: 'quarterly' });
  });

  it('keeps the tax wording exactly, with the claim it qualifies', async () => {
    // It sits inside the tax row, not loose under the list: a legal
    // qualifier with nothing visible to qualify just reads as a worry.
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Tax management/ }));
    expect(screen.getByText('Illustrative, not a confirmed liability. Review with your CA.')).toBeTruthy();
  });

  /*
   * trialEmail.ts selects on source='free'; a mandate-backed trial is
   * source='payment', so no reminder is sent for the trial this screen
   * starts. Promising one here would be a lie told at the exact moment
   * someone is deciding to trust us with a recurring mandate.
   */
  it('promises no reminder email, because none is sent', async () => {
    render(<BillingStep />);
    await screen.findAllByText('Due today');
    expect(screen.queryByText(/email you two days before/i)).toBeNull();
    expect(screen.queryByText(/with a link to cancel/i)).toBeNull();
  });

  it('keeps the detail behind an accordion, closed by default', async () => {
    render(<BillingStep />);
    const row = await screen.findByRole('button', { name: /Rule-based kill switch/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/One red trade becomes five/)).toBeNull();

    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/One red trade becomes five/)).toBeTruthy();
  });

  /* Closing something the user did not ask to close is the more annoying of
     the two behaviours, so rows open independently. */
  it('lets more than one row stay open', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Rule-based kill switch/ }));
    fireEvent.click(screen.getByRole('button', { name: /Manual kill switch/ }));
    expect(screen.getByText(/One red trade becomes five/)).toBeTruthy();
    /* The pain line, which appears only in the expanded detail — the summary
       and the fix share wording, so matching on that proves nothing. */
    expect(screen.getByText(/stop clicking/)).toBeTruthy();
  });

  it('hides the status band once the guard is on', async () => {
    auth.user = { access: 'trial', isTrial: true };
    render(<BillingStep />);
    await screen.findAllByText('Due today');
    expect(screen.queryByText(/Your guard is off/)).toBeNull();
  });
});
