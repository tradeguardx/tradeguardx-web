import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * "/" is the global homepage (visitor's currency, India-only parts hidden
 * outside India); "/india" is the Indian page, rupees for everyone.
 */

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../components/landing/TradingInAction', () => ({ default: () => null }));
vi.mock('../components/landing/story/StoryAIJournal', () => ({ default: () => null }));
vi.mock('../components/landing/HeroLiveDemo', () => ({ default: () => null }));

let country = 'US';
vi.mock('../lib/geo', async (orig) => {
  const real = await orig();
  return {
    ...real,
    guessCountrySync: () => null,
    detectCountry: async () => country,
    loadRates: async () => ({ ...real.FALLBACK_RATES, USD: 0.0105 }),
  };
});

globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const { default: CryptoHomePage } = await import('./CryptoHomePage');

function renderPage(variant) {
  return render(<MemoryRouter><CryptoHomePage variant={variant} /></MemoryRouter>);
}

const monthly = (c) => c.querySelector('[data-inr="1299"]').textContent;

describe('homepage variants', () => {
  beforeEach(() => { country = 'US'; });

  it('"/" from the US: global copy, approximate dollar prices', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(monthly(container)).toBe('≈ $14'));
    expect(container.querySelector('.tgx-home').dataset.region).toBe('global');
    expect(document.title).toBe("Crypto Trading Kill Switch You Can't Bypass — TradeGuardX");
    // Example amounts become round local figures.
    expect(container.querySelector('[data-inr="25000"]').textContent).toBe('$275');
  });

  it('"/" from India: rupees and the Indian copy', async () => {
    country = 'IN';
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.tgx-home').dataset.region).toBe('in'));
    expect(monthly(container)).toBe('₹1,299');
    // Rupees, but still the global page: "India's first" is /india's line.
    expect(container.querySelector('.tgx-home').dataset.variant).toBe('global');
  });

  it('"/india" is rupees whoever is looking', async () => {
    const { container } = renderPage('india');
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.tgx-home').dataset.region).toBe('in');
    expect(container.querySelector('.tgx-home').dataset.variant).toBe('india');
    expect(monthly(container)).toBe('₹1,299');
    expect(container.querySelector('[data-inr="25000"]').textContent).toBe('₹25,000');
    expect(document.title).toBe("India's First Crypto Trading Kill Switch — TradeGuardX");
  });

  it('lists every venue in the strip, once for readers', () => {
    const { container } = renderPage();
    const visible = container.querySelector('.xbanner-marquee .xbanner-lockup:not([aria-hidden])');
    expect(visible.textContent).toMatch(/Delta[\s\S]*CoinDCX[\s\S]*Shark[\s\S]*exness[\s\S]*BloFin[\s\S]*Bybit[\s\S]*Bitget/);
    expect(container.querySelectorAll('.xbanner-marquee .xbanner-lockup[aria-hidden="true"]')).toHaveLength(1);
  });
});
