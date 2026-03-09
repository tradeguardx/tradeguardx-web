import { motion } from 'framer-motion';

const STEPS = [
  {
    number: 1,
    title: 'Open Chrome Web Store',
    description: 'Go to the TradeGuardX page on the Chrome Web Store (or use the link below once the extension is published).',
    detail: 'Make sure you’re using Google Chrome or another Chromium-based browser (Brave, Edge).',
  },
  {
    number: 2,
    title: 'Click "Add to Chrome"',
    description: 'On the extension page, click the blue "Add to Chrome" button.',
    detail: 'A small dialog will ask you to confirm. Click "Add extension".',
  },
  {
    number: 3,
    title: 'Pin the extension',
    description: 'After installation, click the puzzle icon in the Chrome toolbar and pin TradeGuardX so it’s easy to access.',
    detail: 'You can also open the extension popup from the toolbar to see status and quick settings.',
  },
  {
    number: 4,
    title: 'Configure and trade',
    description: 'Configure your accounts and rules in this dashboard, then open your trading platform.',
    detail: 'TradeGuardX will detect your platform and start monitoring once you’re on a supported site.',
  },
];

export default function InstallExtensionPage() {
  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Chrome extension
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Install TradeGuardX
        </h1>
        <p className="text-slate-400">
          Follow these steps to add the extension to Chrome and start protecting your trades.
        </p>
      </motion.div>

      <div className="space-y-6">
        {STEPS.map((step, i) => (
          <motion.article
            key={step.number}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-surface-700/50 bg-surface-900/40 backdrop-blur-sm p-6 hover:border-surface-600/50 transition-colors"
          >
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-accent font-bold text-lg">{step.number}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">{step.title}</h2>
                <p className="text-slate-400 leading-relaxed text-sm mb-1">{step.description}</p>
                <p className="text-slate-500 text-xs">{step.detail}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center"
      >
        <h3 className="text-base font-semibold text-white mb-2">Chrome Web Store</h3>
        <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
          When TradeGuardX is published, the link below will take you to the store listing.
        </p>
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-surface-950 font-semibold hover:bg-accent-hover transition-colors text-sm"
        >
          Open Chrome Web Store
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V18a2 2 0 00-2-2h-4m-6 0h6m-6 0l4 4m0 0l4-4m-4 4V10" />
          </svg>
        </a>
      </motion.div>
    </div>
  );
}
