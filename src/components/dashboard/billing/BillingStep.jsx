import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createCheckoutSession } from '../../../api/paymentsApi';
import { getPricingPlans } from '../../../api/pricingApi';
import { trackBilling } from '../../../lib/analytics';
import { PAIN_FIX, KS_LOG, TAX_ROWS, ACCTS, GLYPH, CARD } from './billingContent';
import { CardHead, Glyph, IconTile, PainFix, Proof } from './protections';

/**
 * Setup step 4 — the only screen in the product that asks for money.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * IT SELLS THE PROTECTIONS, NOT THE PRICE.
 *
 * What it replaced showed three messages that all said the same thing — a red
 * "billing is not set up" band, an amber "your guard is off" box, and a "set
 * up billing" heading — above three plan cards with no statement of what the
 * money buys. Repetition is not emphasis; it reads as nagging, and the plans
 * were being chosen blind.
 *
 * Now: one status band, a headline that is the user's own problem, and five
 * protections each shown as pain → fix → proof. The plan choice sits beside
 * them in a sticky panel, so the thing being bought and the price of it are
 * on screen together.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Built to reference/billing-setup.reference.dc.html. Colours, sizes, radii,
 * shadows and strings are copied from it exactly.
 */

const STEP_NAMES = ['Choose exchange', 'Name account', 'Connect key', 'Set up billing'];

/* Fallbacks only. The pricing endpoint wins — see `options`. */
const PLAN_FALLBACK = [
  { id: 'monthly', name: 'Monthly', price: 1299, per: 'per month', sub: 'Billed every month', save: 0, next: 'every month' },
  { id: 'quarterly', name: 'Quarterly', price: 3299, per: 'per quarter', sub: '₹1,100/mo · billed every 3 months', save: 15, next: 'every 3 months' },
  { id: 'yearly', name: 'Yearly', price: 8999, per: 'per year', sub: '₹750/mo · billed once a year', save: 42, next: 'every year' },
];

const PER = { monthly: 'per month', quarterly: 'per quarter', yearly: 'per year' };
const SUB = { monthly: 'Billed every month', quarterly: 'billed every 3 months', yearly: 'billed once a year' };
const NEXT = { monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year' };
const TRIAL_DAYS = 7;

const inr = (n) => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—');
const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Decorative. Illustrative of a manual lockout, never tied to a real one. */
function Countdown({ reduced }) {
  const [left, setLeft] = useState(5 * 3600 + 42 * 60 + 10);
  useEffect(() => {
    if (reduced) return undefined;
    const t = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 6 * 3600)), 1000);
    return () => window.clearInterval(t);
  }, [reduced]);
  return (
    <div aria-hidden style={{ marginTop: 9, font: "700 34px/1 'JetBrains Mono',monospace", letterSpacing: '-.02em', color: '#fbc94f', fontVariantNumeric: 'tabular-nums' }}>
      {pad(Math.floor(left / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
    </div>
  );
}

export default function BillingStep({ onStarted }) {
  const { user, session } = useAuth();
  const reduced = useReducedMotion();
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState('yearly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rowRefs = useRef([]);

  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);
  useEffect(() => { trackBilling('billing_step_viewed'); }, []);

  /* Real prices win over the table in this file; the layout does not change. */
  const options = useMemo(() => {
    const rows = plans.find((p) => String(p.slug || '').toLowerCase() === 'pro')?.intervals ?? [];
    const live = ['monthly', 'quarterly', 'yearly']
      .map((id) => {
        const r = rows.find((x) => x.interval === id);
        if (!r || typeof r.price !== 'number') return null;
        return {
          id,
          name: id[0].toUpperCase() + id.slice(1),
          price: r.price,
          per: PER[id],
          sub: id === 'monthly' ? SUB.monthly : `${inr(r.perMonth)}/mo · ${SUB[id]}`,
          save: Math.round(r.savingsPct || 0),
          next: NEXT[id],
        };
      })
      .filter(Boolean);
    return live.length ? live : PLAN_FALLBACK;
  }, [plans]);

  const cur = options.find((o) => o.id === plan) ?? options[options.length - 1];

  /*
   * Dates from the real trial length, in IST. "Today" is when the guard comes
   * on; the charge is TRIAL_DAYS later.
   *
   * THE REMINDER ROW IS DELIBERATELY ABSENT. trialEmail.ts selects on
   * `source = 'free'`, and a mandate-backed trial is `source = 'payment'` —
   * so no reminder is sent for the trial this screen starts. Promising one
   * here would be a lie told at the exact moment someone is deciding to trust
   * us with a recurring mandate.
   * TODO: add the row, and the "we email you two days before" sentence, once
   * the sweep covers payment-sourced trials.
   */
  const today = new Date();
  const chargeOn = new Date(today.getTime() + TRIAL_DAYS * 86400000);
  const timeline = [
    { when: `Today · ${fmtDay(today)}`, what: 'Your guard switches on. All five protections start working. ₹0 charged.', dot: '#00d4aa', glow: '0 0 0 4px rgba(0,212,170,.2)', line: true },
    { when: fmtDay(chargeOn), what: `First charge of ${inr(cur.price)}, then ${cur.next} until you cancel.`, dot: '#5b687d', glow: 'none', line: false },
  ];

  const pick = (id) => {
    setPlan(id);
    trackBilling('billing_plan_selected', { plan: id });
  };

  /* Arrow keys move the selection, as a radio group must. */
  const onKey = (e, i) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (i + d + options.length) % options.length;
    pick(options[next].id);
    rowRefs.current[next]?.focus();
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    trackBilling('billing_trial_start_clicked', { plan: cur.id });
    try {
      const res = await createCheckoutSession({ accessToken: session?.access_token, planSlug: 'pro', interval: cur.id });
      if (!res?.checkoutUrl) throw new Error('Could not open checkout. Please try again.');
      trackBilling('billing_trial_started', { plan: cur.id });
      onStarted?.(cur.id);
      window.location.href = res.checkoutUrl;
    } catch (e) {
      const reason = e?.message || 'Could not open checkout. Please try again.';
      trackBilling('billing_trial_failed', { reason });
      setError(reason);
      setBusy(false);
    }
  };

  const guardOff = !(user?.isTrial || user?.access === 'active');

  return (
    <div style={{ color: '#f6f9fc', fontSize: 14 }}>
      {/* ONE status band, and no button on it: the panel's button is the only
          action on this page. */}
      {guardOff && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 28px', background: 'rgba(240,180,41,.09)', borderBottom: '1px solid rgba(240,180,41,.28)', flexWrap: 'wrap', margin: '0 -28px' }}>
          <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, background: 'rgba(240,180,41,.16)', display: 'grid', placeItems: 'center', color: '#fbc94f' }}>
            <Glyph d={GLYPH.warn} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.5, color: '#c9d2e0' }}>
            <b style={{ color: '#fbc94f' }}>Your guard is off.</b> Your key is connected and your rules are saved, but nothing is enforced until you finish this step.
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '26px 0 80px' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>
          {STEP_NAMES.map((name, i) => {
            const done = i < 3;
            return (
              <li key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  aria-current={done ? undefined : 'step'}
                  style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: done ? '#00d4aa' : '#f6f9fc', color: done ? '#04140f' : '#070a12', font: "700 12px/1 'Space Grotesk',sans-serif", boxShadow: done ? 'none' : '0 0 0 4px rgba(255,255,255,.12)' }}
                >
                  {done ? '✓' : '4'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#a3b0c2' : '#f6f9fc' }}>{name}</span>
                {i < 3 && <span aria-hidden style={{ width: 26, height: 1, background: 'rgba(255,255,255,.14)' }} />}
              </li>
            );
          })}
        </ol>

        {/*
          * Tightened from the reference's 40px and four lines of sub.
          * At real viewport widths the headline wrapped to two full lines and
          * the sub to three, so the first protection card started below the
          * fold — on the one screen whose whole job is to show what the money
          * buys. The sentence about running on our servers is not lost: card
          * one makes the same point where it is being demonstrated.
          */}
        <div style={{ marginTop: 26, maxWidth: 720 }}>
          <div style={{ font: "600 10.5px/1 'JetBrains Mono',monospace", letterSpacing: '.18em', textTransform: 'uppercase', color: '#2fe3bd' }}>
            Step 4 of 4 · Last step
          </div>
          <h1 style={{ margin: '10px 0 0', font: "600 clamp(24px,2.6vw,30px)/1.14 'Space Grotesk',sans-serif", letterSpacing: '-.032em', textWrap: 'pretty' }}>
            Accounts aren&rsquo;t lost to one bad trade. <span style={{ color: '#7f8ca0' }}>They&rsquo;re lost to the trades after it.</span>
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: '#a3b0c2', maxWidth: '62ch', textWrap: 'pretty' }}>
            Every plan turns on all five protections below. Free for 7 days — nothing charged today.
          </p>
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 600px', minWidth: 0, display: 'grid', gap: 16 }}>

            {/* 01 — the kill switch, full width: it is the product. */}
            <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: '#0d1422', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <div aria-hidden style={{ position: 'absolute', width: 420, height: 420, right: -160, top: -200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(239,68,68,.16),transparent 66%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', gap: 24, padding: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <CardHead
                    tile={<IconTile gradient="linear-gradient(145deg,#ff8a80,#d63a2f)" color="#fff" d={GLYPH.shield} />}
                    kicker="01 · Automatic"
                    title="Rule-based kill switch"
                    titleSize={20}
                  />
                  <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 11 }}>
                      <span style={{ flex: 'none', marginTop: 2, font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '.1em', padding: '4px 6px', borderRadius: 5, background: 'rgba(239,68,68,.14)', color: '#ff8178', height: 'fit-content' }}>PAIN</span>
                      <span style={{ fontSize: 14, lineHeight: 1.55, color: '#c9d2e0' }}>{PAIN_FIX.killSwitch.pain}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 11 }}>
                      <span style={{ flex: 'none', marginTop: 2, font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '.1em', padding: '4px 6px', borderRadius: 5, background: 'rgba(0,212,170,.14)', color: '#2fe3bd', height: 'fit-content' }}>FIX</span>
                      <span style={{ fontSize: 14, lineHeight: 1.55, color: '#f6f9fc' }}>{PAIN_FIX.killSwitch.fix}</span>
                    </div>
                  </div>
                </div>
                <div style={{ flex: '1 1 260px', minWidth: 0, padding: 16, borderRadius: 16, background: '#070a12', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#a3b0c2' }}>
                    <span>Today</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}><b style={{ color: '#ff8178' }}>−$220.00</b> of −$220 limit</span>
                  </div>
                  <div aria-hidden style={{ marginTop: 9, height: 8, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#f0b429,#ef4444)', animation: reduced ? 'none' : 'bsFill 1.4s cubic-bezier(.2,.8,.2,1) both' }} />
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                    {KS_LOG.map((l) => (
                      <div key={l.x} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                        <span style={{ flex: 'none', font: "500 11px/1 'JetBrains Mono',monospace", color: '#5b687d' }}>{l.t}</span>
                        <span aria-hidden style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: l.c }} />
                        <span style={{ color: '#c9d2e0' }}>{l.x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: 16 }}>

              <section style={CARD}>
                <CardHead tile={<IconTile gradient="linear-gradient(145deg,#ffd666,#e0a400)" color="#2a1a00" d={GLYPH.power} stroke={2.1} />} kicker="02 · You press it" title="Manual kill switch" />
                <PainFix {...PAIN_FIX.manual} />
                <Proof>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#7f8ca0' }}>LOCKED · TRADING RESUMES IN</div>
                    <Countdown reduced={reduced} />
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {['3h', '6h', '12h'].map((h) => (
                        <span key={h} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, ...(h === '6h' ? { color: '#2a1a00', background: '#f0b429' } : { color: '#7f8ca0', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }) }}>{h}</span>
                      ))}
                    </div>
                  </div>
                </Proof>
              </section>

              <section style={CARD}>
                <CardHead tile={<IconTile gradient="linear-gradient(145deg,#7cb0fd,#2563eb)" color="#fff" d={GLYPH.receipt} />} kicker="03 · March, sorted" title="Tax management" />
                <PainFix {...PAIN_FIX.tax} />
                <Proof padding={0}>
                  {TAX_ROWS.map((r) => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 12.5 }}>
                      <span style={{ color: '#a3b0c2' }}>{r.k}</span>
                      <b style={{ fontVariantNumeric: 'tabular-nums', color: r.c }}>{r.v}</b>
                    </div>
                  ))}
                  {/* Legally careful. Keep this wording. */}
                  <div style={{ padding: '9px 14px', fontSize: 11, color: '#7f8ca0' }}>Illustrative, not a confirmed liability. Review with your CA.</div>
                </Proof>
              </section>

              <section style={CARD}>
                <CardHead tile={<IconTile gradient="linear-gradient(145deg,#5ff2d2,#00a98a)" color="#04140f" d={GLYPH.windows} />} kicker="04 · Up to 5" title="More than one account" />
                <PainFix {...PAIN_FIX.accounts} />
                <Proof padding={0}>
                  {ACCTS.map((a) => (
                    <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                      <span aria-hidden style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: '#fd7d02', display: 'grid', placeItems: 'center', font: "800 11px/1 'Space Grotesk',sans-serif", color: '#fff' }}>Δ</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{a.name}</span>
                        <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: '#7f8ca0' }}>{a.rules}</span>
                      </span>
                      <span style={{ flex: 'none', font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '.1em', padding: '4px 7px', borderRadius: 5, background: a.bg, color: a.fg }}>{a.state}</span>
                    </div>
                  ))}
                </Proof>
              </section>

              <section style={CARD}>
                <CardHead tile={<IconTile gradient="linear-gradient(145deg,#b191fb,#7c3aed)" color="#fff" d={GLYPH.sparkle} />} kicker="05 · Learn from it" title="Journal + AI trade analyser" />
                <PainFix {...PAIN_FIX.journal} />
                <Proof ring="rgba(139,92,246,.3)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#b191fb' }}>
                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#b191fb', animation: reduced ? 'none' : 'bsPulse 2s ease-in-out infinite' }} />
                    PATTERN FOUND · 90 DAYS
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.5, color: '#f6f9fc' }}>
                    You widen your stop after two losses in a row. It has cost you <b style={{ color: '#ff8178' }}>−$412.60</b>.
                  </div>
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 9, background: 'rgba(139,92,246,.16)', color: '#c4b0ff', fontSize: 12, fontWeight: 700 }}>
                    <Glyph d={GLYPH.shieldPlain} size={13} width={2.2} />
                    Suggested: close after 2 losses
                  </div>
                </Proof>
              </section>
            </div>

            <p style={{ margin: '4px 2px 0', fontSize: 12.5, lineHeight: 1.55, color: '#7f8ca0' }}>
              All five come with every plan. Plans only change how often you pay.
            </p>
          </div>

          <aside style={{ flex: '1 1 340px', maxWidth: 440, minWidth: 0, position: 'sticky', top: 20 }}>
            <div style={{ position: 'relative', overflow: 'hidden', padding: 22, borderRadius: 24, background: '#0d1422', boxShadow: 'inset 0 0 0 1px rgba(0,212,170,.28),0 30px 70px -40px rgba(0,212,170,.5)' }}>
              <div aria-hidden style={{ position: 'absolute', width: 360, height: 360, left: -140, top: -200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,170,.18),transparent 66%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <h2 style={{ margin: 0, font: "600 20px/1.2 'Space Grotesk',sans-serif", letterSpacing: '-.02em' }}>Choose how you pay</h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#a3b0c2' }}>Same protection on every plan.</p>

                <div role="radiogroup" aria-label="Billing interval" style={{ marginTop: 16, display: 'grid', gap: 9 }}>
                  {options.map((o, i) => {
                    const on = cur.id === o.id;
                    return (
                      <button
                        key={o.id}
                        ref={(el) => { rowRefs.current[i] = el; }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => pick(o.id)}
                        onKeyDown={(e) => onKey(e, i)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, minHeight: 68, padding: '13px 15px', border: 0, borderRadius: 15, background: on ? 'rgba(0,212,170,.08)' : 'rgba(255,255,255,.03)', boxShadow: on ? 'inset 0 0 0 1.5px #00d4aa' : 'inset 0 0 0 1px rgba(255,255,255,.09)', color: '#f6f9fc', textAlign: 'left', transition: 'background .15s ease' }}
                      >
                        <span aria-hidden style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', boxShadow: on ? 'inset 0 0 0 2px #00d4aa' : 'inset 0 0 0 2px rgba(255,255,255,.22)', display: 'grid', placeItems: 'center' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? '#00d4aa' : 'transparent' }} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{o.name}</span>
                            {o.save > 0 && (
                              <span style={{ font: "700 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.06em', padding: '4px 6px', borderRadius: 5, background: 'rgba(0,212,170,.16)', color: '#2fe3bd' }}>SAVE {o.save}%</span>
                            )}
                          </span>
                          <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: '#7f8ca0' }}>{o.sub}</span>
                        </span>
                        <span style={{ flex: 'none', textAlign: 'right' }}>
                          <span style={{ display: 'block', font: "700 18px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{inr(o.price)}</span>
                          <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#7f8ca0' }}>{o.per}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: '#070a12', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' }}>
                  <div style={{ font: "600 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#7f8ca0' }}>WHAT HAPPENS NEXT</div>
                  <div style={{ marginTop: 14, display: 'grid' }}>
                    {timeline.map((t) => (
                      <div key={t.when} style={{ display: 'flex', gap: 12 }}>
                        <span aria-hidden style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: t.dot, boxShadow: t.glow }} />
                          {t.line && <span style={{ flex: 1, width: 2, minHeight: 18, background: 'rgba(255,255,255,.1)' }} />}
                        </span>
                        <span style={{ paddingBottom: 14, marginTop: -3 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{t.when}</span>
                          <span style={{ display: 'block', marginTop: 3, fontSize: 12, lineHeight: 1.5, color: '#a3b0c2' }}>{t.what}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#a3b0c2' }}>Due today</span>
                  <span style={{ font: "700 30px/1 'Space Grotesk',sans-serif", letterSpacing: '-.03em', color: '#2fe3bd' }}>₹0</span>
                </div>

                <button
                  type="button"
                  onClick={start}
                  disabled={busy}
                  className="bs-cta"
                  style={{ marginTop: 14, width: '100%', minHeight: 54, padding: 15, border: 0, borderRadius: 14, background: '#00d4aa', color: '#02241d', fontSize: 15, fontWeight: 800, boxShadow: '0 14px 34px -14px rgba(0,212,170,.8)', opacity: busy ? 0.75 : 1 }}
                >
                  {busy ? 'Starting your trial…' : `Start 7 days free · ${cur.name}`}
                </button>

                {error && (
                  <p role="alert" style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.5, color: '#ff8178', textAlign: 'center' }}>{error}</p>
                )}

                {/* No promise of a reminder email: none is sent for a
                    payment-sourced trial. See the TODO above. */}
                <p style={{ margin: '11px 0 0', fontSize: 12, lineHeight: 1.5, color: '#7f8ca0', textAlign: 'center' }}>
                  Cancel any time in Plan &amp; billing.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Phone: the panel has wrapped below the cards, so the action would
            be a scroll away. Same handler, same state — not a second button
            with its own idea of what is selected. */}
        <div className="bs-stickybar">
          <span style={{ flex: 'none' }}>
            <span style={{ display: 'block', fontSize: 11, color: '#7f8ca0' }}>Due today</span>
            <span style={{ display: 'block', font: "700 18px/1 'Space Grotesk',sans-serif", color: '#2fe3bd' }}>₹0</span>
          </span>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="bs-cta"
            style={{ flex: 1, minHeight: 54, padding: 15, border: 0, borderRadius: 14, background: '#00d4aa', color: '#02241d', fontSize: 15, fontWeight: 800, opacity: busy ? 0.75 : 1 }}
          >
            {busy ? 'Starting your trial…' : `Start 7 days free · ${cur.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
