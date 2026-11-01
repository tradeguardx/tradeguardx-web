import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The strip is driven by the API offer (useActiveOffer), never by env, and
 * says exactly what the coupon does.
 */

const state = { value: { ready: false, offer: null, band: null } };
vi.mock('../../hooks/useActiveOffer', () => ({ useActiveOffer: () => state.value }));
vi.mock('../../lib/foundingMember', () => ({ getFoundingMemberConfig: () => null }));
vi.mock('../../api/pricingApi', () => ({
  getPricingPlans: async () => [{ slug: 'pro', name: 'Pro', priceMonthly: 1299, currency: 'INR', features: { primary: true } }],
}));

globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };

const { default: ActivePromo } = await import('./ActivePromo');

const DIWALI = {
  code: 'DIWALI30', discountPct: 30, cycles: 1, intervals: ['monthly', 'quarterly', 'yearly'],
  audience: 'in', headline: 'DIWALI OFFER', title: null, theme: 'diwali', endsAt: Date.now() + 3 * 86400000,
};
const renderStrip = () => render(<MemoryRouter><ActivePromo /></MemoryRouter>);

beforeEach(() => {
  sessionStorage.clear();
  state.value = { ready: false, offer: null, band: null };
});

describe('ActivePromo', () => {
  it('shows nothing until the offer and band have answered', () => {
    renderStrip();
    expect(screen.queryByRole('region', { name: /promotion/i })).toBeNull();
  });

  it('shows nothing when there is no applicable offer', () => {
    state.value = { ready: true, offer: null, band: 'in' };
    renderStrip();
    expect(screen.queryByRole('region', { name: /promotion/i })).toBeNull();
  });

  it('says "first payment — any plan" for the Diwali offer, with the real first-month price', async () => {
    state.value = { ready: true, offer: DIWALI, band: 'in' };
    renderStrip();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('30% off your first payment — any plan');
    expect(screen.getByText('DIWALI OFFER')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy code DIWALI30' })).toBeTruthy();
    expect(await screen.findByText('Pro from ₹909 for your first month')).toBeTruthy();
    expect(screen.getByText(/then ₹1,299\/mo/)).toBeTruthy();
  });

  it('says "first month" for a monthly-only first-payment offer', () => {
    state.value = { ready: true, offer: { ...DIWALI, intervals: ['monthly'], theme: null }, band: 'in' };
    renderStrip();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^30% off your first month$/);
  });

  it('draws the Diwali sky only for theme diwali', () => {
    state.value = { ready: true, offer: DIWALI, band: 'in' };
    const { container, unmount } = renderStrip();
    expect(container.querySelector('[data-diwali-sky]')).not.toBeNull();
    expect(container.querySelector('[data-offer-theme="diwali"]')).not.toBeNull();
    unmount();
    state.value = { ready: true, offer: { ...DIWALI, theme: null }, band: 'in' };
    const again = renderStrip();
    expect(again.container.querySelector('[data-diwali-sky]')).toBeNull();
  });
});
