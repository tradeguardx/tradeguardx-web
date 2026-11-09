import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

/* Bybit is for traders outside India: the footer links its page everywhere
   except on India pages. */
describe('footer Bybit link', () => {
  it('is there on global pages', () => {
    render(<MemoryRouter initialEntries={['/']}><Footer /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Bybit' })).toHaveAttribute('href', '/exchanges/bybit');
  });

  it('is left out on India pages', () => {
    for (const path of ['/india', '/crypto-tax-india', '/blog/best-crypto-risk-management-tools-india']) {
      const { unmount } = render(<MemoryRouter initialEntries={[path]}><Footer /></MemoryRouter>);
      expect(screen.queryByRole('link', { name: 'Bybit' })).toBeNull();
      unmount();
    }
  });
});
