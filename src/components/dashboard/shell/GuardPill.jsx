import { useGuard } from '../../../context/GuardContext';

/** Pulsing dot + state word. One selector, read everywhere. */
export default function GuardPill({ className = '', mdhide = false }) {
  const { selected } = useGuard();
  if (!selected.account) return null;
  const { pill, tone } = selected.describe;
  return (
    <span className={`dsh-pill dsh-pill--${tone} ${className}`} title={selected.describe.title} {...(mdhide ? { 'data-tgx-mdhide': '' } : {})}>
      <span className={`dot${selected.guard === 'armed' ? ' dot--pulse' : ''}`} />
      {pill}
    </span>
  );
}
