import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getInfluencerStats } from '../../api/influencerApi';
import { StatCardSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCents, describePayoutPlan } from './influencerFormat';

function StatCard({ label, value, sub, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 transition-all hover:translate-y-[-1px]"
      style={{
        borderColor: 'var(--dash-border)',
        backgroundColor: 'var(--dash-bg-card)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--dash-text-muted)' }}>
          {label}
        </p>
        {accent && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: 'var(--dash-text)' }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard write blocked — fail silently */
        }
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function InfluencerOverview() {
  const { profile } = useOutletContext();
  const { session } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.access_token) return;
      setStatsLoading(true);
      try {
        const res = await getInfluencerStats({ accessToken: session.access_token });
        if (!cancelled) {
          setStats(res?.data ?? res);
          setStatsError(null);
        }
      } catch (e) {
        if (!cancelled) setStatsError(e);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const currency = profile?.currency || 'USD';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--dash-text)' }}>
          Welcome back
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          Track your referrals, commissions, and payouts in one place.
        </p>
      </header>

      {/* Share link card */}
      <section
        className="rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: 'var(--dash-border)',
          backgroundColor: 'var(--dash-bg-card)',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--dash-text-muted)' }}>
              Your share link
            </p>
            <p className="mt-2 text-lg font-semibold break-all" style={{ color: 'var(--dash-text)' }}>
              {profile?.shareUrl}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
              <span>
                Coupon code: <span className="font-mono font-semibold text-accent">{profile?.couponCode}</span>
              </span>
              <span>·</span>
              <span>{profile?.customerDiscountPct}% off for the customer</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {profile?.shareUrl && <CopyButton text={profile.shareUrl} />}
            {profile?.couponCode && <CopyButton text={profile.couponCode} />}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--dash-text-muted)' }}>
          Earnings
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : statsError ? (
          <div
            className="rounded-2xl border p-5 text-sm"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.2)',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              color: '#f87171',
            }}
          >
            Could not load stats: {statsError.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Lifetime earnings"
              value={formatCents(stats?.lifetimeEarningsCents, currency)}
              sub="All commissions ever (excl. voided)"
              accent="#00d4aa"
            />
            <StatCard
              label="Pending"
              value={formatCents(stats?.pendingCents, currency)}
              sub="In hold window"
              accent="#facc15"
            />
            <StatCard
              label="Approved"
              value={formatCents(stats?.approvedCents, currency)}
              sub="Payable, not yet paid"
              accent="#60a5fa"
            />
            <StatCard
              label="Paid out"
              value={formatCents(stats?.paidCents, currency)}
              sub={`This month: ${formatCents(stats?.thisMonthEarningsCents, currency)}`}
              accent="#a78bfa"
            />
            <StatCard
              label="Voided"
              value={formatCents(stats?.voidedCents, currency)}
              sub="Refunded or cancelled"
              accent="#f87171"
            />
          </div>
        )}
      </section>

      {/* Plan summary + referrals */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: 'var(--dash-border)',
            backgroundColor: 'var(--dash-bg-card)',
          }}
        >
          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--dash-text-muted)' }}>
            Your payout plan
          </p>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--dash-text)' }}>
            {describePayoutPlan(profile)}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt style={{ color: 'var(--dash-text-muted)' }}>Hold period</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: 'var(--dash-text)' }}>
                {profile?.holdPeriodDays} days
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--dash-text-muted)' }}>Min payout</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: 'var(--dash-text)' }}>
                {formatCents(profile?.minPayoutCents, currency)}
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--dash-text-muted)' }}>Currency</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: 'var(--dash-text)' }}>
                {currency}
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--dash-text-muted)' }}>Refund policy</dt>
              <dd className="mt-0.5 font-semibold" style={{ color: 'var(--dash-text)' }}>
                {profile?.voidOnCancellation ? 'Refund + cancel' : 'Refund only'}
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: 'var(--dash-border)',
            backgroundColor: 'var(--dash-bg-card)',
          }}
        >
          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--dash-text-muted)' }}>
            Referrals
          </p>
          {statsLoading ? (
            <div className="mt-2 h-8 w-20 rounded-lg animate-shimmer" style={{ background: 'linear-gradient(90deg, var(--dash-skeleton, rgba(255,255,255,0.06)) 0%, rgba(255,255,255,0.13) 50%, var(--dash-skeleton, rgba(255,255,255,0.06)) 100%)', backgroundSize: '400% 100%' }} />
          ) : (
            <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: 'var(--dash-text)' }}>
              {stats?.totalReferrals ?? 0}
            </p>
          )}
          <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
            Unique customers who used your code (excluding voided)
          </p>
          {!statsLoading && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--dash-border)' }}>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--dash-text-muted)' }}>
                Revenue driven
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: 'var(--dash-text)' }}>
                {formatCents(stats?.lifetimeGrossCents, currency)}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
                Total customer payments (excl. refunds)
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
