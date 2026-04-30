import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const FORM_ID = import.meta.env.VITE_FORMSPREE_PARTNER_FORM_ID;

const CHANNELS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'discord', label: 'Discord / Telegram' },
  { value: 'newsletter', label: 'Newsletter / Blog' },
  { value: 'prop_firm', label: 'Prop firm / Broker' },
  { value: 'other', label: 'Other' },
];

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'You apply',
    body: 'Tell us about your audience and how you cover trading. We review every application.',
  },
  {
    n: '02',
    title: 'We set up your code',
    body: 'Approved partners get a unique discount code, a personal share link, and a payout plan we agree on.',
  },
  {
    n: '03',
    title: 'You earn',
    body: 'Commission accrues on every paid subscription that uses your code. Track earnings live in your partner dashboard.',
  },
];

export default function PartnerApplyPage() {
  useSEO({
    title: 'Partner with TradeGuardX',
    description:
      'Refer paying customers to TradeGuardX and earn recurring commission. Apply to our partner program for trading creators, educators, and prop firms.',
    url: 'https://tradeguardx.com/partner-with-us',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setError('');

    if (!FORM_ID) {
      setError(
        'Application form is not configured yet. Please email partners@tradeguardx.com directly.',
      );
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    try {
      const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setSuccess(true);
        form.reset();
      } else {
        let message = `Submission failed (status ${res.status})`;
        try {
          const data = await res.json();
          if (data?.errors?.[0]?.message) message = data.errors[0].message;
          else if (data?.error) message = data.error;
        } catch { /* ignore */ }
        setError(message);
      }
    } catch (err) {
      setError(err?.message || 'Could not reach the application service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#07090f' }}>
      {/* Ambient background — same vibe as PricingPage */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 65%)' }}
        />
        <div
          className="absolute right-[-10%] top-[40%] h-[400px] w-[500px] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.04), transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-28">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 max-w-3xl"
        >
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{ borderColor: 'rgba(0,212,170,0.22)', backgroundColor: 'rgba(0,212,170,0.07)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 6px rgba(0,212,170,0.8)' }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#00d4aa' }}>
              Partner program
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-[3.5rem]">
            Earn recurring commission for every trader you bring to TradeGuardX.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
            We work with trading creators, educators, prop firms, and community
            leaders. If your audience trades — and you'd vouch for protecting
            their accounts — we want to talk.
          </p>
        </motion.header>

        {/* How it works */}
        <section className="mb-16 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl p-6"
              style={{
                border: '1px solid rgba(255,255,255,0.07)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <p
                className="font-display text-sm font-bold tracking-[0.18em]"
                style={{ color: '#00d4aa' }}
              >
                {step.n}
              </p>
              <h3 className="mt-2 font-display text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </motion.div>
          ))}
        </section>

        {/* Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl p-[1px]"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,212,170,0.30) 0%, rgba(0,212,170,0.06) 50%, rgba(139,92,246,0.20) 100%)',
          }}
        >
          <div className="rounded-[calc(1.5rem-1px)] p-8 sm:p-10" style={{ backgroundColor: '#0d1425' }}>
            {success ? (
              <SuccessState onReset={() => setSuccess(false)} />
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
                  Apply to the program
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-400">
                  We'll review and reply within 3 business days. Required fields are marked with <span className="text-accent">*</span>.
                </p>

                <form onSubmit={onSubmit} className="mt-8 grid gap-5">
                  <Field label="Your name" name="full_name" required>
                    <input
                      name="full_name"
                      type="text"
                      required
                      placeholder="Alice Trader"
                      autoComplete="name"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  <Field label="Email" name="email" required>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="alice@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Primary channel" name="primary_channel" required>
                      <select
                        name="primary_channel"
                        required
                        defaultValue=""
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                      >
                        <option value="" disabled>Select…</option>
                        {CHANNELS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Audience size (estimate)" name="audience_size">
                      <input
                        name="audience_size"
                        type="text"
                        placeholder="e.g. 25k subs, 10k newsletter"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                      />
                    </Field>
                  </div>

                  <Field label="Channel URL" name="channel_url" required>
                    <input
                      name="channel_url"
                      type="url"
                      required
                      placeholder="https://youtube.com/@yourchannel"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  <Field label="What do you cover?" name="content_type" required>
                    <input
                      name="content_type"
                      type="text"
                      required
                      placeholder="e.g. day trading futures, prop firm reviews, ICT education…"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  <Field label="Why TradeGuardX is a fit for your audience" name="motivation" required>
                    <textarea
                      name="motivation"
                      required
                      rows={4}
                      placeholder="Tell us a bit about how this lines up with what your audience needs."
                      className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  <Field label="Preferred discount code (optional)" name="requested_coupon_code" hint="3–16 characters, letters and numbers only.">
                    <input
                      name="requested_coupon_code"
                      type="text"
                      pattern="[A-Za-z0-9]{3,16}"
                      placeholder="e.g. ALICE10"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm uppercase tracking-wider text-white placeholder-slate-500 transition focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
                    />
                  </Field>

                  {/* Honeypot — Formspree drops submissions where this is filled */}
                  <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                  {error && (
                    <p
                      className="rounded-xl border px-4 py-3 text-sm"
                      style={{
                        borderColor: 'rgba(244,63,94,0.25)',
                        backgroundColor: 'rgba(244,63,94,0.06)',
                        color: '#fb7185',
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-60"
                      style={{
                        background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                        color: '#07090f',
                        boxShadow: '0 4px 20px rgba(0,212,170,0.30)',
                      }}
                    >
                      {submitting ? 'Submitting…' : 'Submit application'}
                      {!submitting && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      )}
                    </button>
                    <p className="text-xs text-slate-500">
                      Already a partner? <Link to="/influencer/overview" className="text-accent hover:underline">Sign in →</Link>
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function Field({ label, name, required, hint, children }) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SuccessState({ onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-8"
    >
      <motion.div
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
          boxShadow: '0 0 30px rgba(0,212,170,0.45)',
        }}
      >
        <svg className="h-6 w-6" fill="none" stroke="#07090f" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </motion.div>
      <h2 className="mt-6 font-display text-2xl font-bold text-white md:text-3xl">
        Application received
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        Thanks — we'll review and reply within 3 business days. If you don't hear back,
        check your spam folder, then email{' '}
        <a href="mailto:partners@tradeguardx.com" className="text-accent hover:underline">
          partners@tradeguardx.com
        </a>
        .
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/[0.15] hover:text-white"
        >
          Back to home
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/[0.15] hover:text-white"
        >
          Submit another
        </button>
      </div>
    </motion.div>
  );
}
