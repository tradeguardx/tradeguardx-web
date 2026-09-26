/**
 * Smoke: the venue pages render from the URL alone, and an unknown one 404s.
 *
 * The bug this whole restructure fixes was not a crash — it was a page that
 * rendered perfectly while being invisible to search, because the venue came
 * from `useState` instead of the path. A build cannot catch that and neither can
 * looking at the page. What catches it is mounting at a URL with no interaction
 * and asserting the right venue came back.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import ExchangeIndexPage from '../pages/exchanges/ExchangeIndexPage';
import ExchangeHubPage from '../pages/exchanges/ExchangeHubPage';
import ExchangeGuidePage from '../pages/exchanges/ExchangeGuidePage';
import DocsPage from '../pages/DocsPage';
import { VENUE_ORDER, venuePageFor } from '../lib/venueSeo';
import { guidesFor } from '../lib/venueGuides';

function mountAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exchanges" element={<ExchangeIndexPage />} />
        <Route path="/exchanges/:venue" element={<ExchangeHubPage />} />
        <Route path="/exchanges/:venue/:guide" element={<ExchangeGuidePage />} />
        <Route path="/help" element={<DocsPage />} />
        <Route path="/help/:slug" element={<DocsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('venue routing comes from the URL, not from state', () => {
  it.each(VENUE_ORDER)('/exchanges/%s renders that venue', (slug) => {
    const { unmount } = mountAt(`/exchanges/${slug}`);
    const venue = venuePageFor(slug);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(venue.h1);
    unmount();
  });

  it('every guide renders at its own URL', () => {
    for (const slug of VENUE_ORDER) {
      for (const g of guidesFor(slug)) {
        const { unmount } = mountAt(`/exchanges/${slug}/${g.slug}`);
        expect(screen.getByRole('heading', { level: 1 }), `${slug}/${g.slug}`).toHaveTextContent(g.title);
        unmount();
      }
    }
  });

  it('the index links to every venue', () => {
    mountAt('/exchanges');
    for (const slug of VENUE_ORDER) {
      expect(
        screen.getAllByRole('link').some((a) => a.getAttribute('href') === `/exchanges/${slug}`),
        slug,
      ).toBe(true);
    }
  });

  it('a live venue hub shows the rules table and marks the alert-only rules', () => {
    mountAt('/exchanges/shark');
    expect(screen.getByText('Max Drawdown Lock')).toBeInTheDocument();
    // Two rules alert and never close. If this pill ever reads "Closes & locks"
    // we have sold a floor that does not exist.
    expect(screen.getAllByText('Alert only')).toHaveLength(2);
  });
});

describe('unknown URLs 404 instead of quietly redirecting', () => {
  // Each of these used to answer 200 with another page's content — a soft 404,
  // which Google keeps and files as a duplicate of the page it landed on.
  it.each([
    ['an unknown venue', '/exchanges/binance'],
    ['an unknown guide', '/exchanges/delta/withdrawals'],
    ['a removed venue', '/exchanges/bybit'],
    ['a removed venue\'s guide', '/exchanges/bitget/api-key'],
    ['an unknown help slug', '/help/getting-started'],
  ])('%s 404s', (_label, path) => {
    const { unmount } = mountAt(path);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/doesn't exist/i);
    unmount();
  });

  it('the 404 is noindex', () => {
    mountAt('/exchanges/binance');
    expect(document.querySelector('meta[name="robots"][content*="noindex"]')).toBeTruthy();
  });
});

describe('/help keeps only the shared articles', () => {
  it('has no per-venue setup article left', () => {
    mountAt('/help');
    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/help/getting-started'),
    ).toBe(false);
  });

  it('sends setup questions to the venue pages instead', () => {
    mountAt('/help');
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/exchanges/delta/api-key');
    expect(hrefs).toContain('/exchanges/coindcx/api-key');
    expect(hrefs).toContain('/exchanges/shark/api-key');
  });
});
