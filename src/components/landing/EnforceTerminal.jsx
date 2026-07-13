import { motion } from 'framer-motion';

const LOG = [
  { ts: '14:18:42', kind: 'ok', tag: 'WATCH', msg: <>BTCUSD entry · <b>+0.05 @ 77,540</b> · within risk</> },
  { ts: '14:19:01', kind: 'ok', tag: 'OK', msg: <>Position size 0.8% of balance · pass</> },
  { ts: '14:20:14', kind: 'tick', tag: 'TICK', msg: <>BTCUSD -0.12% · P&amp;L <b>-₹420</b></> },
  { ts: '14:22:33', kind: 'warn', tag: 'WARN', msg: <>Daily loss at <b>65% of cap</b> · cooldown proximity</> },
  { ts: '14:22:34', kind: 'warn', tag: 'NOTIFY', msg: <>Telegram alert dispatched to @user</> },
  { ts: '14:23:07', kind: 'tick', tag: 'TICK', msg: <>New entry attempt · ETHUSD +0.4</> },
  { ts: '14:23:08', kind: 'kill', tag: 'BLOCK', msg: <>Entry rejected · <b>cap proximity rule</b> · cooldown engaged</> },
  { ts: '14:23:08', kind: 'kill', tag: 'ENFORCE', msg: <>Orders cancelled · positions closed · <b>locked 2h</b></> },
];

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.5" strokeWidth={1.8} /></svg>
);
const BellIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" /></svg>
);
const ShieldIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>
);

const ACTIONS = [
  { icon: <EyeIcon />, t: 'We watch — wherever you trade', d: 'Enforcement runs on our servers via the Delta API. Mobile app, web, third-party clients — all covered. Nothing to keep open.' },
  { icon: <BellIcon />, t: 'We notify — only what matters', d: 'Instant alerts to Telegram, WhatsApp, and email. You choose which channels, which rules, which severity. No noise, no daily summary spam.' },
  { icon: <ShieldIcon />, t: 'We enforce — automatically', d: "Cross a hard limit and we cancel your orders, close your positions, and lock the account until your cooldown ends — any new trade is closed on sight. Discipline that doesn't depend on willpower." },
];

const kindColor = { ok: 'text-accent', tick: 'text-slate-400', warn: 'text-amber-400', kill: 'text-rose-400' };

export default function EnforceTerminal() {
  return (
    <section className="section-gap relative border-y border-white/[0.05] bg-gradient-to-b from-surface-900/30 to-surface-950">
      <div className="section-padding mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-16">
        {/* left: copy + items */}
        <div>
          <span className="eyebrow mb-4">How protection runs</span>
          <h2 className="display-lg mt-4">Watch → Notify → Enforce.</h2>
          <p className="body-lg mt-5 max-w-lg">
            One always-on loop. We watch every trade you make — on web, on the Delta mobile app,
            anywhere. Ping you on the channels you pick. Step in automatically when you cross a line.
          </p>

          <div className="mt-8">
            {ACTIONS.map((a) => (
              <div key={a.t} className="flex gap-4 border-t border-white/[0.06] py-5 last:border-b">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-accent/8 text-accent">{a.icon}</span>
                <div>
                  <h5 className="text-[15px] font-semibold text-slate-100">{a.t}</h5>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{a.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right: terminal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-surface-900 to-surface-950 shadow-2xl shadow-black/60"
        >
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-surface-950 px-4 py-3 font-mono text-[11px] text-slate-500">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </span>
            tradeguardx · live feed · delta-api
          </div>
          <div className="space-y-2 p-5 font-mono text-[12px] leading-relaxed">
            {LOG.map((l, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.22 }}
                className="flex gap-3 text-slate-400"
              >
                <span className="flex-shrink-0 text-slate-600">{l.ts}</span>
                <span className={`w-[78px] flex-shrink-0 font-semibold ${kindColor[l.kind]}`}>[ {l.tag} ]</span>
                <span className="[&_b]:font-medium [&_b]:text-slate-200">{l.msg}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
