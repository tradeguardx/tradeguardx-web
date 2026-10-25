import Figure from '../Figure';

/*
 * Gain needed to get back to where you started after losing L:
 *   1 / (1 − L) − 1
 * The gain bar is scaled so 100% fills the track; the 300% row runs off the
 * end on purpose and says so, because squeezing the scale to fit it would
 * flatten the rows that matter.
 */
const LOSSES = [5, 10, 20, 30, 50, 75];
const gainFor = (loss) => (1 / (1 - loss / 100) - 1) * 100;
const fmt = (n) => (Number.isInteger(Math.round(n * 10) / 10) ? Math.round(n) : n.toFixed(1));

export default function RecoveryBars() {
  return (
    <Figure
      label="Chart: the gain needed to recover from each size of loss"
      caption="Losses and recoveries are not symmetric. A 20% loss needs 25% to recover; a 50% loss needs 100%. The daily limit exists to keep you in the top rows."
    >
      <p className="bv-eyebrow">Lose this… · …and you need this back</p>
      <div className="mt-4 space-y-3">
        {LOSSES.map((loss, i) => {
          const gain = gainFor(loss);
          const over = gain >= 99.5;
          return (
            <div key={loss} className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 sm:grid-cols-[4rem_1fr_1fr] sm:gap-3">
              <p className="bv-num text-right text-[13px] font-bold text-rose-400">−{loss}%</p>
              {/* loss bar grows right-to-left toward the centre */}
              <div className="flex h-5 justify-end rounded-l-md" style={{ background: 'rgba(255,255,255,.03)' }}>
                <div
                  className="bv-bar h-5 rounded-l-md"
                  style={{
                    width: `${loss}%`,
                    transformOrigin: 'right center',
                    '--delay': `${0.1 + i * 0.12}s`,
                    background: 'linear-gradient(270deg, #f43f5e, rgba(244,63,94,.35))',
                  }}
                />
              </div>
              <div className="relative flex h-5 items-center rounded-r-md" style={{ background: 'rgba(255,255,255,.03)' }}>
                <div
                  className="bv-bar h-5 rounded-r-md"
                  style={{
                    width: `${Math.min(gain, 100)}%`,
                    '--delay': `${0.5 + i * 0.12}s`,
                    background: over
                      ? 'linear-gradient(90deg, rgba(0,212,170,.35), #00d4aa 85%, #fbbf24)'
                      : 'linear-gradient(90deg, rgba(0,212,170,.35), #00d4aa)',
                  }}
                />
                <span
                  className="bv-num bv-fade absolute text-[12px] font-bold"
                  style={{
                    '--delay': `${1 + i * 0.12}s`,
                    left: over ? 'auto' : `calc(${Math.min(gain, 100)}% + 6px)`,
                    right: over ? '6px' : 'auto',
                    color: over ? '#07090f' : '#e2e8f0',
                  }}
                >
                  +{fmt(gain)}%{gain > 100 ? ' →' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Figure>
  );
}
