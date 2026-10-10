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
/* The free days this user actually gets, from the same function checkout
   uses. Defaults to the full window so the existing cases read as a new
   signup; the cohort cases below override it. */
let eligibility = { trialDays: 7, fullTrialDays: 7 };
vi.mock('../../../api/paymentsApi', () => ({
  createCheckoutSession: (...a) => checkout(...a),
  validateCoupon: (...a) => validate(...a),
  fetchTrialEligibility: async () => eligibility,
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
  eligibility = { trialDays: 7, fullTrialDays: 7 };
  checkout.mockClear();
  validate.mockClear();
  validate.mockResolvedValue({ valid: true, code: 'SAVE15', percentOff: 15, cycles: null });
  auth.user = { access: 'none', isTrial: false };
  autoCoupon.value = undefined;
});

describe('billing step', () => {
  it('says what the step is and what it costs', async () => {
    render(<BillingStep />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /Set up billing and get 7 days free/,
    );
    expect(screen.getByText('Pay ₹0 today')).toBeTruthy();
    // The date and amount of the first debit, once the server has answered.
    expect(await screen.findByText(/· ₹[\d,]+ on \d{1,2} \w{3} · cancel any time before\./)).toBeTruthy();
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
    /* And the rows above, because a code checked only against the selected
       plan leaves the other two showing a price nobody verified. */
    expect(screen.getByText('₹2,804')).toBeTruthy();
    expect(screen.getByText('₹7,649')).toBeTruthy();
  });

  it('says how long the discount lasts', async () => {
    validate.mockResolvedValue({ valid: true, code: 'FIRST', percentOff: 50, cycles: 1 });
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'first' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/Covers your first payment, then the full price/)).toBeTruthy();
  });

  it('keeps the discount when the plan changes, if it is good there too', async () => {
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/15% off applied/);
    fireEvent.click(screen.getByRole('radio', { name: /Yearly/ }));
    expect(screen.getByText(/15% off applied/)).toBeTruthy();
    expect(screen.getByText(/First charge of ₹7,649/)).toBeTruthy();
  });

  /*
   * A Dodo discount carries restricted_to, so a code can be real for monthly
   * and meaningless for yearly. Each row has to show its own verdict.
   */
  it('prices only the intervals the code is actually good for', async () => {
    validate.mockImplementation(async ({ interval }) =>
      interval === 'monthly'
        ? { valid: true, code: 'MONTHLY10', percentOff: 10, cycles: null }
        : { valid: false, reason: 'WRONG_PLAN' },
    );
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'monthly10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/10% off applied/);
    expect(screen.getByText('₹1,169')).toBeTruthy();
    // Quarterly and yearly keep their full prices, not a discount we never got.
    expect(screen.getByText('₹3,299')).toBeTruthy();
    expect(screen.getByText('₹8,999')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /Yearly/ }));
    expect(screen.getByText(/doesn’t apply to this plan/)).toBeTruthy();
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

  /* The badge is yearly's per-month against monthly's. A coupon good for
     every interval moves both, so the ratio — and the badge — hold. */
  it('leaves the savings badges alone when the coupon applies to everything', async () => {
    render(<BillingStep />);
    expect(await screen.findByText('SAVE 42%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'save15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/15% off applied/);
    expect(screen.getByText('SAVE 42%')).toBeTruthy();
    expect(screen.getByText('SAVE 15%')).toBeTruthy();
  });

  /*
   * But a monthly-only code does move it: yearly at ₹750/mo against a
   * discounted ₹1,169 is 36% cheaper, not 42%. Leaving it would advertise a
   * saving the customer cannot get.
   */
  it('recomputes the badges when the coupon is good for one interval only', async () => {
    validate.mockImplementation(async ({ interval }) =>
      interval === 'monthly'
        ? { valid: true, code: 'MONTHLY10', percentOff: 10, cycles: null }
        : { valid: false, reason: 'WRONG_PLAN' },
    );
    render(<BillingStep />);
    fireEvent.click(await screen.findByRole('button', { name: /Have a coupon/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'monthly10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/10% off applied/);
    expect(screen.queryByText('SAVE 42%')).toBeNull();
    expect(screen.getByText('SAVE 36%')).toBeTruthy();
    // And the per-month subline is measured the same way.
    expect(screen.getByText(/₹750\/mo · billed once a year/)).toBeTruthy();
  });

  it('hides the status band once the guard is on', async () => {
    auth.user = { access: 'trial', isTrial: true };
    render(<BillingStep />);
    await screen.findByText('Due today');
    expect(screen.queryByText(/Your guard is off/)).toBeNull();
  });
});

/**
 * THE NUMBER ON THIS SCREEN MUST BE THE NUMBER WE CHARGE.
 *
 * `TRIAL_DAYS = 7` was written into this file and promised seven free days
 * to everyone. Checkout does not use it — `trialDaysForUser` carries a
 * part-used trial across and gives nothing to one that has already ended.
 * The two disagreed, always against the customer.
 */
describe('billing step — the free window it promises', () => {
  /* Anchored on the pay panel: "Set up billing" appears in more than one
     place, and the day count only renders once prices have loaded. */
  const show = async () => { render(<BillingStep />); await screen.findByText('Choose how you pay'); };

  it('names the carried days for someone part-way through a trial', async () => {
    eligibility = { trialDays: 4, fullTrialDays: 7 };
    await show();
    /* Both the headline and the button carry it — someone who scrolls past
       one must not be able to read the other and get a different number. */
    expect((await screen.findAllByText(/4 days free/)).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/7 days free/)).toBeNull();
  });

  it('says "1 day", not "1 days", on the last day', async () => {
    eligibility = { trialDays: 1, fullTrialDays: 7 };
    await show();
    expect((await screen.findAllByText(/1 day free/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/1 days free/)).toBeNull();
  });

  /*
   * The worst case. 27 users are here: a legacy trial that has already run
   * out. They get ZERO free days and are charged on the spot — and this
   * screen used to tell them "7 days free · ₹0 charged today".
   */
  it('tells a lapsed trialist they are charged today, not that it is free', async () => {
    eligibility = { trialDays: 0, fullTrialDays: 7 };
    await show();
    expect(await screen.findByText(/first charge of .* is today/i)).toBeTruthy();
    expect(screen.queryByText(/days free/)).toBeNull();
    expect(screen.queryByText(/₹0 charged/)).toBeNull();
    expect(screen.queryByText(/Pay ₹0 today/)).toBeNull();
    expect(screen.queryByText(/Nothing is charged today/)).toBeNull();
    expect(screen.getByText(/is charged today/)).toBeTruthy();
  });

  /* A number is a promise about money; silence beats a guess. */
  it('states no day count until the server has answered', async () => {
    eligibility = new Promise(() => {});
    render(<BillingStep />);
    expect(await screen.findByText(/your free trial/i)).toBeTruthy();
    expect(screen.queryByText(/7 days free/)).toBeNull();
  });
});
