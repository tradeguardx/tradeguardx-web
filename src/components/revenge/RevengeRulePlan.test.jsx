import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RulePlan from './RevengeRulePlan';

const report = {
  checks: [{ id: 'reentry', title: 'Re-entry speed after a loss', status: 'problem', weight: 25, value: 33, unit: '%', fix: { rule: 'close-after-losses', text: 'Close after N losses: stop.' } }],
  revengeTrades: 4,
};
const inTheme = (theme) => render(
  <MemoryRouter>
    <div data-dash-theme={theme} data-accent="signal"><RulePlan report={report} cta={{ label: 'x', to: '/', trial: true }} /></div>
  </MemoryRouter>,
);

describe('the rule plan stands out from the page', () => {
  it('is light on the dark dashboard, keeping the accent', () => {
    const { container } = inTheme('dark');
    const section = container.querySelector('section.rv-plan');
    expect(section.getAttribute('data-dash-theme')).toBe('light');
    expect(section.getAttribute('data-accent')).toBe('signal');
  });

  it('is dark on the light dashboard', () => {
    const { container } = inTheme('light');
    expect(container.querySelector('section.rv-plan').getAttribute('data-dash-theme')).toBe('dark');
  });
});
