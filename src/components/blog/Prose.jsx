import './blog.css';

/**
 * Prose primitives for blog articles. Articles are written in JSX with these
 * rather than in Markdown so a figure, a calculator or a callout can sit
 * mid-paragraph-flow without a parser or a plugin.
 *
 * H2 takes an `id` because the table of contents and every "jump to" link
 * depend on it, and a heading without one is a section nobody can link to.
 */

export function H2({ id, children }) {
  return (
    <h2 id={id} className="mb-4 mt-14 scroll-mt-28 font-display text-[26px] font-bold leading-tight text-white md:text-[30px]">
      <a href={`#${id}`} className="group no-underline">
        {children}
        <span className="ml-2 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
          #
        </span>
      </a>
    </h2>
  );
}

export function H3({ children }) {
  return <h3 className="mb-2 mt-8 font-display text-[19px] font-bold text-white">{children}</h3>;
}

export function P({ children }) {
  return <p className="mb-4 text-[16px] leading-[1.8] text-slate-300">{children}</p>;
}

export function UL({ children }) {
  return <ul className="mb-5 space-y-2.5 pl-1 text-[16px] leading-[1.75] text-slate-300">{children}</ul>;
}

export function LI({ children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export function B({ children }) {
  return <strong className="font-semibold text-white">{children}</strong>;
}

/** A numbered step with a big index, for the how-to sections. */
export function Step({ n, title, children }) {
  return (
    <div className="relative mb-6 rounded-2xl border px-5 py-5 pl-16" style={{ borderColor: 'rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
      <span
        className="absolute left-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg font-display text-[15px] font-bold text-surface-950"
        style={{ background: '#00d4aa' }}
        aria-hidden
      >
        {n}
      </span>
      <h3 className="font-display text-[18px] font-bold text-white">{title}</h3>
      <div className="mt-2 text-[15px] leading-[1.75] text-slate-300 [&>p+p]:mt-3">{children}</div>
    </div>
  );
}

const TONES = {
  note: { border: 'rgba(129,140,248,.35)', bg: 'rgba(129,140,248,.06)', label: '#a5b4fc' },
  warn: { border: 'rgba(244,63,94,.35)', bg: 'rgba(244,63,94,.06)', label: '#fb7185' },
  tip: { border: 'rgba(0,212,170,.35)', bg: 'rgba(0,212,170,.06)', label: '#00d4aa' },
};

export function Callout({ tone = 'note', title, children }) {
  const t = TONES[tone];
  return (
    <aside className="my-6 rounded-xl border-l-4 px-5 py-4" style={{ borderColor: t.border, background: t.bg }}>
      {title && (
        <p className="mb-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: t.label }}>
          {title}
        </p>
      )}
      <div className="text-[15px] leading-[1.75] text-slate-300">{children}</div>
    </aside>
  );
}

/**
 * The short answer, up top. Written to be lifted whole into a featured
 * snippet, which is why it is a plain list of complete sentences.
 */
export function KeyTakeaways({ items }) {
  return (
    <section
      aria-label="Key takeaways"
      className="bv-glow relative my-8 overflow-hidden rounded-2xl border px-5 py-5 sm:px-6"
      style={{ borderColor: 'rgba(0,212,170,.25)', background: 'linear-gradient(135deg, rgba(0,212,170,.07), rgba(255,255,255,.01))' }}
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent">The short answer</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t.slice(0, 24)} className="flex gap-3 text-[15px] leading-relaxed text-slate-200">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A simple responsive table that scrolls sideways on a phone instead of crushing. */
export function Table({ head, rows, caption }) {
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <table className="w-full min-w-[520px] border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h || i}
                scope="col"
                className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                style={{ color: i ? '#00d4aa' : '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[0]} style={{ backgroundColor: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {c}
                  </th>
                ) : (
                  <td key={j} className="bv-num px-4 py-3 text-[14px] text-slate-200" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
