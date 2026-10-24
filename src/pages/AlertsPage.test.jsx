import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/geo', () => ({
  guessCountrySync: () => 'IN',
  detectCountry: () => Promise.resolve(null),
}));
const api = vi.hoisted(() => ({
  fetchNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  createTelegramBindingLink: vi.fn(),
  disconnectTelegram: vi.fn(),
}));
vi.mock('../api/notificationsApi', () => api);
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' }, session: { access_token: 't' } }),
}));
vi.mock('../context/GuardContext', () => ({ useGuard: () => ({ refresh: vi.fn() }) }));
vi.mock('../components/common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const { AlertsSettings } = await import('./AlertsPage');

const SETTINGS = {
  emailNotificationsEnabled: false,
  notificationEmail: null,
  telegramNotificationsEnabled: false,
  telegramConnected: false,
  telegramPending: false,
  notificationMinSeverity: 'warning',
  mobileNotificationsEnabled: true,
  phonePrompted: true,
};

/**
 * The mobile number on the Alerts page is stored E.164 for any country. It
 * used to strip a hard-coded "+91" and save `+91${digits}`.
 */
describe('Alerts mobile number', () => {
  it('shows a stored non-Indian number in its own country, not dirty', async () => {
    api.fetchNotificationSettings.mockResolvedValue({ ...SETTINGS, phone: '+971501234567' });
    render(<AlertsSettings />);
    await waitFor(() => expect(screen.getByLabelText('Mobile number')).toHaveValue('050 123 4567'));
    expect(screen.getByRole('button', { name: /country code/i })).toHaveTextContent('+971');
    // Mobile row's Save — the only one rendered (email channel is off)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables Save only for a valid, changed number and saves E.164', async () => {
    api.fetchNotificationSettings.mockResolvedValue({ ...SETTINGS, phone: '+919876543210' });
    api.updateNotificationSettings.mockResolvedValue({ ...SETTINGS, phone: '+447400123456' });
    render(<AlertsSettings />);
    const field = await screen.findByDisplayValue('98765 43210');
    const save = screen.getByRole('button', { name: 'Save' });

    // the same number typed again, re-formatted: not a change
    fireEvent.change(field, { target: { value: '9876543210' } });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: '98765' } });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: '+44 7400 123456' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(api.updateNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+447400123456' }),
    ));
  });
});
