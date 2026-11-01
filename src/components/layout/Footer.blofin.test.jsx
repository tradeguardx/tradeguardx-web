import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

/* BloFin is for traders outside India (FIU-IND): the site-wide footer links
   its page everywhere except on India pages. */
function at(path) {
  render(<MemoryRouter initialEntries={[path]}><Footer /></MemoryRouter>);
}

describe('footer BloFin link', () => {
  it('is there on global pages', () => {
    at('/');
    expect(screen.getByRole('link', { name: 'BloFin' })).toHaveAttribute('href', '/exchanges/blofin');
  });

  it('is left out on India pages', () => {
    for (const path of ['/india', '/crypto-tax-india', '/blog/best-crypto-risk-management-tools-india']) {
      const { unmount } = render(<MemoryRouter initialEntries={[path]}><Footer /></MemoryRouter>);
      expect(screen.queryByRole('link', { name: 'BloFin' })).toBeNull();
      unmount();
    }
  });
});
