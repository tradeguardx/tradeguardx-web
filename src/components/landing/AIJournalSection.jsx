import { motion, useReducedMotion } from 'framer-motion';

/**
 * The AI journal, in one screen.
 *
 * This replaces a 579-line walkthrough that spent most of a page animating a
 * feature nobody buys the product for. The kill switch is the reason people
 * sign up; the journal is why they stay. It needs to be understood, not
 * demonstrated — so: what it does, three things it finds, and two real
 * screenshots.
 */

const FINDS = [
  { tag: 'Revenge entry', body: 'You re-entered 90 seconds after a loss, 3× your usual size.' },
  { tag: 'Size creep', body: 'Your position size grew 40% across the week without your risk changing.' },
  { tag: 'Past your cutoff', body: 'Your last four losing days all started after 2pm.' },
];

const SHOTS = [
  { src: '/narrative.png', alt: 'AI-written narrative of a trade', caption: 'Every trade, written up' },
  { src: '/timeline.png', alt: 'Trade timeline with behaviour tags', caption: 'Tagged by behaviour' },
];

export default function AIJournalSection() {
  const reduce = useReducedMotion();

  return (
    <section id="ai-journal" className="mx-auto w-full max-w-[1240px] px-[18px] py-16 sm:px-7 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#a78bfa' }}>
          AI journal
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
          The kill switch stops today.<br />
          The journal fixes next month.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
          Every trade is logged automatically — entry, exit, P&amp;L, and the rules in play. Then it
          names the habit behind the losses, which is the part you can actually change.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {FINDS.map((f, i) => (
          <motion.div
            key={f.tag}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: reduce ? 0 : i * 0.07, duration: 0.4 }}
            className="rounded-2xl border p-5"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
          >
            <span
              className="inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: 'rgba(167,139,250,0.14)', color: '#c4b5fd' }}
            >
              {f.tag}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SHOTS.map((s, i) => (
          <motion.figure
            key={s.src}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: reduce ? 0 : i * 0.08, duration: 0.45 }}
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
          >
            <img src={s.src} alt={s.alt} loading="lazy" className="block w-full" />
            <figcaption className="px-4 py-3 text-[12px]" style={{ color: 'var(--dash-text-faint, #64748b)' }}>
              {s.caption}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
