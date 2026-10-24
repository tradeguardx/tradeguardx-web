import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const geo = vi.hoisted(() => ({ guess: 'IN' }));
vi.mock('../../lib/geo', () => ({
  guessCountrySync: () => geo.guess,
  detectCountry: () => Promise.resolve(null),
}));
const api = vi.hoisted(() => ({
  fetchNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));
vi.mock('../../api/notificationsApi', () => api);
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: { access_token: 't' } }),
}));
vi.mock('../common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const { default: PhonePrompt } = await import('./PhonePrompt');

/**
 * The first-time prompt used to be India-only (+91, exactly 10 digits). It now
 * takes any country and saves E.164; Save stays off until the number is valid.
 */
describe('PhonePrompt', () => {
  async function open() {
    api.fetchNotificationSettings.mockResolvedValue({ phone: null, phonePrompted: false });
    api.updateNotificationSettings.mockResolvedValue({});
    render(<PhonePrompt />);
    return screen.findByRole('dialog');
  }

  it('keeps Save disabled until the number is valid, then saves E.164', async () => {
    await open();
    const save = screen.getByRole('button', { name: /save & get alerts/i });
    const field = await screen.findByLabelText('Mobile number'); // lazy chunk
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: '98765' } });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: '9876543210' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(api.updateNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919876543210', markPhonePrompted: true }),
    ));
  });

  it('saves a non-Indian number pasted in international form', async () => {
    await open();
    fireEvent.change(await screen.findByLabelText('Mobile number'), { target: { value: '+971 50 123 4567' } });
    expect(screen.getByRole('button', { name: /country code/i })).toHaveTextContent('+971');
    fireEvent.click(screen.getByRole('button', { name: /save & get alerts/i }));
    await waitFor(() => expect(api.updateNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+971501234567' }),
    ));
  });

  it('starts on the visitor country, not always India', async () => {
    geo.guess = 'GB';
    await open();
    expect(await screen.findByRole('button', { name: /country code/i })).toHaveTextContent('+44');
    geo.guess = 'IN';
  });
});
