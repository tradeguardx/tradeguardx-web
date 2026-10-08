import { Link, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { useAuth } from '../../../context/AuthContext';
import { subscriptionNotice } from './subscriptionNotice';
import { sx } from './sx';

/**
 * The dashboard's one band. Only while something is wrong or ending; never
 * dismissible.
 *
 * It carries two things that used to be two separate full-width banners
 * stacked on top of each other — the guard problem and the subscription
 * state. See `subscriptionNotice` for why they were merged.
 *
 * The guard leads, because it is about right now: nothing is being enforced
 * this second. The subscription rides underneath as a quieter line, because
 * it is about a date. With no guard problem, the subscription line becomes
 * the band.
 */
export default function GuardBand() {
  const { selected, loaded } = useGuard();
  const { user } = useAuth();
  const { pathname } = useLocation();

  /**
   * The band exists to point somewhere. On the page it points AT, it is just
   * a louder copy of what is already on screen — the lockout band sat above
   * the Live guard countdown offering to show you the countdown.
   */
  const elsewhere = (to) => Boolean(to) && !pathname.startsWith(to);

  let guard = null;
  if (loaded && selected.account) {
    const d = selected.describe;
    let { showBand, bandTitle, bandBody, cta, to, tone } = d;
    // Armed but silent: the alerts gap still needs a band (brief §4 gap 5).
    if (!showBand && selected.gap?.key === 'alerts') {
      showBand = true; tone = 'amber';
      bandTitle = selected.gap.title; bandBody = selected.gap.body; cta = selected.gap.cta; to = selected.gap.to;
    }
    if (showBand && elsewhere(to)) guard = { bandTitle, bandBody, cta, to, tone };
  }

  const notice = subscriptionNotice(user);
  const noticeLink = notice && elsewhere(notice.to) ? notice : null;
  if (!guard && !notice) return null;

  const tone = guard ? guard.tone : notice.tone;
  const fg = `var(--${tone})`;

  return (
    /*
     * NOT data-tgx-stack. That shared rule stacks every child and gives each
     * width:100%, which on a phone stretched the 17px warning triangle across
     * the band — reading as a centred icon above left-aligned text — and blew
     * the link up into a full-width button. The icon belongs beside the title,
     * so it is nested with it and the band handles its own stacking.
     */
    <div data-tgx-band="1" className="guard-band" role="status" style={sx('align-items:flex-start;gap:12px;padding:12px 24px', { borderTop: `1px solid var(--${tone}-line)`, background: `var(--${tone}-tint)` })}>
      <div className="guard-band__main" style={sx('flex:1;min-width:0;align-items:flex-start;gap:10px')}>
        {guard ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none', marginTop: 2 }}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9.5v4M12 16.4h.01" /></svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }}><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>
        )}
        <div style={sx('flex:1;min-width:0')}>
          <div style={sx('font-size:13.5px;font-weight:700;line-height:1.35', { color: guard ? fg : 'var(--ink)' })}>
            {guard ? guard.bandTitle : notice.strong}
          </div>
          <div style={sx('font-size:12.5px;line-height:1.5;color:var(--ink-2);margin-top:3px;max-width:96ch')}>
            {guard ? guard.bandBody : notice.text}
          </div>
          {/* Both at once: the plan line sits under the guard problem rather
              than beside it as a second alarm of equal weight. */}
          {guard && notice && (
            <div style={sx('margin-top:8px;padding-top:8px;border-top:1px solid var(--line);font-size:12.5px;line-height:1.5;color:var(--ink-3)')}>
              <strong style={sx('color:var(--ink-2);font-weight:700')}>{notice.strong}</strong>{' '}
              {notice.text}{' '}
              {noticeLink && (
                <Link to={noticeLink.to} style={sx('font-weight:700;text-decoration:underline', { color: `var(--${notice.tone})` })}>{noticeLink.cta}</Link>
              )}
            </div>
          )}
        </div>
      </div>
      {guard ? (
        <Link className="guard-band__cta" to={guard.to} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap', { border: `1px solid var(--${tone}-line)`, color: fg })}>{guard.cta}</Link>
      ) : noticeLink ? (
        <Link className="guard-band__cta" to={noticeLink.to} style={sx('flex:none;padding:8px 13px;border-radius:8px;background:var(--surface);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap', { border: `1px solid var(--${tone}-line)`, color: fg })}>{noticeLink.cta}</Link>
      ) : null}
    </div>
  );
}
