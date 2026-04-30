import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listInfluencerCommissions } from '../../api/influencerApi';
import { ShimmerBlock, EmptyState } from '../../components/common/LoadingSkeleton';
import { formatCents, formatDate, STATUS_STYLES } from './influencerFormat';

const PAGE_SIZE = 25;

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
      {style.label}
    </span>
  );
}

function CommissionRow({ item, currency }) {
  const eventLabel = item.eventType === 'first_payment' ? 'First payment' : 'Renewal';
  return (
    <div
      className="grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{
        borderColor: 'var(--dash-border)',
        backgroundColor: 'var(--dash-bg-card)',
      }}
    >
      <div className="col-span-12 sm:col-span-3">
        <p className="text-sm font-medium" style={{ color: 'var(--dash-text)' }}>
          {formatDate(item.paymentAt)}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--dash-text-muted)' }}>
          {item.customerHandle}
        </p>
      </div>
      <div className="col-span-6 sm:col-span-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
        {eventLabel}
      </div>
      <div className="col-span-6 sm:col-span-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
        Gross: <span className="font-semibold" style={{ color: 'var(--dash-text)' }}>{formatCents(item.grossAmountCents, item.currency || currency)}</span>
      </div>
      <div className="col-span-6 sm:col-span-3">
        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--dash-text)' }}>
          {formatCents(item.commissionCents, item.currency || currency)}
        </p>
        <p className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          {item.commissionPct}% commission
        </p>
      </div>
      <div className="col-span-6 sm:col-span-2 flex justify-end">
        <StatusBadge status={item.status} />
      </div>
      {item.status === 'voided' && item.voidReason && (
        <div className="col-span-12 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          Voided: {item.voidReason === 'refund' ? 'customer refunded' : item.voidReason === 'subscription_cancelled' ? 'subscription cancelled within hold' : 'admin'}
        </div>
      )}
    </div>
  );
}

export default function InfluencerCommissions() {
  const { profile } = useOutletContext();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.access_token) return;
      setLoading(true);
      try {
        const res = await listInfluencerCommissions({
          accessToken: session.access_token,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!cancelled) {
          setData(res?.data ?? res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token, page]);

  const currency = profile?.currency || 'USD';
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--dash-text)' }}>
          Commissions
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          Every commission you've accrued. Status updates automatically as the hold window passes.
        </p>
      </header>

      {error ? (
        <div
          className="rounded-2xl border p-5 text-sm"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.2)',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            color: '#f87171',
          }}
        >
          Could not load commissions: {error.message}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No commissions yet"
          description="Once a customer signs up using your coupon code, you'll see commissions appear here."
        />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <CommissionRow key={item.id} item={item} currency={currency} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
