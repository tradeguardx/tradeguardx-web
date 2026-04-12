import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'How does TradeGuardX work without API keys?',
    a: 'TradeGuardX is a browser extension that runs directly inside your trading platform. It reads your open positions from the platform UI — no API keys, no broker API connection, and no special account permissions from your broker.',
  },
  {
    q: 'What is the difference between the web app and the extension?',
    a: 'Use the web dashboard to configure rules per trading account, manage pairing and billing, and view your journal and trade history when you are signed in. The extension applies those rules in real time while you trade on the platform. Both work together.',
  },
  {
    q: 'Is my trading data safe?',
    a: 'Rule checks and enforcement run locally in your browser on the platform. When you sign in, optional features such as saving rules, pairing devices, and trade journaling store only what is needed to provide those features in your account. We do not sell your data.',
  },
  {
    q: 'Which trading platforms are supported?',
    a: 'TradeGuardX currently supports Delta Exchange and Exness. We are actively adding support for more platforms. You can request your platform via our support page.',
  },
  {
    q: 'Can I use it for prop firm trading?',
    a: 'Yes! TradeGuardX is specifically designed for prop firm traders. It enforces daily loss limits, max drawdown, no-hedging rules, and more — exactly the rules prop firms require.',
  },
  {
    q: 'What happens when a rule is triggered?',
    a: 'Depending on your configuration, TradeGuardX can warn you, block new trades from being placed, or close positions. You stay in control of which action each rule takes.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. The free plan includes daily loss protection, hedging prevention, and basic trade detection. Upgrade to Pro for advanced rules like risk per trade, max drawdown, and trade journaling.',
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
          className="rounded-3xl glass p-6 md:p-8"
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
