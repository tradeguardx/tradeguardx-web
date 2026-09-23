import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';

/**
 * Head-term landing page for the tax side of the product.
 *
 * "Crypto kill switch" is a category we largely coined, which is good
 * positioning and poor SEO — nobody searches for a thing they have not heard
 * of. Indian crypto traders DO search, in volume and with intent, for
 * "crypto tax india", "30% tax on crypto", "1% TDS", "how to file ITR for
 * crypto" and "<exchange> tax report". This page answers those.
 *
 * It leads with the one thing we can say that the tax calculators cannot:
 * applying the flat 30% VDA rule to futures is wrong, and it makes people pay
 * tax on a losing year. That is not a marketing claim — it is the reason
 * taxEngine.ts exists, and it happened on a real account (₹4,348 of "tax" on
 * an ₹8,561 loss).
 *
 * Nothing here computes a liability or gives advice. The engine deliberately
 * emits no rupee figure for business income, because that depends on the
 * user's slab and other income, and inventing one would be inventing a debt.
 */

const SECTIONS = [
  {
    h: 'The mistake that makes traders pay tax on a losing year',
    p: [
      'Almost every crypto tax tool in India applies one rule to everything: Section 115BBH, flat 30%, losses ignored. For spot buying and selling, that is correct. For futures, it is not, and the difference is not academic.',
      'Under 115BBH each gain is taxed on its own. Your losses do not reduce your gains, cannot be carried forward, and nothing but the cost of acquisition is deductible. Run a year of futures trades through that rule and every winning trade is taxed while every losing trade is thrown away.',
      'We have watched it happen on a real account: ₹4,348 of tax calculated on a year that actually lost ₹8,561 — and the genuine business loss, which was available to carry forward, disappeared from the report entirely.',
    ],
  },
  {
    h: 'Futures are not VDAs',
    p: [
      'A derivative with a crypto underlying is still a derivative. The widely held position among Indian tax practitioners is that perpetual futures and options are business income: gains and losses net against each other, fees are part of the trading result, and a losing year produces a loss you may be able to set off or carry forward under the normal rules.',
      'So the two regimes are not variants of one another. They point in opposite directions, and which one applies changes whether a bad year costs you money or saves you some.',
    ],
    table: {
      head: ['', 'Futures & options', 'Spot (VDA, 115BBH)'],
      rows: [
        ['Treatment', 'Business income', 'Flat 30% on each gain'],
        ['Do losses net against gains?', 'Yes', 'No'],
        ['Carry a loss forward?', 'Possible under normal rules', 'No'],
        ['Fees deductible?', 'Part of the trading result', 'No'],
        ['Tax on a losing year', 'None on trading', 'Still payable on the winners'],
      ],
    },
  },
  {
    h: 'What TradeGuardX actually does with your numbers',
    p: [
      'It rebuilds your financial year from raw exchange fills — not from a P&L summary the exchange hands you. Every position is reconstructed with FIFO lot matching, then reconciled against your wallet ledger so the trading result and the money that actually moved agree.',
      'Futures and spot are then reported under separate headings and never added together, because a combined figure across two tax regimes is a number that means nothing.',
      'For futures it reports your netted result and the loss available for set-off. It deliberately does not print a rupee tax figure, because business income is taxed at your slab after surcharge and cess and depends on your other income and allowable expenses — none of which we know. A tool that invents that number is inventing a liability. For spot it applies 115BBH and shows the 30% figure, since that rule does not depend on anything else about you.',
    ],
  },
  {
    h: 'The 1% TDS under Section 194S',
    p: [
      'Indian exchanges withhold 1% TDS on transfers of virtual digital assets and deposit it against your PAN. It is not an extra tax — it is credit against what you owe, and you claim it when you file. Traders who never reconcile it simply lose it.',
      'Your exchange statement shows what was withheld. Keep it with your records; the figure belongs in your return.',
    ],
  },
  {
    h: 'Filing: which ITR, and what you need',
    p: [
      'Business income from futures generally means ITR-3, and books of account and audit thresholds may apply depending on turnover — worth a conversation with a CA rather than a guess from a blog.',
      'What you need for any of it is a defensible record: every closed position with dates, the treatment applied to each, the FIFO working behind the numbers, and TDS already withheld. Our CA report exports exactly that, so your accountant reviews a worked statement instead of a CSV of fills.',
    ],
  },
  {
    h: 'Delta Exchange and CoinDCX tax reports',
    p: [
      'Both are supported and both are read through the exchange API, so you are not downloading a CSV and hoping the columns line up. Delta settles in USD and CoinDCX futures in USDT, so an Indian figure needs converting — we derive the rate from your own capital movements, show it on the page, and label it a disclosed assumption rather than pretending it is a statutory rate. Your CA may apply a different one under Rule 115.',
      'Futures only, on both venues. CoinDCX spot is not carried, and we say so rather than letting you assume the report is complete.',
    ],
  },
  {
    h: 'We report. Your CA decides.',
    p: [
      'TradeGuardX is not a filing service and not your accountant. It does the part that is arithmetic — rebuilding positions, matching lots, reconciling against the wallet, separating the regimes, showing the working — and stops where judgement begins.',
      'The classification of crypto derivatives is not fully settled in Indian law, and anyone telling you it is has not read the arguments. So the report shows what each treatment produces and marks the classification as needing review, instead of picking one quietly and handing you a number.',
    ],
  },
];

const FAQ = [
  {
    q: 'Is crypto futures trading taxed at 30% in India?',
    a: "Not under the widely held reading. The flat 30% under Section 115BBH applies to virtual digital assets — spot crypto. Futures and options are derivatives, and the common practitioner position treats them as business income, where gains and losses net and a loss may be carried forward. This matters most in a losing year: under the 30% rule you would pay tax on your winning trades while your losses were discarded. Your CA makes the final call, and our report shows both treatments rather than choosing for you.",
  },
  {
    q: 'Can I set off crypto losses against gains?',
    a: "It depends which kind. Under Section 115BBH, no — losses on virtual digital assets cannot be set off against gains, cannot be carried forward, and no expense other than cost of acquisition is deductible. Where trading is treated as business income, the normal set-off and carry-forward rules apply. That single difference is why lumping futures in with spot can turn a losing year into a tax bill.",
  },
  {
    q: 'What is the 1% TDS on crypto and do I get it back?',
    a: "Section 194S requires 1% to be withheld on transfers of virtual digital assets, and Indian exchanges deposit it against your PAN. It is not an additional tax — it is a credit against your final liability, and you claim it when you file. If you never reconcile it, you lose it. Your exchange statement shows what was withheld.",
  },
  {
    q: 'Which ITR form do I use for crypto trading?',
    a: "Where trading is business income, that generally points to ITR-3, and depending on your turnover, books of account and audit requirements may apply. This is exactly the point where a CA is worth more than a blog post. What we give you is the record they need: every closed position, the treatment applied, the FIFO working, and the TDS withheld.",
  },
  {
    q: 'Does TradeGuardX file my return?',
    a: "No, and we would rather be clear about that than imply otherwise. We rebuild your financial year from exchange fills, reconcile it against your wallet, separate the tax regimes, and export the working for your CA. Filing, and the judgement about classification that precedes it, stays with you and your accountant.",
  },
  {
    q: 'Does it work with Delta Exchange and CoinDCX?',
    a: "Yes, both, read directly through the exchange API rather than from a CSV download. Futures only on both venues. Because Delta settles in USD and CoinDCX futures in USDT, rupee figures require conversion — we derive the rate from your own capital movements and disclose it on the page as an assumption, not a statutory rate.",
  },
  {
    q: 'How far back does it go?',
    a: 'Three financial years on Pro, so a prior year can be rebuilt and checked rather than taken on faith.',
  },
];

export default function CryptoTaxIndiaPage() {
  useSEO({
    title: 'Crypto Tax India — Futures vs VDA, 30%, 1% TDS and ITR',
    description:
      'How crypto is taxed in India: the flat 30% under Section 115BBH, why futures are treated as business income instead, 1% TDS under 194S, and which ITR to file. Built for Delta Exchange and CoinDCX traders.',
    url: 'https://tradeguardx.com/crypto-tax-india',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.05), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24">
        <header className="mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Crypto tax · India</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Crypto tax in India, without paying 30% on a loss
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            The flat 30% under Section 115BBH applies to spot. Futures are a different regime — and
            tools that apply one rule to both can hand you a tax bill for a year you lost money.
            TradeGuardX rebuilds your financial year from raw exchange fills and keeps the two apart.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]"
            >
              Try free for 7 days
            </Link>
            <Link
              to="/crypto-kill-switch"
              className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20"
            >
              See the kill switch
            </Link>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            General information, not tax advice. The classification of crypto derivatives is not
            settled in Indian law — your CA decides, and this page exists to give them something
            worth reviewing.
          </p>
        </header>

        <div className="space-y-12">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.h}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <h2 className="mb-3 font-display text-2xl font-bold text-white">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para.slice(0, 24)} className="mb-3 text-[15px] leading-relaxed text-slate-300">
                  {para}
                </p>
              ))}
              {s.table && (
                <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead>
                      <tr>
                        {s.table.head.map((cell, ci) => (
                          <th
                            key={cell || ci}
                            className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider"
                            style={{
                              color: ci === 1 ? 'var(--tax-pos, #00d4aa)' : ci === 2 ? '#fbbf24' : '#64748b',
                              borderBottom: '1px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`px-4 py-3 text-[14px] ${ci === 0 ? 'font-medium text-slate-300' : 'text-slate-400'}`}
                              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-white">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border px-5 py-4"
                style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-100 marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="mb-4 font-display text-lg font-bold text-white">Read next</h2>
          <ul className="space-y-2.5 text-[15px]">
            <li>
              <Link to="/crypto-kill-switch" className="text-accent hover:underline">
                The kill switch: how server-side enforcement works
              </Link>
            </li>
            <li>
              <Link to="/help/getting-started" className="text-accent hover:underline">
                Connecting Delta Exchange or CoinDCX
              </Link>
            </li>
            <li>
              <Link to="/security" className="text-accent hover:underline">
                Security: how your API key is stored and scoped
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="text-accent hover:underline">
                Pricing — the tax centre is on every plan
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
