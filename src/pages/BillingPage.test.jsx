import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { lifecycleView } from '../lib/lifecycle';

/*
 * Plan & billing in each lifecycle case (spec §3.9 and each case's section).
 * The case comes from GuardContext; the subscription from AuthContext.
 */
const auth = { user: null, subscription: null };
const guard = { life: null };
const checkout = vi.fn(async () => ({ checkoutUrl: 'https://x' }));
const validate = vi.fn();
const siteOffer = { value: null };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 't', user: { email: 'a@b.c' } }, user: auth.user, subscription: auth.subscription, refetchSubscription: vi.fn() }),
}));
vi.mock('../context/GuardContext', () => ({
  useGuard: () => ({ selected: { rulesOn: 2, rulesTotal: 7 }, life: guard.life }),
}));
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => ({ accounts: [{ id: 'a' }] }) }));
vi.mock('../components/common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../api/pricingApi', () => ({
  getPricingPlans: vi.fn(async () => [{ slug: 'pro', intervals: [
    { interval: 'monthly', price: 1299 }, { interval: 'quarterly', price: 3299 }, { interval: 'yearly', price: 8999 },
  ] }]),
}));
vi.mock('../api/paymentsApi', () => ({
  openBillingPortal: vi.fn(), updateSubscriptionPaymentMethod: vi.fn(), createCheckoutSession: (...a) => checkout(...a),
  changeSubscriptionPlan: vi.fn(), cancelSubscriptionPlanChange: vi.fn(), cancelSubscription: vi.fn(), resumeSubscription: vi.fn(),
  fetchPendingPlanChange: vi.fn(async () => ({ pending: null })),
  validateCoupon: (...a) => validate(...a),
}));
vi.mock('../hooks/useActiveOffer', () => ({ useActiveOffer: () => ({ ready: true, offer: siteOffer.value, band: 'in' }) }));
vi.mock('../lib/referralCode', () => ({ getStoredReferralCode: () => null }));
vi.mock('../lib/promoLink', () => ({ getLinkPromoCode: () => null }));
vi.mock('../lib/analytics', () => ({ trackBilling: vi.fn() }));
vi.mock('../components/support/supportBus', () => ({ openSupport: vi.fn() }));
vi.mock('../components/dashboard/billing/BillingStep', () => ({
  default: ({ setupCta }) => <div>billing setup step{setupCta ? ` · ${setupCta.label}` : ''}</div>,
}));

import BillingPage from './BillingPage';
import { changeSubscriptionPlan } from '../api/paymentsApi';

const sub = (s) => ({ subscription: { status: 'active', source: 'payment', billingInterval: 'monthly', createdAt: '2026-10-08T00:00:00Z', ...s } });
const show = (lifeId, { user = {}, subscription = {}, ctx = {} } = {}) => {
  guard.life = lifecycleView(lifeId, ctx);
  auth.user = { email: 'a@b.c', planKnown: true, ...user };
  auth.subscription = sub(subscription);
  render(<MemoryRouter><BillingPage /></MemoryRouter>);
};

beforeEach(() => { checkout.mockClear(); validate.mockReset(); siteOffer.value = null; });

describe('Plan & billing, case by case', () => {
  it('s0 / s2: the billing setup step, saying "Continue setup"', async () => {
    show('s2');
    expect(await screen.findByText('billing setup step · Continue setup')).toBeTruthy();
  });

  it('s3: the billing setup step as it is', async () => {
    show('s3');
    expect(await screen.findByText('billing setup step')).toBeTruthy();
  });

  it('te: PLAN ENDED, never charged, Subscribe charges now', async () => {
    show('te', { user: { access: 'expired', isExpired: true }, subscription: { status: 'trialing', source: 'free', currentPeriodEnd: '2026-10-01T00:00:00Z' } });
    expect(await screen.findByText('PLAN ENDED')).toBeTruthy();
    expect(screen.getByText(/Your free trial has ended, so nothing is protecting your accounts/)).toBeTruthy();
    expect(screen.getByText('No invoices. You were never charged.')).toBeTruthy();
    expect(screen.getByText('Your data is safe')).toBeTruthy();
    // The hero button and the Monthly card both offer it.
    expect((await screen.findAllByRole('button', { name: 'Subscribe · ₹1,299' })).length).toBe(2);
  });

  describe('trial ended, an offer is on', () => {
    const lapsed = { user: { access: 'expired', isExpired: true }, subscription: { status: 'trialing', source: 'free', currentPeriodEnd: '2026-10-01T00:00:00Z' } };
    const OFFER = { code: 'DIWALI25', discountPct: 25, cycles: 1, intervals: ['monthly', 'quarterly', 'yearly'], audience: 'in', headline: 'DIWALI OFFER', title: null };

    it('prices every button at the offer and sends the code', async () => {
      siteOffer.value = OFFER;
      validate.mockResolvedValue({ valid: true, code: 'DIWALI25', percentOff: 25, cycles: 1 });
      show('te', lapsed);
      const buttons = await screen.findAllByRole('button', { name: 'Subscribe · ₹974' });
      expect(buttons.length).toBe(2);
      expect(screen.getByText('Diwali offer applied · 25% off your first payment')).toBeTruthy();
      expect(screen.getByText(/first payment, then ₹1,299 per month/)).toBeTruthy();
      fireEvent.click(buttons[0]);
      await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ interval: 'monthly', couponCode: 'DIWALI25' })));
    });

    it('shows list price until the server confirms the offer', async () => {
      siteOffer.value = OFFER;
      validate.mockResolvedValue({ valid: false, reason: 'EXPIRED' });
      show('te', lapsed);
      expect((await screen.findAllByRole('button', { name: 'Subscribe · ₹1,299' })).length).toBe(2);
      expect(screen.queryByText(/applied/)).toBeNull();
    });

    it('takes a typed code and reprices', async () => {
      validate.mockResolvedValue({ valid: true, code: 'SAVE10', percentOff: 10, cycles: null });
      show('te', lapsed);
      fireEvent.click(await screen.findByRole('button', { name: 'Have a coupon?' }));
      fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'save10' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      const good = await screen.findAllByRole('button', { name: 'Subscribe · ₹1,169' });
      fireEvent.click(good[0]);
      await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ couponCode: 'SAVE10' })));
    });

    it('a refused code is not sent, so checkout can still apply the offer', async () => {
      validate.mockResolvedValue({ valid: false, reason: 'UNKNOWN' });
      show('te', lapsed);
      fireEvent.click(await screen.findByRole('button', { name: 'Have a coupon?' }));
      fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'NOPE' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(await screen.findByText('We don’t recognise that code.')).toBeTruthy();
      fireEvent.click(screen.getAllByRole('button', { name: 'Subscribe · ₹1,299' })[0]);
      await waitFor(() => expect(checkout).toHaveBeenCalled());
      expect(checkout.mock.calls[0][0].couponCode).toBeUndefined();
    });

    it('a failed retry (pg) gets no coupon field: it pays through the portal', async () => {
      siteOffer.value = OFFER;
      show('pg', { user: { access: 'expired' }, subscription: { status: 'past_due' } });
      await screen.findAllByRole('button', { name: /^Pay / });
      expect(screen.queryByRole('button', { name: 'Have a coupon?' })).toBeNull();
      expect(validate).not.toHaveBeenCalled();
    });
  });

  it('lf: no active plan, never the word "Free"', async () => {
    show('lf', { user: { access: 'free' }, subscription: { status: 'active', source: 'free' } });
    expect(await screen.findByText('No active plan', { selector: 'span' })).toBeTruthy();
    expect(screen.getByText(/Your account has no active plan/)).toBeTruthy();
    expect(screen.queryByText(/\bFree plan\b/)).toBeNull();
  });

  it('pf: amount due, no grace bar, and cancelling stops the retries', async () => {
    show('pf', { user: { access: 'expired', isExpired: true }, subscription: { status: 'past_due', currentPeriodEnd: '2026-10-15T00:00:00Z' } });
    expect(await screen.findByText('PAYMENT FAILED')).toBeTruthy();
    expect(screen.getByText('AMOUNT DUE')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Pay ₹1,299 now' })).toBeTruthy();
    expect(screen.queryByText(/Grace period/)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText(/We stop retrying the payment/)).toBeTruthy();
    expect(screen.queryByText('Change billing period')).toBeNull();
  });

  it('tx: confirming, a PENDING invoice, no cancel', async () => {
    show('tx', { user: { access: 'trial', isTrial: true, trialAutoRenews: true }, subscription: { status: 'trialing', trialEndsAt: '2026-10-09T00:00:00Z' }, ctx: { autoRenews: true } });
    expect(await screen.findByText('CONFIRMING PAYMENT')).toBeTruthy();
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.queryByText('Cancel free trial')).toBeNull();
    expect(screen.queryByText('Cancel subscription')).toBeNull();
  });

  it('ac: complimentary, no invoices, no cancel — contact support', async () => {
    show('ac', { user: { access: 'active' }, subscription: { source: 'admin', currentPeriodEnd: '2027-03-31T00:00:00Z' } });
    expect(await screen.findByText('COMPLIMENTARY')).toBeTruthy();
    expect(screen.getByText('No invoices. Your plan is complimentary.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Contact support' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Cancel/)).toBeNull();
  });

  it('nr: checking, never styled as an error', async () => {
    show('nr', { user: { access: 'active' } });
    expect(await screen.findByText('CHECKING YOUR PLAN')).toBeTruthy();
    expect(screen.getByText('Invoices are unavailable right now.')).toBeTruthy();
  });

  it('tc: uses the trial end, says "Resume trial", no invoices', async () => {
    show('tc', { user: { access: 'trial', isTrial: true, subscriptionCanceled: true }, subscription: { status: 'canceled', trialEndsAt: '2026-10-15T00:00:00Z', currentPeriodEnd: null }, ctx: { endsAt: '2026-10-15T00:00:00Z' } });
    expect(await screen.findByText('CANCELLED')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Resume trial' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Trial ends 15 Oct/)).toBeTruthy();
    expect(screen.getByText('No invoices. You won’t be charged.')).toBeTruthy();
  });

  it('t1: the trial cancel line says the guard stays on until the end (spec ⚠)', async () => {
    show('t1', { user: { access: 'trial', isTrial: true, trialAutoRenews: true }, subscription: { status: 'trialing', trialEndsAt: '2026-10-15T00:00:00Z' }, ctx: { autoRenews: true } });
    expect(await screen.findByText('FREE TRIAL')).toBeTruthy();
    expect(screen.getByText(/Your guard stays on until 15 Oct 2026, then switches off\./)).toBeTruthy();
  });
});

describe('switching period on the same AutoPay', () => {
  it('asks first, says it is the existing AutoPay, and only then switches', async () => {
    changeSubscriptionPlan.mockClear();
    changeSubscriptionPlan.mockResolvedValue({ pending: null });
    show('p', { user: { access: 'active' }, subscription: { status: 'active', currentPeriodEnd: '2026-10-18T00:00:00Z' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Switch to Quarterly' }));
    // nothing sent yet: the question comes first
    expect(changeSubscriptionPlan).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Switch to Quarterly' });
    expect(dialog.textContent).toMatch(/₹3,299 every 3 months on your existing AutoPay\. Nothing to approve, nothing charged today\./);
    fireEvent.click(screen.getByRole('button', { name: /Keep/ }));
    expect(screen.queryByRole('dialog', { name: 'Switch to Quarterly' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Quarterly' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Switch to Quarterly' }).at(-1));
    await waitFor(() => expect(changeSubscriptionPlan).toHaveBeenCalledWith(expect.objectContaining({ interval: 'quarterly' })));
  });
});
