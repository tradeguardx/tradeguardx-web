import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastProvider';

/**
 * Where signup lands when Supabase is configured to require email confirmation.
 *
 * Before this page existed, signup bounced silently to /login with a toast — so
 * the user saw a sign-in form, tried the credentials they had just chosen, was
 * rejected, and had no idea an email was waiting. This makes the one required
 * action unmissable and gives them a way to re-send it.
 */
export default function VerifyEmailPage() {
  useSEO({ title: 'Verify your email', url: 'https://tradeguardx.com/verify-email' });

  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerificationEmail, session } = useAuth();
  const toast = useToast();
  const email = location.state?.email || '';
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Confirming in another tab signs them in here too — don't strand them on a
  // "check your email" screen once the email is verified.
  useEffect(() => {
    if (session?.access_token) navigate('/dashboard?welcome=1', { replace: true });
  }, [session?.access_token, navigate]);

  // Reached directly, without the address signup passed through router state.
  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail(email);
      toast.success('Email sent', 'Check your inbox — it can take a minute to arrive.');
      // Supabase rate-limits resends per address; this keeps users from
      // hammering the button into a longer server-side lockout.
      setCooldown(60);
    } catch (error) {
      toast.error('Could not resend', error?.message || 'Please wait a moment and try again.');
    } finally {
      setSending(false);
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
        className="relative w-full max-w-[460px]"
      >
        <div className="mb-8 text-center">
          <span
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: 'var(--accent, #00d4aa)' }}
          >
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </span>
          <h1 className="mb-2 font-display text-[28px] font-bold text-white">Confirm your email</h1>
          <p className="text-[15px] leading-relaxed text-slate-500">
            We sent a link to <span className="font-medium text-slate-300">{email}</span>. Click it and
            your account is live — trial included.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/70 p-7 shadow-xl shadow-black/25 backdrop-blur-xl">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-500">
            Didn’t get it?
          </p>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-slate-400">
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-accent/60" />
              Check spam and promotions — it can land there on the first email.
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-accent/60" />
              Give it a minute; delivery is usually instant but not always.
            </li>
          </ul>

          <button
            type="button"
            onClick={resend}
            disabled={sending || cooldown > 0}
            className="mt-5 h-12 w-full rounded-xl bg-accent text-[14px] font-semibold text-surface-950 shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend the email'}
          </button>

          <p className="mt-4 text-center text-[13px] text-slate-600">
            Wrong address?{' '}
            <Link to="/signup" className="font-medium text-accent transition-colors hover:text-accent-hover">
              Sign up again
            </Link>
          </p>
        </div>

        <p className="mt-7 text-center text-[14px] text-slate-600">
          Already confirmed?{' '}
          <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
