import { Link } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { IcWarn, IcLock } from './icons';
import { formatRemaining, formatResumes } from './format';

/**
 * Guard band — directly under the header, only while something is wrong.
 * Icon + title + body + one action. Never dismissible: it is the persistent
 * "you are not protected" surface. Copy derives from guard state and the
 * first unmet gap.
 */
export default function GuardBand() {
  const { selected, loaded } = useGuard();
  if (!loaded || !selected.account) return null;
  const { guard, gap, describe, lockUntil, lockRemainingMs, account } = selected;

  if (guard === 'armed' && !gap) return null;

  let tone = describe.tone;
  let title = describe.title;
  let body;
  let cta;
  let to;
  let Icon = IcWarn;

  if (guard === 'locked') {
    Icon = IcLock;
    body = `Trading resumes ${formatResumes(lockUntil, account?.timezone || 'Asia/Kolkata')} — ${formatRemaining(lockRemainingMs)} to go. Any position opened before then is closed on sight.`;
    cta = 'See countdown';
    to = '/dashboard/live';
  } else if (guard === 'armed' && gap?.key === 'alerts') {
    tone = 'amber';
    title = 'Armed, but a breach would be silent.';
    body = gap.body;
    cta = gap.cta;
    to = gap.to;
  } else if (gap) {
    body = gap.body;
    cta = gap.cta;
    to = gap.to;
  } else {
    return null;
  }

  return (
    <div className={`dgb dgb--${tone}`} role="status" data-tgx-band data-tgx-stack>
      <span className="dgb-icon"><Icon size={17} stroke={1.9} /></span>
      <div className="dgb-text">
        <p className="dgb-title">{title}</p>
        <p className="dgb-body">{body}</p>
      </div>
      <Link to={to} className="dgb-action">{cta}</Link>
    </div>
  );
}
