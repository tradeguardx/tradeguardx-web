import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let life = null;
vi.mock('../../../context/GuardContext', () => ({ useGuard: () => ({ ready: true, life }) }));

import { SettingsTabs } from './SettingsTabs';
import { isSettingsPath, SETTINGS_TABS } from './settingsNav';

function at(path) {
  return render(<MemoryRouter initialEntries={[path]}><SettingsTabs /></MemoryRouter>);
}

describe('Settings tabs', () => {
  it('keeps every page on its existing URL', () => {
    expect(SETTINGS_TABS.map((t) => t.to)).toEqual(['/dashboard/alerts', '/dashboard/account/billing', '/dashboard/account/security']);
  });

  it('lights the Settings sidebar item on all three pages and nowhere else', () => {
    expect(isSettingsPath('/dashboard/alerts')).toBe(true);
    expect(isSettingsPath('/dashboard/account/billing')).toBe(true);
    expect(isSettingsPath('/dashboard/account/security')).toBe(true);
    expect(isSettingsPath('/dashboard/account/trading')).toBe(false);
    expect(isSettingsPath('/dashboard/alertsx')).toBe(false);
  });

  it('marks the open tab and keeps its query string', () => {
    at('/dashboard/account/billing?status=success');
    const billing = screen.getByRole('link', { name: /Plan & billing/ });
    expect(billing.getAttribute('aria-current')).toBe('page');
    expect(billing.getAttribute('href')).toBe('/dashboard/account/billing?status=success');
    expect(screen.getByRole('link', { name: 'Alerts' }).getAttribute('aria-current')).toBeNull();
  });

  it('flags the tab that needs a fix', () => {
    life = { badges: { plan: '!' } };
    at('/dashboard/alerts');
    expect(screen.getByRole('link', { name: /Plan & billing/ }).textContent).toContain('!');
    life = null;
  });
});
