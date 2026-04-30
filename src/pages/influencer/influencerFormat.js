export function formatCents(cents, currency = 'USD') {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export const STATUS_STYLES = {
  pending: {
    label: 'Pending',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.3)',
    color: '#facc15',
  },
  approved: {
    label: 'Approved',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
  },
  paid: {
    label: 'Paid',
    bg: 'rgba(0, 212, 170, 0.12)',
    border: 'rgba(0, 212, 170, 0.3)',
    color: '#00d4aa',
  },
  voided: {
    label: 'Voided',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#f87171',
  },
};

export function describePayoutPlan(profile) {
  if (!profile) return '';
  const parts = [];
  if (profile.firstPaymentPct > 0) parts.push(`${profile.firstPaymentPct}% on first payment`);
  if (profile.recurringPct > 0) {
    const cap =
      profile.recurringCapMonths == null
        ? 'every renewal'
        : `each renewal for ${profile.recurringCapMonths} months`;
    parts.push(`${profile.recurringPct}% on ${cap}`);
  }
  if (parts.length === 0) return 'No commission configured';
  return parts.join(' + ');
}
