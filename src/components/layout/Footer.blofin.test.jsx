import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

/* BloFin is paused (9 Nov 2026): its pages redirect to /exchanges, so the
   footer must not link there from any page. */
describe('footer BloFin link', () => {
  it('is gone everywhere while BloFin is paused', () => {
    for (const path of ['/', '/india', '/pricing']) {
      const { unmount } = render(<MemoryRouter initialEntries={[path]}><Footer /></MemoryRouter>);
      expect(screen.queryByRole('link', { name: 'BloFin' })).toBeNull();
      unmount();
    }
  });
});
