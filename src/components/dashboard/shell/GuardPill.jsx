import { useGuard } from '../../../context/GuardContext';

/** Pulsing dot + state word. One selector, read everywhere. */
export default function GuardPill({ className = '' }) {
  const { selected } = useGuard();
  if (!selected.account) return null;
  const { pill, tone } = selected.describe;
  return (
    <span className={`dsh-pill dsh-pill--${tone} ${className}`} title={selected.describe.title}>
      <span className={`dot${selected.guard === 'armed' ? ' dot--pulse' : ''}`} />
      {pill}
    </span>
  );
}
