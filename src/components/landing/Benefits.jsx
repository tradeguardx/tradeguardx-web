import { motion } from 'framer-motion';

const benefits = [
  {
    title: 'We watch — everywhere you trade',
    description: 'Enforcement runs on our servers via the Delta API, so it covers every trade — on the Delta mobile app, on web, anywhere. You don’t need to be at your desk, and nothing has to stay open.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    gradient: 'from-accent/20 to-emerald-500/5',
    accentColor: 'text-accent',
  },
  {
    title: 'We notify — on your channels',
    description: 'Instant alerts the moment something matters — to Telegram and email. You choose which channels, which rules, and the severity that’s worth pinging you for. No noise.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    gradient: 'from-amber-500/15 to-orange-500/5',
    accentColor: 'text-amber-400',
  },
  {
    title: 'We enforce — automatically',
    description: 'Cross a hard limit and we act — cancel your orders, close your positions, and lock the account until your cooldown ends. Any new trade is closed on sight. Discipline that doesn’t depend on willpower.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    gradient: 'from-blue-500/15 to-indigo-500/5',
    accentColor: 'text-blue-400',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="section-padding relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-4">
            How protection works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
            Watch → Notify → Enforce
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            One always-on loop: we watch every trade you make (mobile included), ping you on
            the channels you pick, and step in automatically when you cross a line.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative rounded-3xl border border-white/[0.06] bg-surface-900/30 p-8 hover:bg-surface-900/50 hover:border-white/[0.1] transition-all duration-500"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center ${benefit.accentColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {benefit.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-3 leading-snug">{benefit.title}</h3>
              <p className="text-slate-400 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
