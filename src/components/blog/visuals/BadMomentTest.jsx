import { useState } from 'react';
import Figure from '../Figure';
import { MOMENTS, TOOLS } from './badMoments';

/*
 * Every tool, tested against the four moments where accounts actually get
 * hurt. A verdict is 'yes' (it steps in by itself), 'some' (it helps, with a
 * catch named in the note) or 'no'. The data lives in ./badMoments.js so the
 * article's summary table is built from the same verdicts and cannot drift.
 */
const VERDICT = {
  yes: { label: 'Steps in', color: '#00d4aa', bg: 'rgba(0,212,170,.10)', icon: '✓' },
  some: { label: 'Partly', color: '#f59e0b', bg: 'rgba(245,158,11,.10)', icon: '~' },
  no: { label: 'Doesn’t', color: '#94a3b8', bg: 'rgba(148,163,184,.06)', icon: '✕' },
};

export default function BadMomentTest() {
  const [idx, setIdx] = useState(0);
  const moment = MOMENTS[idx];

  return (
    <Figure
      label="Interactive test: which risk tools step in at four bad trading moments"
      caption="Verdicts come from what each tool is built to do, not from star ratings. “Partly” always comes with the catch, so you can judge whether the catch matters to you."
    >
      <p className="bv-eyebrow">Pick a bad moment</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Bad moments">
        {MOMENTS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              i === idx ? 'border-accent/60 bg-accent/10' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <span className="text-xl leading-none" aria-hidden>{m.emoji}</span>
            <span className={`text-[13px] font-semibold leading-snug ${i === idx ? 'text-white' : 'text-slate-400'}`}>{m.title}</span>
          </button>
        ))}
      </div>

      <div key={moment.id} role="tabpanel" className="mt-5">
        <p className="bv-cell text-[14px] leading-relaxed text-slate-300" style={{ '--delay': '0s' }}>
          {moment.story}
        </p>
        <ul className="mt-4 space-y-2">
          {TOOLS.map((t, i) => {
            const cell = moment.cells[t.id];
            const v = VERDICT[cell.v];
            return (
              <li
                key={t.id}
                className="bv-cell grid grid-cols-[1fr_auto] items-start gap-3 rounded-xl border px-3.5 py-3 sm:grid-cols-[11rem_1fr_auto]"
                style={{
                  '--delay': `${0.2 + i * 0.12}s`,
                  borderColor: t.us ? 'rgba(0,212,170,.25)' : 'rgba(255,255,255,.06)',
                  background: 'rgba(255,255,255,.02)',
                }}
              >
                <span className="text-[14px] font-semibold text-white">
                  {t.name}
                  {t.us && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">ours</span>}
                </span>
                <span
                  className="bv-stamp inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold sm:order-last"
                  style={{ '--delay': `${0.45 + i * 0.12}s`, color: v.color, background: v.bg }}
                >
                  <span aria-hidden>{v.icon}</span> {v.label}
                </span>
                <span className="col-span-2 text-[13px] leading-relaxed text-slate-400 sm:col-span-1">{cell.why}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Figure>
  );
}
