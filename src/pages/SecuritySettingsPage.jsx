import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import PasswordField from '../components/common/PasswordField';
import { pwStrength, validatePasswordPair, MIN_PASSWORD_LENGTH } from '../lib/password';

/**
 * Account → Security. Changing your password while signed in.
 *
 * Two cases the UI has to tell apart:
 *  - Password accounts: ask for the current password first. Supabase doesn't
 *    require it, but without that check an unlocked laptop is enough to lock the
 *    real owner out of an account wired to a live exchange key.
 *  - Google-only accounts: there is no password to change. Rather than showing a
 *    form that fails, we explain where sign-in is actually managed.
 */
export default function SecuritySettingsPage() {
  const { user, session, updatePassword, verifyPassword } = useAuth();
  const toast = useToast();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [currentError, setCurrentError] = useState(null);
  const [saving, setSaving] = useState(false);

  const str = useMemo(() => pwStrength(password), [password]);

  // Which sign-in methods this account actually has. A Google user who has never
  // set a password has 'google' only.
  const providers = session?.user?.app_metadata?.providers
    ?? (session?.user?.app_metadata?.provider ? [session.user.app_metadata.provider] : []);
  const hasPassword = providers.includes('email');
  const googleOnly = providers.length > 0 && !hasPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCurrentError(null);

    const problem = validatePasswordPair(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    if (password === current) {
      setError('That’s your current password — choose a different one.');
      return;
    }

    setSaving(true);
    try {
      const ok = await verifyPassword(user?.email, current);
      if (!ok) {
        setCurrentError('That password is incorrect.');
        return;
      }
      await updatePassword(password);
      setCurrent('');
      setPassword('');
      setConfirm('');
      toast.success('Password updated', 'Use your new password next time you sign in.');
    } catch (err) {
      toast.error('Could not update password', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: 'var(--dash-border)',
          backgroundColor: 'var(--dash-bg-raised)',
          boxShadow: 'var(--dash-shadow-card)',
        }}
      >
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--dash-text-primary)' }}>
          Password
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          {googleOnly
            ? 'This account signs in with Google.'
            : 'Change the password you use to sign in.'}
        </p>

        {googleOnly ? (
          <div
            className="mt-5 rounded-xl border p-4 text-sm leading-relaxed"
            style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
          >
            You created this account with <span className="font-semibold text-slate-200">Continue with Google</span>,
            so there’s no TradeGuardX password to change. Your sign-in security — password,
            2-step verification — is managed in your Google account.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
            <PasswordField
              id="current-password"
              label="Current password"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
              error={currentError}
            />

            <div className="h-px" style={{ backgroundColor: 'var(--dash-border)' }} />

            <PasswordField
              id="account-new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            />

            {password && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= str.n ? str.cls : 'bg-surface-700/60'}`}
                    />
                  ))}
                </div>
                <span className={`text-[11px] font-medium ${str.text}`}>{str.label}</span>
              </div>
            )}

            <PasswordField
              id="account-confirm-password"
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              error={error}
            />

            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-accent px-6 text-[14px] font-semibold text-surface-950 transition-all hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
