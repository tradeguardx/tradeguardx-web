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

const monthly = (c) => c.querySelector('[data-plan="monthly"]').textContent;
const yearly = (c) => c.querySelector('[data-plan="yearly"]:not([data-field])').textContent;
const yearlyPerMonth = (c) => c.querySelector('[data-plan="yearly"][data-field="perMonth"]').textContent;
const yearlySave = (c) => c.querySelector('[data-save="yearly"]').textContent;

describe('homepage variants', () => {
  beforeEach(() => { country = 'US'; });

  it('"/" from the US: global copy, Band A dollar prices, exact', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(monthly(container)).toBe('$29'));
    expect(yearly(container)).toBe('$249');
    expect(yearlyPerMonth(container)).toBe('$20.75');
    expect(yearlySave(container)).toBe('28');
    expect(container.querySelector('.tgx-home').dataset.region).toBe('global');
    expect(document.title).toBe("Crypto Trading Kill Switch You Can't Bypass — TradeGuardX");
    // Example amounts become round local figures.
    expect(container.querySelector('[data-inr="25000"]').textContent).toBe('$275');
  });

  it('"/" from Thailand: Band B dollar prices', async () => {
    country = 'TH';
    const { container } = renderPage();
    await waitFor(() => expect(monthly(container)).toBe('$15'));
    expect(yearly(container)).toBe('$129');
    expect(container.querySelector('[data-plan="quarterly"]:not([data-field])').textContent).toBe('$39');
  });

  it('"/" from India: rupees and the Indian copy', async () => {
    country = 'IN';
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.tgx-home').dataset.region).toBe('in'));
    expect(monthly(container)).toBe('₹1,299');
    expect(yearlyPerMonth(container)).toBe('₹750');
    expect(yearlySave(container)).toBe('42');
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

  it('lists only the live venues in the hero, untagged', () => {
    const { container } = renderPage();
    const chips = [...container.querySelector('.xbanner-lockup').children].map((c) => c.textContent.trim());
    expect(chips).toEqual(['Delta', 'CoinDCX', 'Shark', 'Exness']);
    expect(container.querySelector('.xbanner-lockup').textContent).not.toMatch(/BloFin|Bybit|Bitget|Soon|Live/i);
    expect(container.querySelector('.xbanner-marquee')).toBeNull();
  });
});
