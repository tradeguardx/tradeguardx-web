/**
 * The guide's failure path, which is the only part that matters under stress.
 *
 * It renders while someone is mid-connect, often holding an API secret the
 * venue will not show a second time. Delta's screenshots were bundled under
 * /public precisely so this screen could not break at that moment; moving them
 * to Supabase storage gave that guarantee up, and fallbackSrc buys it back.
 *
 * So: hosted first, bundled copy if that fails, caption text if both do. A
 * broken-image icon at that moment reads as "the product is broken" to someone
 * who cannot retry the step.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_t, tag) => (props) => {
    const { children, ...rest } = props;
    const El = String(tag);
    return <El {...rest}>{children}</El>;
  } }),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const { default: AppGuide } = await import('./AppGuide');

const HOSTED = 'https://cdn.example/step-1.png';
const BUNDLED = '/guide/delta-app/step-1.png';
const CAPTION = 'Step 1 — Open Delta and tap Algo Hub';

const steps = [{ src: HOSTED, fallbackSrc: BUNDLED, alt: CAPTION }];

function open(props = {}) {
  return render(<AppGuide open onClose={vi.fn()} steps={steps} {...props} />);
}

describe('when a hosted screenshot fails', () => {
  it('shows the hosted image first', () => {
    open();
    expect(screen.getByAltText(CAPTION).getAttribute('src')).toBe(HOSTED);
  });

  it('falls back to the bundled copy rather than showing nothing', () => {
    open();
    fireEvent.error(screen.getByAltText(CAPTION));
    expect(screen.getByAltText(CAPTION).getAttribute('src')).toBe(BUNDLED);
  });

  it('shows the caption as text only when both are gone', () => {
    open();
    fireEvent.error(screen.getByAltText(CAPTION)); // hosted dies
    fireEvent.error(screen.getByAltText(CAPTION)); // bundled dies too
    expect(screen.queryByAltText(CAPTION)).toBeNull();
    // The caption IS the instruction, so the step is still followable.
    expect(screen.getByText(CAPTION)).toBeTruthy();
  });

  it('offers the venue page when there is nothing left to show', () => {
    open({ docsUrl: 'https://delta.example/keys' });
    fireEvent.error(screen.getByAltText(CAPTION));
    fireEvent.error(screen.getByAltText(CAPTION));
    expect(screen.getByRole('link', { name: /exchange/i }).getAttribute('href')).toBe('https://delta.example/keys');
  });
});

describe('a venue with no walkthrough', () => {
  it('renders nothing rather than an empty lightbox', () => {
    const { container } = render(<AppGuide open onClose={vi.fn()} steps={[]} />);
    expect(container.textContent).toBe('');
  });
});
