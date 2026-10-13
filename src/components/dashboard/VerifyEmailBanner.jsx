import { useEffect, useState } from 'react';
import NoticeCard from './shell/NoticeCard';
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
    <NoticeCard
      title="Confirm your email so we can alert you"
      body={<>We sent a link to <b style={{ color: 'var(--ink)' }}>{email}</b>. Until it’s confirmed we can’t email you when a rule trips.</>}
      cta={{ label: cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend email', onClick: resend, disabled: sending || cooldown > 0, arrow: false }}
      style={{ marginBottom: 20 }}
    />
  );
}
