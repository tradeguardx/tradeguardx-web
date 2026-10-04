import WatchDemoCard from '../common/WatchDemoCard';

/**
 * Renders one article: intro + sections (body / steps / list / note).
 *
 * Lifted out of DocsPage so the venue guides under /exchanges/<venue>/<guide>
 * render identically to the help centre. They are the same articles — the
 * per-venue setup guides used to live at /help/getting-started — and a second
 * renderer for them would have drifted from this one inside a release, which is
 * how you end up with a step list that looks authoritative on one URL and
 * half-styled on another.
 *
 * `headingLevel` exists because the venue guide pages already carry their own
 * H1 from the route, and a second H1 in the body would leave the page with two.
 */
export default function ArticleBody({ article, showDemo = false, video, children, headingLevel = 'h1' }) {
  const Heading = headingLevel;
  return (
    <article className="min-w-0">
      <Heading className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">{article.title}</Heading>
      {article.intro && <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{article.intro}</p>}

      {/* Setup guides lead with the video — most people would rather watch the
          key-generation step than read it. Plays in a lightbox, not on YouTube.
          `video` is the venue's own where it has one: this card used to play
          the Delta screencast on every venue's guide. */}
      {showDemo && <WatchDemoCard video={video} className="mt-6" />}

      {children}

      <div className="mt-8 space-y-10">
        {article.sections.map((s, si) => (
          <section key={si}>
            {s.heading && <h2 className="font-display text-xl font-bold text-white md:text-2xl">{s.heading}</h2>}
            {s.body && <p className={`${s.heading ? 'mt-3' : ''} text-[15px] leading-relaxed text-slate-400`}>{s.body}</p>}

            {s.steps && (
              <ol className="mt-6 space-y-6">
                {s.steps.map((step, i) => (
                  <li key={i} id={`step-${i + 1}`} className="relative flex scroll-mt-24 gap-4">
                    {i < s.steps.length - 1 && (
                      <span className="absolute left-[15px] top-9 bottom-[-24px] w-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} aria-hidden />
                    )}
                    <span
                      className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.35)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-[15px] font-semibold text-white">{step.title}</p>
                      {step.body && <p className="mt-1 text-[14px] leading-relaxed text-slate-400">{step.body}</p>}
                      {step.sub && (
                        <ul className="mt-2.5 space-y-1.5">
                          {step.sub.map((x, j) => (
                            <li key={j} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-400">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {step.note && (
                        <p
                          className="mt-2.5 rounded-lg border px-3 py-2 text-[13px] leading-relaxed text-slate-300"
                          style={{ borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.05)' }}
                        >
                          {step.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {s.list && (
              <ul className={`${s.heading || s.body ? 'mt-4' : ''} space-y-2.5`}>
                {s.list.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="text-[15px] leading-relaxed text-slate-400">
                      {item.bold && <span className="font-semibold text-slate-200">{item.bold} </span>}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {s.note && (
              <p
                className="mt-4 rounded-xl border px-4 py-3 text-[13px] leading-relaxed text-slate-300"
                style={{ borderColor: 'rgba(0,212,170,0.18)', backgroundColor: 'rgba(0,212,170,0.05)' }}
              >
                <span className="font-semibold text-accent">Note: </span>
                {s.note}
              </p>
            )}
          </section>
        ))}
      </div>

      <div
        className="mt-12 rounded-2xl border px-5 py-5 text-sm text-slate-400"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        Still stuck? Email{' '}
        <a href="mailto:support@tradeguardx.com" className="font-semibold text-accent hover:underline">
          support@tradeguardx.com
        </a>{' '}
        and we&apos;ll help you get protected.
      </div>
    </article>
  );
}
