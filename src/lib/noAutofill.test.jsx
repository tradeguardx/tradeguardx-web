import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NO_AUTOFILL } from './noAutofill';
import SecretInput from '../components/common/SecretInput';
import { SecretTextarea, VenueExtraFields } from '../components/dashboard/VenueKeyFields';

const field = (ui) => {
  const { unmount } = render(ui);
  const el = screen.getByRole('textbox');
  const out = { autocomplete: el.getAttribute('autocomplete'), name: el.getAttribute('name'), type: el.getAttribute('type'), readOnly: el.readOnly };
  unmount();
  return out;
};

describe('exchange keys stay out of browser suggestions', () => {
  // Any other token reads as ON to Chrome's form history, which then stores
  // the pasted secret and offers it back.
  it('uses exactly autocomplete="off"', () => {
    expect(NO_AUTOFILL.autoComplete).toBe('off');
  });

  it.each([
    ['SecretInput', <SecretInput value="" onChange={() => {}} />],
    ['SecretTextarea', <SecretTextarea value="" onChange={() => {}} />],
    ['VenueExtraFields', <VenueExtraFields fields={[{ name: 'accountId', label: 'Account ID' }]} values={{}} onChange={() => {}} />],
  ])('%s: off, never a password field, and a new name each time', (_n, ui) => {
    const a = field(ui);
    const b = field(ui);
    expect(a.autocomplete).toBe('off');
    expect(a.type).not.toBe('password');
    expect(a.readOnly).toBe(true);
    expect(a.name).toMatch(/^f[a-z0-9]+$/);
    expect(b.name).not.toBe(a.name);
  });

  it('keeps its name while someone is typing', () => {
    render(<SecretInput value="" onChange={() => {}} />);
    const el = screen.getByRole('textbox');
    const before = el.name;
    fireEvent.focus(el);
    expect(el.readOnly).toBe(false);
    expect(el.name).toBe(before);
  });
});
