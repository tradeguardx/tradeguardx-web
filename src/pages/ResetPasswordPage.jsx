import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import PasswordField from '../components/common/PasswordField';
import { pwStrength, validatePasswordPair, MIN_PASSWORD_LENGTH } from '../lib/password';

/**
 * Step two of password recovery: the page the emailed link opens.
 *
 * The link carries a recovery token in the URL fragment. The Supabase client
 * consumes it on load and turns it into a short-lived session — which is what
 * authorises the password change, so there's no "current password" to ask for
 * here. If that exchange doesn't happen (expired link, already used, opened in
 * a different browser than the fragment survived), we say so plainly instead of
 * showing a form that can only fail on submit.
 */
export default function ResetPasswordPage() {
  useSEO({ title: 'Set a new password', url: 'https://tradeguardx.com/reset-password' });

  const [status, setStatus] = useState('checking'); // checking | ready | invalid
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const str = useMemo(() => pwStrength(password), [password]);

  useEffect(() => {
    let settled = false;
    const done = (next) => {
      if (!settled) {
        settled = true;
        setStatus(next);
      }
    };

    // Supabase puts failures in the fragment (expired/used link) — read it
    // before waiting on a session that will never arrive.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error') || hash.get('error_description')) {
      done('invalid');
      return undefined;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) done('ready');
    });

    // The listener covers the token exchange racing ahead of this mount; this
    // covers it having already finished.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) done('ready');
    });

    // Nothing after a beat means no usable token.
    const timer = window.setTimeout(() => done('invalid'), 4000);

    return () => {
      listener?.subscription?.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validatePasswordPair(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success('Password updated', 'You’re signed in with your new password.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error('Could not update password', err?.message || 'Please request a fresh link and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[160px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-[440px]"
      >
        <div className="mb-10 text-center">
          <h1 className="mb-1.5 font-display text-[28px] font-bold text-white">
            {status === 'invalid' ? 'That link has expired' : 'Set a new password'}
          </h1>
          <p className="text-[15px] text-slate-500">
            {status === 'invalid'
              ? 'Reset links last one hour and work only once.'
              : 'Choose something you don’t use anywhere else.'}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/70 p-7 shadow-xl shadow-black/25 backdrop-blur-xl sm:p-8">
          {status === 'checking' && (
            <p className="py-6 text-center text-[14px] text-slate-500">Verifying your link…</p>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <p className="text-[14px] leading-relaxed text-slate-400">
                Request a new one and we’ll email you a fresh link.
              </p>
              <Link
                to="/forgot-password"
                className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-semibold text-surface-950 shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover"
              >
                Send a new link
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="new-password"
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
                id="confirm-password"
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                error={error}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-12 w-full rounded-xl bg-accent text-[14px] font-semibold text-surface-950 shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30 disabled:opacity-60"
              >
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-7 text-center text-[14px] text-slate-600">
          <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
