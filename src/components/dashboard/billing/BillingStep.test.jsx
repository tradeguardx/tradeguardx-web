import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * The acceptance checks from the billing-step brief, as tests.
 *
 * The ones worth having are about promises: what the headline says, that the
 * price and cadence follow the selected plan, that "due today" is always ₹0
 * during the trial, that the tax wording stays as written, and — the one that
 * caught a real problem — that nothing claims a reminder email we do not send.
 */

const checkout = vi.fn(async () => ({ checkoutUrl: 'https://test.checkout/x' }));
const validate = vi.fn(async () => ({ valid: true, code: 'SAVE15', percentOff: 15, cycles: null }));
vi.mock('../../../api/paymentsApi', () => ({
  createCheckoutSession: (...a) => checkout(...a),
  validateCoupon: (...a) => validate(...a),
}));
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
const autoCoupon = { value: undefined };
vi.mock('../../../lib/checkoutCoupon', () => ({ checkoutCouponCode: () => autoCoupon.value }));
const auth = { user: { access: 'none', isTrial: false }, session: { access_token: 't' } };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));

const { default: BillingStep } = await import('./BillingStep');

beforeEach(() => {
  checkout.mockClear();
  validate.mockClear();
  validate.mockResolvedValue({ valid: true, code: 'SAVE15', percentOff: 15, cycles: null });
  auth.user = { access: 'none', isTrial: false };
  autoCoupon.value = undefined;
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

  /* Monthly by default. This is the first money conversation with someone who
     signed up today, and a year preselected reads as the choice being made
     for them; the saving is on screen for anyone who wants it. */
  it('starts on monthly and prices the button accordingly', async () => {
    render(<BillingStep />);
    expect(await screen.findByRole('radio', { name: /Monthly/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Start 7 days free · Monthly/ })).toBeTruthy();
  });

  it('follows the selected plan through the button and the timeline', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('radio', { name: /Monthly/ }));
    expect(screen.getByRole('button', { name: /Start 7 days free · Monthly/ })).toBeTruthy();
    expect(screen.getByText(/First charge of ₹1,299, then every month until you cancel\./)).toBeTruthy();
  });

  it('always says ₹0 is due today', async () => {
    render(<BillingStep />);
    await screen.findByText('Due today');
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });

  it('sends the chosen interval to checkout', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('radio', { name: /Quarterly/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start 7 days free · Quarterly/ }));
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
    await screen.findByText('Due today');
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
  /* Expanding has to be worth the click: the detail must say something the
     summary did not. The first pass restated it and taught people the
     chevrons were not worth pressing. */
  it('reveals something the summary does not already say', async () => {
    render(<BillingStep />);
    const row = await screen.findByRole('button', { name: /Up to 5 trading accounts/ });
    const summary = row.textContent;
    fireEvent.click(row);
    const detail = screen.getByText(/Nothing is shared between them/);
    expect(summary).not.toContain(detail.textContent);
  });

  it('lets more than one row stay open', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Rule-based kill switch/ }));
    fireEvent.click(screen.getByRole('button', { name: /Manual kill switch/ }));
    expect(screen.getByText(/One red trade becomes five/)).toBeTruthy();
    /* The pain line, which appears only in the expanded detail — the summary
       and the fix share wording, so matching on that proves nothing. */
    expect(screen.getByText(/stop clicking/)).toBeTruthy();
  });

  /* An empty "promo code" box on a checkout is a standing hint that somebody
     else is paying less, and people leave to go looking for one. */
  it('keeps the coupon field behind a link', async () => {
    render(<BillingStep />);
    expect(await screen.findByRole('button', { name: /Have a coupon/ })).toBeTruthy();
    expect(screen.queryByPlaceholderText('Enter code')).toBeNull();
  });

  it('sends a typed coupon to checkout', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: ' save20 ' } });
    fireEvent.click(screen.getByRole('button', { name: /Start 7 days free/ }));
    await vi.waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0]).toMatchObject({ couponCode: 'save20' });
  });

  /*
   * A referral picked up from the link that brought them here. It was only
   * ever applied on the pricing page, so subscribing from setup lost the
   * attribution silently — the referee paid full price and the referrer was
   * never credited for a sale they made.
   */
  it('carries a referral code through setup without being asked', async () => {
    autoCoupon.value = 'REF123';
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Start 7 days free/ }));
    await vi.waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0]).toMatchObject({ couponCode: 'REF123' });
  });

  it('lets a typed code beat the one we carried for them', async () => {
    autoCoupon.value = 'REF123';
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'MINE' } });
    fireEvent.click(screen.getByRole('button', { name: /Start 7 days free/ }));
    await vi.waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(checkout.mock.calls[0][0]).toMatchObject({ couponCode: 'MINE' });
  });

  /* Dodo accepts an unknown code silently, so nothing may claim a discount
     before we have asked Dodo whether the code is real. */
  it('claims nothing until the code has been checked', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    expect(screen.getByText(/Press Apply to see the new price/i)).toBeTruthy();
    expect(screen.queryByText(/% off applied/)).toBeNull();
    // The full price still stands until something is actually applied.
    expect(screen.getByText(/First charge of ₹1,299/)).toBeTruthy();
  });

  it('prices the selected plan after Apply, and the timeline with it', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/15% off applied/);
    // Monthly ₹1,299 less 15% = ₹1,104, on the plan row and in the timeline.
    expect(screen.getAllByText('₹1,104').length).toBeGreaterThan(0);
    expect(screen.getByText(/First charge of ₹1,104/)).toBeTruthy();
  });

  it('says how long the discount lasts', async () => {
    validate.mockResolvedValue({ valid: true, code: 'FIRST', percentOff: 50, cycles: 1 });
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'first' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/Covers your first payment, then the full price/)).toBeTruthy();
  });

  /* A discount checked against one plan must never be shown against another:
     a coupon can be restricted to a single product. */
  it('drops the discount when the plan changes', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/15% off applied/);
    fireEvent.click(screen.getByRole('radio', { name: /Yearly/ }));
    expect(screen.queryByText(/15% off applied/)).toBeNull();
    expect(screen.getByText(/First charge of ₹8,999/)).toBeTruthy();
  });

  it.each([
    ['UNKNOWN', /don’t recognise that code/],
    ['EXPIRED', /has expired/],
    ['USED_UP', /fully claimed/],
    ['WRONG_PLAN', /doesn’t apply to this plan/],
  ])('explains a refused code (%s)', async (reason, text) => {
    validate.mockResolvedValue({ valid: false, reason });
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(text)).toBeTruthy();
  });

  /* Our lookup failing is not their code being wrong. Sending someone to
     check a spelling that is fine wastes their time on our problem. */
  it('blames itself, not the code, when the check fails', async () => {
    validate.mockRejectedValue(new Error('network'));
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/still be applied at checkout/)).toBeTruthy();
  });

  /*
   * Services answer { success, data }. The pricing page read res.data.checkoutUrl
   * and this step read res.checkoutUrl, so one of them was always wrong — the
   * API layer unwraps now and these pin the shape both ends agree on.
   */
  it('follows the checkout url the api returns', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Start 7 days free/ }));
    await vi.waitFor(() => expect(checkout).toHaveBeenCalled());
    expect(screen.queryByText(/Could not open checkout/)).toBeNull();
  });

  it('reads a coupon verdict straight off the api result', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    // Enveloped, this said "We don't recognise that code" for a valid one.
    expect(await screen.findByText(/15% off applied/)).toBeTruthy();
    expect(screen.queryByText(/don’t recognise/)).toBeNull();
  });

  /* The plain question a trial asks: what comes out of my account, and when.
     It matters most on a phone, where the protections list is hidden. */
  it('spells out what happens and when, in order', async () => {
    render(<BillingStep />);
    expect(await screen.findByText('Choose a plan')).toBeTruthy();
    expect(screen.getByText('₹0 today')).toBeTruthy();
    expect(screen.getByText(/₹1,299 on \d+ \w+/)).toBeTruthy();
    expect(screen.getByText('day 8, unless you cancel')).toBeTruthy();
  });

  /* Live figures, so the strip can never contradict the panel beside it. */
  it('follows the plan and the coupon', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('radio', { name: /Quarterly/ }));
    expect(screen.getByText(/₹3,299 on /)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Monthly/ }));
    expect(screen.getByText(/₹1,299 on /)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/15% off applied/);
    expect(screen.getByText(/₹1,104 on /)).toBeTruthy();
  });

  it('hides the status band once the guard is on', async () => {
    auth.user = { access: 'trial', isTrial: true };
    render(<BillingStep />);
    await screen.findByText('Due today');
    expect(screen.queryByText(/Your guard is off/)).toBeNull();
  });
});
