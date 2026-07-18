import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';

/**
 * Step one of password recovery: ask for the email, send the link.
 *
 * On success we show the same confirmation regardless of whether the address
 * has an account. Saying "no account with that email" would let anyone test
 * addresses against our user list, and the reassurance isn't worth that.
 */
export default function ForgotPasswordPage() {
  useSEO({ title: 'Reset your password', url: 'https://tradeguardx.com/forgot-password' });

  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { requestPasswordReset } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (error) {
      // Rate limiting is the realistic failure here, and that one IS worth
      // surfacing — otherwise the user retries into a longer lockout.
      toast.error('Could not send the email', error?.message || 'Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ring = focused
    ? 'border-accent/40 bg-surface-800/80 ring-1 ring-accent/20'
    : 'border-surface-700/60 bg-surface-800/50 hover:border-surface-600/60';

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
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-[15px] text-slate-500">
            {sent
              ? 'If that address has an account, a reset link is on its way.'
              : 'We’ll email you a link to set a new one.'}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/70 p-7 shadow-xl shadow-black/25 backdrop-blur-xl sm:p-8">
          {sent ? (
            <div className="text-center">
              <span
                className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: 'var(--accent, #00d4aa)' }}
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <p className="text-[14px] leading-relaxed text-slate-400">
                We sent a link to <span className="font-medium text-slate-200">{email}</span>. It expires in
                one hour and can only be used once.
              </p>
              <p className="mt-4 text-[13px] text-slate-600">
                Nothing in your inbox after a few minutes? Check spam, or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  try another address
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-[13px] font-medium text-slate-400">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`h-12 w-full rounded-xl border px-4 text-[14px] text-white placeholder-slate-600 transition-all focus:outline-none ${ring}`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-12 w-full rounded-xl bg-accent text-[14px] font-semibold text-surface-950 shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30 disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="pt-1 text-center text-[12px] leading-relaxed text-slate-600">
                Signed up with Google? You don’t have a password — just use{' '}
                <span className="text-slate-500">Continue with Google</span> on the sign-in page.
              </p>
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
