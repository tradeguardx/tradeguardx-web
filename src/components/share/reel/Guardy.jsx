import { clamp } from '../../../lib/reelMotion';
import { BODY } from '../../../lib/reelStories';

/**
 * Guardy, the shield. Every feature is driven from the frame, nothing animates
 * itself.
 *
 * He carries the emotional line the numbers cannot: the reel is about a loss,
 * and a chart alone reads as a bad outcome. Guardy is what makes it read as a
 * rule working — he is frightened while the trade runs, shocked at the close,
 * and relieved once the "if held" path appears below him.
 *
 * `mood` runs −1 (sad) to +1 (ecstatic) and drives six things at once: the
 * mouth curve, whether it opens, the brow furrow, the brow lift, the cheek
 * blush and the bounce. One scalar rather than six props, because they move
 * together on a face and controlling them separately produces expressions no
 * face makes.
 */
export default function Guardy({ x, y, s, mood, arms, sweat, blink, look, wave, color }) {
  const [c1, c2] = BODY[color] || BODY.mint;
  const m = clamp(mood, -1, 1);
  // The mouth only opens in the top fifth of the range, so a mild smile stays
  // a line and a grin is earned.
  const open = clamp((m - 0.45) / 0.55, 0, 1);
  const my = 34;
  const curve = m * 30;
  const k = Math.max(0, -m) * 11; // brow furrow, sad only
  const lift = Math.max(0, m) * 7; // brow lift, happy only
  /*
   * ARMS REST BELOW THE FACE AND RAISE ABOVE THE HEAD.
   *
   * They used to travel `20 - 80 * arms`, which puts the hands at y ≈ -12 for
   * any `arms` near 0.4 — and the eyes are at cy = -14. During the trade beat
   * `arms` is driven by live P&L and can sit there for seconds, so arm, face
   * and arm lined up into one horizontal bar straight across his face. He
   * read as a character with a line through his head rather than one holding
   * his arms out.
   *
   * The band to stay out of is roughly y ∈ [-37, 9] (eye centre ± the 23px
   * radius). Resting at 56 is beside the mouth; fully raised at -96 clears
   * the top of the shield at -112. The hands still pass through the band
   * while moving, which is motion and reads as motion.
   */
  const ARM_DOWN = 56;
  const ARM_UP = -96;
  /*
   * ...and they cross face height QUICKLY rather than resting in it.
   *
   * Moving the two endpoints is not enough on its own: a straight mapping
   * still parks the hands at y ≈ -5 for `arms` ≈ 0.4, which is the value the
   * live-P&L drive hovers around and the one the celebration starts from.
   * Any monotonic ease has the same problem — it has to pass through the
   * middle, and the middle is his face.
   *
   * So the middle is a ramp, not a resting place. The band maps to a 16%
   * slice of the input instead of 30%, traversed 2.5x faster, and the two
   * plateaus either side are where the arms actually sit.
   */
  const armLift = (a) => (
    a < 0.42 ? a * (0.30 / 0.42)
      : a > 0.58 ? 0.70 + (a - 0.58) * (0.30 / 0.42)
        : 0.30 + (a - 0.42) * (0.40 / 0.16)
  );
  const armY = (a) => ARM_DOWN + (ARM_UP - ARM_DOWN) * armLift(a);
  const armL = { x: -150, y: armY(arms) };
  // The right arm takes the wave on top of the shared arm position, so he can
  // wave with one hand while both are up.
  const armR = { x: 150, y: armY(clamp(arms + wave, 0, 1.3)) };
  const eh = 23 * (1 - blink * 0.92);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 120 * s,
        top: y - 140 * s,
        width: 240 * s,
        height: 280 * s,
      }}
    >
      <svg viewBox="-120 -140 240 280" width={240 * s} height={280 * s} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`gBody-${color}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <ellipse cx="0" cy="136" rx="78" ry="10" fill="rgba(0,0,0,.45)" />
        <path
          d={`M-92 34 Q-125 ${armL.y * 0.6 + 14} ${armL.x} ${armL.y}`}
          stroke={c2}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M92 34 Q125 ${armR.y * 0.6 + 14} ${armR.x} ${armR.y}`}
          stroke={c2}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={armL.x} cy={armL.y} r="13" fill={c1} />
        <circle cx={armR.x} cy={armR.y} r="13" fill={c1} />
        <path
          d="M0 -112 L96 -74 L96 0 C96 62 52 102 0 120 C-52 102 -96 62 -96 0 L-96 -74 Z"
          fill={`url(#gBody-${color})`}
        />
        <path d="M0 -98 L80 -66 L80 -20 C60 -40 -60 -40 -80 -20 L-80 -66 Z" fill="rgba(255,255,255,.22)" />
        <circle cx="-56" cy="34" r="14" fill="#ff7ab0" opacity={clamp(m, 0, 1) * 0.55} />
        <circle cx="56" cy="34" r="14" fill="#ff7ab0" opacity={clamp(m, 0, 1) * 0.55} />
        <ellipse cx="-34" cy="-14" rx="21" ry={eh} fill="#fff" />
        <ellipse cx="34" cy="-14" rx="21" ry={eh} fill="#fff" />
        <circle cx={-34 + look.x} cy={-14 + look.y} r={10 * (1 - blink)} fill="#0b1220" />
        <circle cx={34 + look.x} cy={-14 + look.y} r={10 * (1 - blink)} fill="#0b1220" />
        <circle cx={-30 + look.x} cy={-18 + look.y} r={3.5 * (1 - blink)} fill="#fff" />
        <circle cx={38 + look.x} cy={-18 + look.y} r={3.5 * (1 - blink)} fill="#fff" />
        <path
          d={`M-52 ${-48 + k - lift} L-18 ${-48 - k - lift}`}
          stroke="#0b1220"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M18 ${-48 - k - lift} L52 ${-48 + k - lift}`}
          stroke="#0b1220"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M-30 ${my} Q0 ${my + curve + open * 22} 30 ${my} ${open > 0 ? `Q0 ${my + 6} -30 ${my}` : ''}`}
          fill={open > 0 ? '#0b1220' : 'none'}
          stroke="#0b1220"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M84 -70 C84 -70 72 -54 72 -46 A12 12 0 0 0 96 -46 C96 -54 84 -70 84 -70 Z"
          fill="#7cc8ff"
          opacity={sweat}
        />
      </svg>
    </div>
  );
}
