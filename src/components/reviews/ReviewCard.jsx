import VenueMark from '../dashboard/VenueMark';
import { StarRow } from './Stars';
import './reviews.css';

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "2026-08" → "Aug 2026". */
const monthLabel = (ym) => (ym ? MONTH.format(new Date(`${ym}-01T00:00:00`)) : '');
const dayLabel = (iso) => (iso ? DAY.format(new Date(iso)) : '');

/** A stable hue per name, so avatars differ without being random on every render. */
function hueFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/**
 * "Verified · Delta Exchange, CoinDCX +2 · since Aug 2026". Used by the form,
 * where there is no room for the logo row. At most two names; the full list is
 * in the tooltip. `compact` drops the date.
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

function Shield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" fill="currentColor" opacity=".18" />
      <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12.2l2 2 4-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Overlapping exchange logos, max four, names on hover and for screen readers. */
function ExchangeStack({ exchanges }) {
  if (!exchanges?.length) return null;
  const shown = exchanges.slice(0, 4);
  const extra = exchanges.length - shown.length;
  return (
    <div className="rvw-trades" aria-label={`Trades on ${exchanges.join(', ')}`} title={exchanges.join(' · ')}>
      <span className="rvw-trades-label">Trades on</span>
      <span className="rvw-stack">
        {shown.map((name) => (
          <span key={name} className="rvw-stack-item">
            <VenueMark slug={name.toLowerCase()} name={name} size={28} radius={8} />
          </span>
        ))}
        {extra > 0 && <span className="rvw-stack-more">+{extra}</span>}
      </span>
    </div>
  );
}

/**
 * One review as the public sees it. A hidden review renders as a dashed stub
 * with its name, exchanges, date and the reason, and none of its words: the
 * page promises that nothing disappears silently, and this is where that is
 * kept.
 */
export default function ReviewCard({ review, delay = 0, animate = true }) {
  const r = review;
  const initial = r.displayName === 'A TradeGuardX trader' ? '?' : r.displayName?.charAt(0).toUpperCase();

  return (
    <article id={`review-${r.id}`} className={`rvw-card ${animate ? 'in' : ''} ${r.hidden ? 'rvw-hidden' : ''}`} style={{ '--d': `${delay}s` }}>
      <header className="rvw-card-top">
        <span className="rvw-verified">
          <Shield />
          Verified trader
        </span>
        <time className="rvw-date" dateTime={r.createdAt}>
          {dayLabel(r.createdAt)}
          {r.editedAt ? ' · edited' : ''}
        </time>
      </header>

      {r.hidden ? (
        <p className="rvw-hidden-text">Review hidden: {r.hidden.reason}.</p>
      ) : (
        <div className="rvw-quote">
          {r.rating ? (
            <div className="rvw-rating">
              <StarRow value={r.rating} size={18} />
              <span>{r.rating}.0</span>
            </div>
          ) : null}
          {r.title && <h3 className="rvw-title">{r.title}</h3>}
          <p className="rvw-body">{r.body}</p>
        </div>
      )}

      <footer className="rvw-card-foot">
        <div className="rvw-person">
          <span className="rvw-person-avatar" style={{ '--h': hueFor(r.displayName) }} aria-hidden>
            {initial}
          </span>
          <span>
            <span className="rvw-person-name">{r.displayName}</span>
            {r.traderSince && <span className="rvw-person-since">Trader since {monthLabel(r.traderSince)}</span>}
          </span>
        </div>
        <ExchangeStack exchanges={r.exchanges} />
      </footer>

      {r.reply && (
        <div className="rvw-reply">
          <p className="rvw-reply-head">
            <img src="/favicon.svg" alt="" width="16" height="16" />
            Reply from TradeGuardX
          </p>
          <p className="rvw-reply-body">{r.reply.body}</p>
        </div>
      )}
    </article>
  );
}
