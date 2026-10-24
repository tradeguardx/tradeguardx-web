import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

// No network and a fixed visitor country: the IP lookup must not race tests.
const geo = vi.hoisted(() => ({ guess: 'IN', detected: null }));
vi.mock('../../lib/geo', () => ({
  guessCountrySync: () => geo.guess,
  detectCountry: () => Promise.resolve(geo.detected),
}));

const { default: PhoneInput } = await import('./PhoneInput');

function Harness({ initial = '', onChange, ...rest }) {
  const [value, setValue] = useState(initial);
  return (
    <PhoneInput
      value={value}
      onChange={(e164, meta) => { setValue(e164); onChange?.(e164, meta); }}
      {...rest}
    />
  );
}

const countryButton = () => screen.getByRole('button', { name: /country code/i });
const numberField = () => screen.getByLabelText('Mobile number');

describe('PhoneInput', () => {
  it('defaults to the visitor country and emits E.164 + validity as you type', () => {
    geo.guess = 'IN';
    const onChange = vi.fn();
    render(<Harness onChange={onChange} detect={false} />);
    expect(countryButton()).toHaveTextContent('+91');

    fireEvent.change(numberField(), { target: { value: '98765' } });
    // a partial E.164 is fine to emit — `valid` is what callers gate on
    expect(onChange).toHaveBeenLastCalledWith('+9198765', expect.objectContaining({ valid: false, empty: false }));

    fireEvent.change(numberField(), { target: { value: '9876543210' } });
    expect(numberField()).toHaveValue('98765 43210');
    expect(onChange).toHaveBeenLastCalledWith('+919876543210', expect.objectContaining({ valid: true, country: 'IN' }));
  });

  it('switches country when a full international number is pasted', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} detect={false} />);
    fireEvent.change(numberField(), { target: { value: '+44 7911 123456' } });

    // +44 7911 is a Guernsey range — what matters is the code and the number.
    expect(countryButton()).toHaveTextContent('+44');
    expect(numberField()).toHaveValue('07911 123456');
    expect(onChange).toHaveBeenLastCalledWith('+447911123456', expect.objectContaining({ valid: true }));

    fireEvent.change(numberField(), { target: { value: '+971501234567' } });
    expect(countryButton()).toHaveAccessibleName(/United Arab Emirates \+971/);
    expect(onChange).toHaveBeenLastCalledWith('+971501234567', expect.objectContaining({ valid: true, country: 'AE' }));
  });

  it('typing +971 turns the flag to the UAE before any local digit', () => {
    geo.guess = 'IN';
    const onChange = vi.fn();
    render(<Harness onChange={onChange} detect={false} />);
    expect(countryButton()).toHaveTextContent('+91');

    fireEvent.change(numberField(), { target: { value: '+971' } });
    expect(countryButton()).toHaveAccessibleName(/United Arab Emirates \+971/);
    expect(numberField()).toHaveValue('+971');

    // …and keeps going to a whole number, which then shows as the local part.
    fireEvent.change(numberField(), { target: { value: '+971 50 123 4567' } });
    expect(countryButton()).toHaveAccessibleName(/United Arab Emirates/);
    expect(onChange).toHaveBeenLastCalledWith('+971501234567', expect.objectContaining({ valid: true, country: 'AE' }));
  });

  it('00971 is read as +971', () => {
    render(<Harness detect={false} />);
    fireEvent.change(numberField(), { target: { value: '00971' } });
    expect(countryButton()).toHaveAccessibleName(/United Arab Emirates \+971/);
  });

  it('a shared code shows its main country, then the whole number decides', () => {
    render(<Harness detect={false} />);
    fireEvent.change(numberField(), { target: { value: '+1' } });
    expect(countryButton()).toHaveAccessibleName(/United States \+1/);
    // 604 is Vancouver: once the number is whole it is Canada, not the US.
    fireEvent.change(numberField(), { target: { value: '+1 604 555 1234' } });
    expect(countryButton()).toHaveAccessibleName(/Canada \+1/);
  });

  it('loads a stored E.164 into country + national number', () => {
    render(<Harness initial="+971501234567" detect={false} />);
    expect(countryButton()).toHaveTextContent('+971');
    expect(numberField()).toHaveValue('050 123 4567');
  });

  it('re-seeds when the stored value arrives after mount (settings load)', () => {
    const { rerender } = render(<PhoneInput value="" onChange={() => {}} detect={false} />);
    rerender(<PhoneInput value="+12025550123" onChange={() => {}} detect={false} />);
    expect(countryButton()).toHaveTextContent('+1');
    expect(numberField()).toHaveValue('(202) 555-0123');
  });

  it('picks a country from the searchable list and re-reads the number', () => {
    geo.guess = 'IN';
    const onChange = vi.fn();
    render(<Harness onChange={onChange} detect={false} />);
    fireEvent.change(numberField(), { target: { value: '501234567' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ valid: false }));

    fireEvent.click(countryButton());
    const search = screen.getByRole('combobox', { name: /search countries/i });
    fireEvent.change(search, { target: { value: 'emirates' } });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('United Arab Emirates');
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(countryButton()).toHaveTextContent('+971');
    expect(onChange).toHaveBeenLastCalledWith('+971501234567', expect.objectContaining({ valid: true, country: 'AE' }));
  });

  it('closes the list on Escape without changing the country', () => {
    render(<Harness detect={false} />);
    fireEvent.click(countryButton());
    expect(countryButton()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(countryButton()).toHaveTextContent('+91');
  });

  it('lets the IP lookup correct the guess only before the field is touched', async () => {
    geo.guess = 'IN';
    geo.detected = 'AE';
    render(<Harness />);
    await waitFor(() => expect(countryButton()).toHaveTextContent('+971'));
  });
});
