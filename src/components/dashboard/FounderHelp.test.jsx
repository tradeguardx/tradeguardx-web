import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../lib/analytics', () => ({ trackCtaClick: vi.fn() }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function mount(env) {
  if (env) vi.stubEnv('VITE_FOUNDER_WHATSAPP', env);
  const { default: FounderHelp } = await import('./FounderHelp');
  render(<FounderHelp step="Connect key" />);
}

describe('talk to the founder, during setup', () => {
  it('opens WhatsApp straight to the founder, with the step already typed, never showing the number', async () => {
    await mount('+91 98765 43210');
    const a = screen.getByRole('link', { name: /WhatsApp us/ });
    const url = new URL(a.getAttribute('href'));
    expect(url.origin + url.pathname).toBe('https://wa.me/919876543210');
    expect(url.searchParams.get('text')).toMatch(/step: Connect key/);
    expect(document.body.textContent).not.toMatch(/98765/);
  });

  it('falls back to Telegram until the number is set', async () => {
    await mount(null);
    expect(screen.getByRole('link', { name: /Message us on Telegram/ }).getAttribute('href')).toMatch(/^https:\/\/t\.me\//);
  });
});
