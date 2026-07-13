import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const faqs = [
  {
    q: 'Is this really the first of its kind in India?',
    a: 'Yes. TradeGuardX is the first product built in India to actually enforce crypto trading discipline — not just track it or alert you. When you breach a limit you set, we act on your account automatically.',
  },
  {
    q: 'How does it actually work?',
    a: 'You connect your Delta account with a read-or-trade API key once. Our servers then watch your account in real time and, the moment you breach a rule you set, take action — close trades, lock the account, or just alert you, depending on the rule. Setup takes about a minute.',
  },
  {
    q: 'Can you withdraw my money or trade for me?',
    a: 'No. Your API keys are scoped to reading data and managing your own positions — never withdrawals. Your funds never leave your own exchange wallet; during a lockout we don’t move money, we just close your positions and block new trades until the cooldown ends. Keys are encrypted at rest.',
  },
  {
    q: 'What exactly happens when I breach a rule?',
    a: 'It depends on the rule. Daily-loss and consecutive-loss limits trigger a kill switch — we cancel your orders, close your positions, and lock the account until your cooldown ends (any new trade you open is closed on sight). Hitting your daily trade count locks you out once you’re flat. A stop set too wide for your risk-per-trade limit closes just that trade. Softer rules (drawdown, missing stop-loss) alert you. You configure which rules are on.',
  },
  {
    q: 'Where do I get notified?',
    a: 'On the channels you choose — Telegram and email. You control which rules notify you and the minimum severity worth a ping, so you get the alerts that matter without the noise. Because alerts are server-side, you’re notified even when you’re trading from your phone.',
  },
  {
    q: 'Does it work when my computer is off?',
    a: 'Yes. Enforcement runs on our always-on servers, connected to your exchange by API — so your rules hold even when your browser is closed and your laptop is off. Nothing to keep running.',
  },
  {
    q: 'What rules can I enforce?',
    a: 'Daily loss limit, max total drawdown, risk per trade, max trades per day, cooldown after consecutive losses (tilt lockout), hedging prevention, position stacking control, minimum hold time, and stop-loss protection. Turn on whichever fit your style.',
  },
  {
    q: 'Which exchanges are supported?',
    a: 'Delta Exchange is live today — we’re the first to bring real risk enforcement to it. CoinDCX is next, with more Indian crypto exchanges to follow based on trader demand.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. The free plan covers real-time alerts and basic protection. Pro unlocks full automatic enforcement — the kill switch, cooldown lockouts, risk-per-trade auto-close — plus trade journaling and AI insights.',
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className={`font-medium transition-colors duration-200 pr-4 ${isOpen ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-accent/15 text-accent' : 'bg-white/[0.04] text-slate-500'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-slate-400 text-sm leading-relaxed pb-5">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="section-padding relative">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            FAQ
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Got questions?
          </h2>
          <p className="text-slate-400 text-lg">
            Here are answers to the most common ones.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="gradient-card p-6 md:p-8"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
