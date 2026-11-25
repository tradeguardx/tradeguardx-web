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
  it('keeps every page on its existing URL; Plan & billing is no longer a tab', () => {
    expect(SETTINGS_TABS.map((t) => t.to)).toEqual(['/dashboard/alerts', '/dashboard/account/security']);
  });

  it('lights the Settings sidebar item on its two pages and nowhere else', () => {
    expect(isSettingsPath('/dashboard/alerts')).toBe(true);
    expect(isSettingsPath('/dashboard/account/security')).toBe(true);
    expect(isSettingsPath('/dashboard/account/billing')).toBe(false);
    expect(isSettingsPath('/dashboard/account/trading')).toBe(false);
    expect(isSettingsPath('/dashboard/alertsx')).toBe(false);
  });

  it('marks the open tab and keeps its query string', () => {
    at('/dashboard/account/security?from=menu');
    const sec = screen.getByRole('link', { name: /Security/ });
    expect(sec.getAttribute('aria-current')).toBe('page');
    expect(sec.getAttribute('href')).toBe('/dashboard/account/security?from=menu');
    expect(screen.getByRole('link', { name: 'Alerts' }).getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('link', { name: /Plan & billing/ })).toBeNull();
  });

  it('flags the tab that needs a fix', () => {
    life = { badges: { security: '!' } };
    at('/dashboard/alerts');
    expect(screen.getByRole('link', { name: /Security/ }).textContent).toContain('!');
    life = null;
  });
});
