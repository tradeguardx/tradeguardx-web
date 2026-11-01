import { useState } from 'react';
import { Link } from 'react-router-dom';
import Figure from '../Figure';

/*
 * Three questions, one honest answer. Two of the four outcomes tell the reader
 * not to buy anything. That is deliberate: a recommender that always lands on
 * the product is an advert, and readers can tell.
 */
const QUESTIONS = [
  { id: 'what', q: 'What do you trade?', options: [['spot', 'Spot only (no leverage)'], ['futures', 'Futures or perpetuals']] },
  { id: 'often', q: 'How often?', options: [['rare', 'A few times a month'], ['daily', 'Most days']] },
  { id: 'broken', q: 'Have you ever broken your own loss rule?', options: [['never', 'Never'], ['yes', 'Yes, at least once']] },
];

function answerFor(a) {
  if (a.what === 'spot') {
    return {
      tone: 'calm',
      title: 'You probably don’t need a kill switch.',
      body: 'Without leverage, one bad hour can’t wipe your account. Use limit orders, keep a simple journal, and only put in money you’re fine leaving there. (TradeGuardX doesn’t cover spot anyway.)',
    };
  }
  if (a.broken === 'yes') {
    return {
      tone: 'act',
      title: 'Automate the rule you’ve already broken.',
      body: 'Keep using stop-losses on every trade. But a rule you’ve broken once will be broken again on a bad day, so let something else hold it. That’s what a kill switch is for.',
      cta: true,
    };
  }
  if (a.often === 'rare') {
    return {
      tone: 'calm',
      title: 'Free tools are enough for now.',
      body: 'Stop-loss on every trade, isolated margin, and a written daily limit. If you ever catch yourself breaking that limit, come back to this page.',
    };
  }
  return {
    tone: 'mid',
    title: 'Start free. Watch yourself for a month.',
    body: 'Trading most days with a clean record is great. Write your daily limit down and track every day you hit it. The first day you trade past it is the day to automate it.',
  };
}

export default function ToolFinder() {
  const [a, setA] = useState({});
  const done = QUESTIONS.every((q) => a[q.id] || (q.id !== 'what' && a.what === 'spot'));
  const result = done ? answerFor(a) : null;
  const color = result?.tone === 'act' ? '#00d4aa' : result?.tone === 'mid' ? '#f59e0b' : '#818cf8';

  return (
    <Figure label="Quiz: which crypto risk tool do you actually need" caption="Two of the four answers tell you not to buy anything. That’s on purpose.">
      <p className="bv-eyebrow">Three questions</p>
      <div className="mt-4 space-y-5">
        {QUESTIONS.map((q, i) => {
          const hidden = i > 0 && a.what === 'spot';
          if (hidden) return null;
          return (
            <fieldset key={q.id}>
              <legend className="text-[14px] font-semibold text-white">
                <span className="mr-2 text-slate-500">{i + 1}.</span>
                {q.q}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={a[q.id] === val}
                    onClick={() => setA((prev) => ({ ...prev, [q.id]: val }))}
                    className={`rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-all ${
                      a[q.id] === val ? 'scale-[1.02] border-accent/60 bg-accent/10 text-white' : 'border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {result ? (
        <div
          key={JSON.stringify(a)}
          className="bv-lockcard mt-6 rounded-2xl px-5 py-4"
          style={{ '--delay': '0s', borderColor: `${color}66`, background: `${color}12` }}
          aria-live="polite"
        >
          <p className="font-display text-[18px] font-bold text-white">{result.title}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{result.body}</p>
          {result.cta && (
            <Link to="/signup" className="mt-3 inline-block text-[14px] font-semibold text-accent hover:underline">
              Try TradeGuardX free for 3 days →
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-6 text-[13px] text-slate-500">Answer all three to see what we’d suggest.</p>
      )}
    </Figure>
  );
}
