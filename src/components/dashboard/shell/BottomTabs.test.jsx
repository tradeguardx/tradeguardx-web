/**
 * The tab bar's badges are a verdict about whether someone is protected, shown
 * on the surface they glance at most. So they follow the same rule as the rest
 * of the dashboard: say nothing until the data has loaded.
 *
 * A grey or amber dot rendered from unloaded state reads as "not protected" to
 * a user who is — the same false alarm as the guard flashing "Not protected"
 * at an armed account. That one was a real bug, and this is a new surface with
 * the same failure mode, so it is pinned before it ships rather than after.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let guardState = { loaded: false };
vi.mock('../../../context/GuardContext', () => ({
  useGuard: () => ({ selected: guardState }),
}));

const { default: BottomTabs } = await import('./BottomTabs');

function mount(selected, onMore = vi.fn()) {
  guardState = selected;
  const utils = render(
    <MemoryRouter initialEntries={['/dashboard/overview']}>
      <BottomTabs onMore={onMore} />
    </MemoryRouter>,
  );
  return { ...utils, onMore };
}

/** Coloured status dots are aria-hidden spans with a border-radius of 50%. */
function dots(container) {
  return [...container.querySelectorAll('span[aria-hidden]')].filter(
    (el) => el.style.borderRadius === '50%',
  );
}

describe('the mobile tab bar', () => {
  it('shows the destinations you use while trading', () => {
    mount({ loaded: true, guard: 'armed', account: {} });
    for (const label of ['Home', 'Live', 'Rules', 'Journal', 'More']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('shows no status dot at all before the guard has loaded', () => {
    // The critical case. Unknown must look like unknown, not like unprotected.
    const { container } = mount({ loaded: false });
    expect(dots(container)).toHaveLength(0);
  });

  it('marks Live when the guard is armed', () => {
    const { container } = mount({ loaded: true, guard: 'armed', account: {} });
    expect(dots(container)).toHaveLength(1);
  });

  it('warns on Live when an account is connected but not armed', () => {
    const { container } = mount({ loaded: true, guard: 'off', account: {} });
    // One on Live, one on More — the drawer is where the fix lives.
    expect(dots(container).length).toBeGreaterThanOrEqual(1);
  });

  it('opens the drawer from More rather than navigating', () => {
    const onMore = vi.fn();
    mount({ loaded: true, guard: 'armed', account: {} }, onMore);
    screen.getByRole('button', { name: /more navigation/i }).click();
    expect(onMore).toHaveBeenCalledTimes(1);
  });
});

/**
 * The bar is a PHONE navigation. On desktop the sidebar is permanently visible,
 * so a tab bar there is a second copy of the same nav — and it also collided
 * with the support chat, which is gated to desktop-only on the same 900px
 * boundary. For a while both were on screen at once.
 *
 * The cause was that `display:flex` was declared in the element's inline style.
 * sx() returns a React style object, so it landed as `style="display:flex"`, and
 * an inline style beats a stylesheet rule whether or not that rule is inside a
 * media query. `@media ... { .tgx-tabbar { display:none } }` could never win.
 *
 * jsdom applies no stylesheet, so a test cannot observe the bar being hidden.
 * What it CAN observe is the thing that made hiding impossible — so that is
 * what is pinned.
 */
describe('visibility is left to CSS', () => {
  it('declares no display in the inline style', () => {
    const { container } = mount({ loaded: true, guard: 'armed', account: {} });
    const bar = container.querySelector('.tgx-tabbar');
    expect(bar).toBeTruthy();
    expect(bar.style.display).toBe('');
  });

  it('keeps the class the stylesheet targets', () => {
    // The media query selects on this class. Renaming it here without renaming
    // it in index.css brings the bar back on desktop.
    const { container } = mount({ loaded: true, guard: 'armed', account: {} });
    expect(container.querySelector('nav.tgx-tabbar')).toBeTruthy();
  });
});

