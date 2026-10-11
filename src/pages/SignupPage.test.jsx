import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const signup = vi.fn(async () => ({ requiresEmailConfirmation: true }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ signup, loginWithGoogle: vi.fn(), session: null }) }));
vi.mock('../components/common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('../hooks/useSEO', () => ({ useSEO: () => {} }));

const { default: SignupPage } = await import('./SignupPage');

/* The email path's name. It was dropped from the form once without anyone
   noticing, and new accounts showed up nameless in the admin and the emails. */
describe('signup', () => {
  it('records the name the user typed', async () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '  Asha Rao ' } });
    fireEvent.change(screen.getByPlaceholderText(/you@|email/i), { target: { value: 'asha@example.com' } });
    fireEvent.change(document.getElementById('signup-password'), { target: { value: 'Str0ng-pass-123' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(signup).toHaveBeenCalledWith('asha@example.com', 'Str0ng-pass-123', 'Asha Rao'));
  });
});
