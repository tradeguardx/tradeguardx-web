import { motion } from 'framer-motion';

/**
 * Two-column shell for /login and /signup: the product on the left (a
 * recording of the live guard near its loss limit), the form
 * on the right. No brand mark here — the navbar above already carries it.
 *
 * The left panel is hidden below `lg` so a phone gets straight to the form;
 * the copy is the landing page's job there.
 */

/* The recording has its own dark backdrop. Fading its outer edges into the
   page removes the visible rectangle, so only the card and caption read.
   The card sits inside 12-88% of the frame, so the fade never touches it. */
const FADE_X = 'linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%)';
const FADE_Y = 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)';
const EDGE_FADE = {
  maskImage: `${FADE_X}, ${FADE_Y}`,
  maskComposite: 'intersect',
  WebkitMaskImage: `${FADE_X}, ${FADE_Y}`,
  WebkitMaskComposite: 'source-in',
};

// Absolute so it also loads on a local dev server, which has no /media.
const LOCKOUT_GIF = 'https://tradeguardx.com/media/2026/11/tradeguardx-hero-7b3cd163.gif';

export default function AuthSplit({ children }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* ── Left: the pitch ─────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24">
        {/* grid + glow, kept inside the panel */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 30% 40%, black, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 40%, black, transparent 75%)',
            }}
          />
          <div className="absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-accent/[0.06] blur-[140px]" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[560px]"
        >
          {/* Soft accent light behind the card, so it sits in the page's
              light rather than on a flat panel. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.07] blur-[90px]" />
          {/* The product doing its job: the guard nearing the loss limit on a
              phone. Sized to the viewport height so it never pushes the page
              into a scroll beside the form. */}
          <img
            src={LOCKOUT_GIF}
            alt="TradeGuardX live guard on a Delta Exchange account: today's loss budget, trades, target and armed rules, with the guard closing everything at the loss limit"
            width={600}
            height={750}
            decoding="async"
            className="relative mx-auto h-auto max-h-[calc(100vh-140px)] w-auto"
            style={EDGE_FADE}
          />
        </motion.div>
      </aside>

      {/* ── Right: the form, exactly as before ──────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-4 py-16 lg:bg-surface-950/40">
        {children}
      </div>
    </div>
  );
}
