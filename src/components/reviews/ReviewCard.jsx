import { StarRow } from './Stars';
import './reviews.css';

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "2026-08" → "Aug 2026". */
const monthLabel = (ym) => (ym ? MONTH.format(new Date(`${ym}-01T00:00:00`)) : '');
const dayLabel = (iso) => (iso ? DAY.format(new Date(iso)) : '');

/**
 * "Verified · Delta Exchange, CoinDCX +2 · since Aug 2026". At most two names,
 * so a trader with four venues gets a badge, not a paragraph; the full list is
 * in the tooltip. `compact` drops the date for tight rows.
 */
export function VerifiedBadge({ exchanges = [], traderSince, compact = false }) {
  const shown = exchanges.slice(0, 2).join(', ');
  const more = exchanges.length > 2 ? ` +${exchanges.length - 2}` : '';
  return (
    <span className="rvw-badge" title={exchanges.length ? `Connected: ${exchanges.join(', ')}` : undefined}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
      Verified · {shown || 'Exchange trader'}
      {more}
      {!compact && traderSince ? ` · since ${monthLabel(traderSince)}` : ''}
    </span>
  );
}

/**
 * One review as the public sees it. A hidden review renders as a dashed stub
 * with its name, badge, date and the reason, and none of its words: the page
 * promises that nothing disappears silently, and this is where that is kept.
 */
export default function ReviewCard({ review, delay = 0, animate = true }) {
  const r = review;
  return (
    <article className={`rvw-card ${animate ? 'in' : ''} ${r.hidden ? 'rvw-hidden' : ''}`} style={{ '--d': `${delay}s` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{r.displayName}</p>
          <div style={{ marginTop: 6 }}>
            <VerifiedBadge exchanges={r.exchanges} traderSince={r.traderSince} />
          </div>
        </div>
        {!r.hidden && r.rating ? <StarRow value={r.rating} /> : null}
      </div>

      {r.hidden ? (
        <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--rv-ink-3)' }}>
          Review hidden: {r.hidden.reason}.
        </p>
      ) : (
        <>
          {r.title && <h3 style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 700 }}>{r.title}</h3>}
          <p style={{ margin: r.title ? '6px 0 0' : '14px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'var(--rv-ink-2)', whiteSpace: 'pre-line' }}>
            {r.body}
          </p>
        </>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--rv-ink-3)' }}>
        {dayLabel(r.createdAt)}
        {r.editedAt ? ' · edited' : ''}
      </p>

      {r.reply && (
        <div className="rvw-reply">
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--rv-mint)' }}>Reply from TradeGuardX</p>
          <p style={{ margin: '5px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--rv-ink-2)', whiteSpace: 'pre-line' }}>{r.reply.body}</p>
        </div>
      )}
    </article>
  );
}
