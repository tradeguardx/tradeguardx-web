import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';

/**
 * "Verify your email" nag inside the dashboard.
 *
 * This is the other half of the confirmation story: when Supabase does NOT force
 * confirmation, a new user lands straight in the product (best activation) and
 * this banner carries the ask instead of a wall.
 *
 * Deliberately NOT dismissible. An unverified address isn't cosmetic here — it's
 * the channel breach alerts are delivered on, so a typo'd email means the kill
 * switch fires and the user never hears about it.
 */
export default function VerifyEmailBanner() {
  const { session, resendVerificationEmail } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const authUser = session?.user;
  const email = authUser?.email ?? '';
  // Google accounts arrive pre-verified; only password signups can be pending.
  const verified = Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  if (!authUser || verified || !email) return null;

  const resend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail(email);
      toast.success('Email sent', `We sent a confirmation link to ${email}.`);
      setCooldown(60);
    } catch (error) {
      toast.error('Could not resend', error?.message || 'Please wait a moment and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5"
      style={{
        borderColor: 'rgba(245,158,11,0.28)',
        backgroundColor: 'rgba(245,158,11,0.06)',
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }}
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>
            Confirm your email to receive breach alerts
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
            We sent a link to <span className="font-medium">{email}</span>. Until it’s confirmed we can’t
            email you when a rule trips.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={resend}
        disabled={sending || cooldown > 0}
        className="flex-shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors disabled:opacity-50"
        style={{ backgroundColor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend email'}
      </button>
    </motion.div>
  );
}
