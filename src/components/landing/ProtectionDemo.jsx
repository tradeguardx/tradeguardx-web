import { useState } from 'react';
import { motion } from 'framer-motion';

const prompts = [
  {
    title: 'Hedging Prompt',
    message: 'Hedging is blocked for this account rule set. Close opposite side first.',
    status: 'blocked',
  },
  {
    title: 'Stop-Loss Prompt',
    message: 'Stop-loss missing. Add SL before placing this trade.',
    status: 'warning',
  },
  {
    title: 'Daily Risk Prompt',
    message: 'Daily loss limit is close. New trade size reduced for protection.',
    status: 'protected',
  },
];

function PromptRow({ prompt, index }) {
  const styles =
    prompt.status === 'blocked'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : prompt.status === 'warning'
        ? 'border-gold/30 bg-gold/10 text-gold-200'
        : 'border-success/30 bg-success/10 text-success';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl border border-white/[0.08] bg-surface-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-sm font-semibold text-white">{prompt.title}</p>
        <span className={`text-xs px-2 py-1 rounded-full border ${styles}`}>
          {prompt.status}
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{prompt.message}</p>
    </motion.div>
  );
}

export default function ProtectionDemo() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section id="protection-demo" className="section-padding relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            Live Protection Demo
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-5">
            See how TradeGuardX protects every trade
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            A short product video that shows hedging checks, stop-loss enforcement, and
            live risk prompts before orders are submitted.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl overflow-hidden"
          >
            <div className="relative aspect-video bg-surface-900">
              {!videoFailed ? (
                <video
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label="TradeGuardX protection demo video showing hedging and stop-loss prompts"
                  onError={() => setVideoFailed(true)}
                  poster="/demo/protection-demo-poster.jpg"
                >
                  <source src="/demo/tradeguardx-protection-demo.mp4" type="video/mp4" />
                </video>
              ) : (
                <div className="h-full w-full p-6 md:p-8 flex flex-col justify-center gap-4 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800">
                  <div className="text-sm text-slate-400">Demo preview fallback</div>
                  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-danger text-sm">
                    Hedging Prompt: Opposite-side order blocked.
                  </div>
                  <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-gold-200 text-sm">
                    Stop-Loss Prompt: Add SL before submitting.
                  </div>
                  <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-success text-sm">
                    Protection Active: Rule checks completed.
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/[0.06] bg-surface-900/50">
              <p className="text-xs text-slate-500 mb-1">
                Simulated demo with sample data.
              </p>
              <p className="text-xs text-slate-500">
                Place your demo file at <span className="text-slate-300">public/demo/tradeguardx-protection-demo.mp4</span>
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Transcript: TradeGuardX scans order intent, blocks hedging conflicts, prompts for a stop-loss when missing, then confirms protection before execution.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="space-y-4"
          >
            {prompts.map((prompt, index) => (
              <PromptRow key={prompt.title} prompt={prompt} index={index} />
            ))}
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                These prompts appear in real time so traders can fix issues before rule violations happen.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
