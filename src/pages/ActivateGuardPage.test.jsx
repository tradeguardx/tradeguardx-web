import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * This page owns only routing: who should not be here, and where they go.
 * Both of its redirects were wrong for the same person — a legacy no-card
 * trialist — and between them they made the page unreachable for the one
 * group the product was actively prompting to attach a card.
 */
const navigate = vi.fn();
const auth = { user: null };
const setup = { step: { key: 'pay', to: '/dashboard/activate' }, loading: false };

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useSetupStep', () => ({ useSetupStep: () => setup }));
vi.mock('../components/dashboard/billing/BillingStep', () => ({ default: () => <span>billing step</span> }));

const { default: ActivateGuardPage } = await import('./ActivateGuardPage');

beforeEach(() => {
  navigate.mockClear();
  auth.user = null;
  setup.step = { key: 'pay', to: '/dashboard/activate' };
  setup.loading = false;
});

describe('who gets sent away', () => {
  it('sends a paying customer to the guard — there is nothing to sell them', () => {
    auth.user = { planKnown: true, access: 'active' };
    render(<ActivateGuardPage />);
    expect(navigate).toHaveBeenCalledWith('/dashboard/live', { replace: true });
  });

  it('sends a mandate trialist to the guard — a method is already attached', () => {
    auth.user = { planKnown: true, access: 'trial', isTrial: true, trialAutoRenews: true };
    render(<ActivateGuardPage />);
    expect(navigate).toHaveBeenCalledWith('/dashboard/live', { replace: true });
  });

  /*
   * The bug. `isTrial` is true for a no-card trial too, so the one group
   * being told "set up billing" was bounced to Live guard every time they
   * followed the prompt.
   */
  it('lets a no-card trialist reach the billing step', () => {
    auth.user = { planKnown: true, access: 'trial', isTrial: true, trialAutoRenews: false };
    const { getByText } = render(<ActivateGuardPage />);
    expect(navigate).not.toHaveBeenCalled();
    expect(getByText('billing step')).toBeTruthy();
  });

  it('does not bounce someone who cancelled and wants to resubscribe to the key page', () => {
    auth.user = { planKnown: true, access: 'trial', isTrial: true, subscriptionCanceled: true };
    render(<ActivateGuardPage />);
    expect(navigate).toHaveBeenCalledWith('/dashboard/live', { replace: true });
  });
});

describe('nothing to protect yet', () => {
  it('refuses to price an account that does not exist', () => {
    setup.step = { key: 'account', to: '/dashboard/setup' };
    const { queryByText } = render(<ActivateGuardPage />);
    expect(navigate).toHaveBeenCalledWith('/dashboard/setup', { replace: true });
    expect(queryByText('billing step')).toBeNull();
  });

  /*
   * A missing key makes the ask weaker — their balance cannot be named — but
   * not dishonest, and it is no reason to refuse someone trying to keep the
   * trial they are already on. This used to redirect, which is what made the
   * prompt circular: attach a card → here is the key page.
   */
  it('still takes a payment method from someone with an account but no key', () => {
    auth.user = { planKnown: true, access: 'trial', isTrial: true, trialAutoRenews: false };
    setup.step = { key: 'key', to: '/dashboard/connect' };
    const { getByText } = render(<ActivateGuardPage />);
    expect(navigate).not.toHaveBeenCalled();
    expect(getByText('billing step')).toBeTruthy();
  });

  it('renders nothing while the step is still unknown', () => {
    setup.loading = true;
    setup.step = null;
    const { container } = render(<ActivateGuardPage />);
    expect(navigate).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });
});
