import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FounderHelp from './FounderHelp';

vi.mock('../../lib/analytics', () => ({ trackCtaClick: vi.fn() }));

describe('WhatsApp us, during setup', () => {
  it('opens WhatsApp with the step already typed, and never shows the number on the page', () => {
    render(<FounderHelp step="Connect key" />);
    const a = screen.getByRole('link', { name: /WhatsApp us/ });
    // Tests run as a dev build: a direct link. Production links to /whatsapp (vercel.json redirect).
    const url = new URL(a.getAttribute('href'));
    expect(url.hostname).toBe('wa.me');
    expect(url.searchParams.get('text')).toMatch(/step: Connect key/);
    expect(document.body.textContent).not.toMatch(/8770144119/);
  });
});
