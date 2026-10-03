import { afterEach, describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { useThemeScope } from './themeScope';

/**
 * The bug this guards against is silent: a portalled overlay renders outside
 * [data-dash-theme], every var(--surface)/var(--line)/var(--mint-solid)
 * resolves to nothing, and you get a modal with no panel, no borders and no
 * button fills. Nothing throws, no test fails — you only find it by looking.
 */
function Portalled({ open = true }) {
  const ref = useThemeScope();
  if (!open) return null;
  return createPortal(<div ref={ref} data-testid="scope"><span>hi</span></div>, document.body);
}

// The hook queries the whole document, so a shell left behind by one test is
// the shell the next one finds.
const shells = [];
afterEach(() => { while (shells.length) shells.pop().remove(); });

function withShell(attrs) {
  const shell = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) shell.setAttribute(k, v);
  document.body.appendChild(shell);
  shells.push(shell);
  return shell;
}

describe('useThemeScope', () => {
  it('mirrors the shell’s token attributes onto the portal', () => {
    withShell({ 'data-tgx': '1', 'data-dash-theme': 'dark', 'data-accent': 'ion', 'data-chrome': 'flat' });
    const { getByTestId } = render(<Portalled />);
    const el = getByTestId('scope');
    expect(el.getAttribute('data-dash-theme')).toBe('dark');
    expect(el.getAttribute('data-accent')).toBe('ion');
    expect(el.getAttribute('data-chrome')).toBe('flat');
  });

  it('does not copy data-tgx', () => {
    // [data-tgx] carries `display:flex;min-height:100vh`. Copying it would add
    // a full-height flex box to the end of <body> on every modal open.
    withShell({ 'data-tgx': '1', 'data-dash-theme': 'dark' });
    const { getByTestId } = render(<Portalled />);
    expect(getByTestId('scope').hasAttribute('data-tgx')).toBe(false);
  });

  it('follows a theme change made while the modal is open', async () => {
    const shell = withShell({ 'data-dash-theme': 'dark', 'data-accent': 'signal' });
    const { getByTestId } = render(<Portalled />);
    await act(async () => {
      shell.setAttribute('data-dash-theme', 'light');
      // MutationObserver callbacks are a microtask.
      await Promise.resolve();
    });
    expect(getByTestId('scope').getAttribute('data-dash-theme')).toBe('light');
  });

  it('is harmless with no dashboard shell on the page', () => {
    const { getByTestId } = render(<Portalled />);
    expect(getByTestId('scope').hasAttribute('data-dash-theme')).toBe(false);
  });

  it('scopes a modal that was mounted closed and opened later', () => {
    // The shape every modal in this app has: mounted for the whole session,
    // returning null until it is opened. A mount-time layout effect runs here
    // against a node that does not exist yet and, with an empty dependency
    // list, never runs again — which is exactly how this shipped broken once.
    withShell({ 'data-dash-theme': 'dark', 'data-accent': 'ion' });
    const { rerender, getByTestId } = render(<Portalled open={false} />);
    rerender(<Portalled open />);
    expect(getByTestId('scope').getAttribute('data-dash-theme')).toBe('dark');
    expect(getByTestId('scope').getAttribute('data-accent')).toBe('ion');
  });
});
