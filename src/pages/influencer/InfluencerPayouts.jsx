import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listInfluencerPayouts } from '../../api/influencerApi';
import { ShimmerBlock, EmptyState } from '../../components/common/LoadingSkeleton';
import { formatCents, formatDate } from './influencerFormat';

const PAGE_SIZE = 25;

function PayoutRow({ item }) {
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
          {formatDate(item.paidAt)}
        </p>
      </div>
      <div className="col-span-6 sm:col-span-3 text-xs uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>
        {item.method}
      </div>
      <div className="col-span-6 sm:col-span-3 text-xs font-mono break-all" style={{ color: 'var(--dash-text-muted)' }}>
        {item.externalReference || '—'}
      </div>
      <div className="col-span-12 sm:col-span-3 sm:text-right">
        <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--dash-text)' }}>
          {formatCents(item.totalAmountCents, item.currency)}
        </p>
      </div>
      {item.notes && (
        <div className="col-span-12 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
          {item.notes}
        </div>
      )}
    </div>
  );
}

export default function InfluencerPayouts() {
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
        const res = await listInfluencerPayouts({
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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--dash-text)' }}>
          Payouts
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
          Money sent to you. Approved commissions are batched and paid out manually for now.
        </p>
        {profile?.payoutMethod && (
          <p className="mt-1 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
            Default method: <span className="font-semibold uppercase">{profile.payoutMethod}</span>
          </p>
        )}
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
          Could not load payouts: {error.message}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Once your approved commissions cross the minimum payout threshold, your first payout will appear here."
        />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <PayoutRow key={item.id} item={item} />
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
