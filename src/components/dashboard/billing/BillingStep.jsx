import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createCheckoutSession, validateCoupon, fetchTrialEligibility } from '../../../api/paymentsApi';
import { getPricingPlans } from '../../../api/pricingApi';
import { trackBilling } from '../../../lib/analytics';
import { checkoutCouponCode } from '../../../lib/checkoutCoupon';
import { PROTECTIONS, GLYPH } from './billingContent';
import { Chip, ScoreRing } from '../../revenge/RevengeParts';
import { GRADE, PERIODS } from '../../revenge/revengeFormat';

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

function Glyph({ d, size = 15, width = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.map((p) => <path key={p} d={p} />)}
    </svg>
  );
}

const STEP_NAMES = ['Choose exchange', 'Name account', 'Connect key', 'Your revenge score', 'Start free trial'];
const LAST = STEP_NAMES.length - 1;

/* Fallbacks only. The pricing endpoint wins — see `options`. */
const PLAN_FALLBACK = [
  { id: 'monthly', name: 'Monthly', price: 1299, perMonth: 1299, per: 'per month', sub: 'Billed every month', save: 0, next: 'every month' },
  { id: 'quarterly', name: 'Quarterly', price: 3299, perMonth: 1100, per: 'per quarter', sub: '₹1,100/mo · billed every 3 months', save: 15, next: 'every 3 months' },
  { id: 'yearly', name: 'Yearly', price: 8999, perMonth: 750, per: 'per year', sub: '₹750/mo · billed once a year', save: 42, next: 'every year' },
];

const PER = { monthly: 'per month', quarterly: 'per quarter', yearly: 'per year' };
const SUB = { monthly: 'Billed every month', quarterly: 'billed every 3 months', yearly: 'billed once a year' };
const NEXT = { monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year' };
/* The offer for someone who has never started. What any given user actually
   gets comes from the server — see `trialDays` below. */
const TRIAL_DAYS = 3;

const inr = (n) => (Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—');
const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/**
 * `setupCta` — Plan & billing renders this step before a key is verified
 * (s0, s2). A trial cannot start then, so the button names the step that is
 * actually next and goes there instead of to checkout.
 *
 * `stepsDone` — how many of the five setup steps are finished (default 4:
 * everything but billing). Plan & billing passes fewer in s0/s2, so the
 * step list and the band never tick "Connect key" for a key that is not
 * connected.
 *
 * `onBack` — setup only: this step fills the screen, so it carries its own
 * way back to the revenge score. Plan & billing passes nothing.
 * `revenge` — the report setup just showed. With it, the way back is the
 * score itself: the reason for the trial, one tap from the button that
 * starts it. Without it (skipped, too few trades), a plain back link.
 */
export default function BillingStep({ onStarted, setupCta, stepsDone = LAST, onBack, revenge }) {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [plans, setPlans] = useState([]);
  /*
   * Monthly, not yearly.
   *
   * The reference defaulted to the longest commitment because it is the best
   * per-month price. But this is the first money conversation with someone
   * who signed up today, and a year preselected reads as the choice being
   * made for them. The saving is on screen for anyone who wants it.
   */
  const [plan, setPlan] = useState('monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rowRefs = useRef([]);
  const [openRows, setOpenRows] = useState([]);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  /* null = not asked yet. Cleared whenever the code or the plan changes, so
     a discount can never be shown against a price it was not checked for. */
  const [applied, setApplied] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const toggleRow = (id) =>
    setOpenRows((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  useEffect(() => { getPricingPlans().then(setPlans).catch(() => setPlans([])); }, []);

  /*
   * HOW MANY FREE DAYS THIS PERSON ACTUALLY GETS.
   *
   * Not TRIAL_DAYS. Checkout calls `trialDaysForUser`, which carries a
   * part-used trial across and gives nothing to one that has already ended —
   * so a hardcoded 7 here promised days the charge would not honour, and told
   * a lapsed trialist "₹0 today" before debiting them in full.
   *
   * `null` until it answers, and no day-count is stated before then: every
   * number on this screen is a promise about money.
   */
  const [trialDays, setTrialDays] = useState(null);
  useEffect(() => {
    const token = session?.access_token;
    if (!token) return undefined;
    let alive = true;
    fetchTrialEligibility({ accessToken: token })
      .then((r) => { if (alive && typeof r?.trialDays === 'number') setTrialDays(r.trialDays); })
      .catch(() => { /* Stays null; the screen says "free trial" without a count. */ });
    return () => { alive = false; };
  }, [session?.access_token]);
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
          /* The per-month figure, carried so the savings badge and the
             subline can be recomputed when a coupon lands. Without it the
             comparison fell back to the full price and measured yearly's
             ₹8,999 against monthly's ₹1,299 — a negative saving, so no badge
             rendered at all. */
          perMonth: r.perMonth ?? r.price,
          per: PER[id],
          sub: id === 'monthly' ? SUB.monthly : `${inr(r.perMonth)}/mo · ${SUB[id]}`,
          save: Math.round(r.savingsPct || 0),
          next: NEXT[id],
        };
      })
      .filter(Boolean);
    return live.length ? live : PLAN_FALLBACK;
  }, [plans]);

  const cur = options.find((o) => o.id === plan) ?? options[0];

  /*
   * A code they typed beats the one we carry for them.
   *
   * `checkoutCouponCode` is the referral or promo picked up from the link
   * that brought them here, and it was only ever applied on the pricing
   * page — so anyone who arrived through a referral and subscribed from
   * setup lost the attribution silently: they paid full price and the
   * referrer was never credited for a sale they made.
   */
  const autoCoupon = checkoutCouponCode({ interval: cur.id, multiInterval: options.length > 1 });
  const effectiveCoupon = coupon.trim() || autoCoupon || undefined;

  /*
   * CHECKED AGAINST EVERY INTERVAL, NOT JUST THE SELECTED ONE.
   *
   * A Dodo discount carries `restricted_to`, so a code can be real for
   * monthly and meaningless for yearly. Checking only the selected plan meant
   * the other two rows showed full price with no way to tell whether that was
   * the truth or just something we had not asked about — and switching plan
   * silently dropped a discount that may well have applied.
   *
   * Three calls on one deliberate click is a fair price for every row on
   * screen being a number we have actually verified.
   */
  const verified =
    applied && applied.code === coupon.trim().toUpperCase() ? applied.byInterval : null;
  const priceOf = (option) => {
    const v = verified?.[option.id];
    return v?.valid ? Math.round(option.price * (1 - v.percentOff / 100)) : option.price;
  };

  /*
   * THE SAVING AND THE PER-MONTH FIGURE ARE DERIVED, SO THEY MOVE TOO.
   *
   * "SAVE 42%" is yearly's per-month price against monthly's. A coupon that
   * takes 10% off everything leaves that ratio untouched — but one that is
   * good for monthly only does not: yearly at ₹750/mo against a discounted
   * ₹1,169 is 36% cheaper, not 42%. Leaving the badge alone would advertise a
   * saving the customer cannot get, on the screen where they are choosing
   * between exactly these three numbers.
   */
  const perMonthOf = (option) => {
    const v = verified?.[option.id];
    const base = option.perMonth ?? option.price;
    return v?.valid ? base * (1 - v.percentOff / 100) : base;
  };
  const monthlyBaseline = perMonthOf(options.find((o) => o.id === 'monthly') ?? options[0]);
  const savingOf = (option) => {
    if (option.id === 'monthly' || !monthlyBaseline) return 0;
    const pct = Math.round((1 - perMonthOf(option) / monthlyBaseline) * 100);
    /* A discount that makes a longer plan the worse deal shows no badge
       rather than a negative one. */
    return pct > 0 ? pct : 0;
  };

  const discount = verified?.[cur.id]?.valid ? verified[cur.id] : null;
  const payable = priceOf(cur);
  /* Refused for this plan, but good for another — a different sentence from
     "we don't recognise that code", and the one that keeps someone looking at
     the other two rows instead of hunting for a typo. */
  const refusal = verified?.[cur.id] && !verified[cur.id].valid ? verified[cur.id].reason : null;

  const apply = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    try {
      const results = await Promise.all(
        options.map((o) =>
          validateCoupon({ accessToken: session?.access_token, code, planSlug: 'pro', interval: o.id })
            .then((res) => [o.id, res])
            /* One interval failing must not throw away the other two. */
            .catch(() => [o.id, { valid: false, reason: 'LOOKUP' }]),
        ),
      );
      const byInterval = Object.fromEntries(results);
      setApplied({ code, byInterval });
      trackBilling('billing_coupon_applied', { code, valid: Boolean(byInterval[cur.id]?.valid) });
    } finally {
      setCouponBusy(false);
    }
  };

  const COUPON_REFUSAL = {
    UNKNOWN: 'We don’t recognise that code.',
    EXPIRED: 'That code has expired.',
    USED_UP: 'That code has been fully claimed.',
    WRONG_PLAN: 'That code doesn’t apply to this plan — try another billing option.',
    UNSUPPORTED: 'We can’t preview that code here, but it will still be applied at checkout.',
    LOOKUP: 'Couldn’t check that code just now. It will still be applied at checkout.',
  };

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
  /* The free window this user actually gets. Unknown until the server
     answers; zero for a trial that has already run out. */
  const freeDays = trialDays;
  const charged = freeDays === 0;
  const chargeOn = new Date(today.getTime() + (freeDays ?? TRIAL_DAYS) * 86400000);
  const timeline = charged
    ? [
        /* Their free window is spent. "₹0 charged" here and then taking the
           money is the worst thing this screen could say. */
        {
          when: `Today · ${fmtDay(today)}`,
          what: `Your free trial has ended, so your first charge of ${inr(payable)} is today. Your guard switches on straight away.`,
          dot: '#00d4aa',
          glow: '0 0 0 4px rgba(0,212,170,.2)',
          line: true,
        },
        { when: `Then ${cur.next}`, what: 'Renews automatically until you cancel.', dot: '#5b687d', glow: 'none', line: false },
      ]
    : [
    { when: `Today · ${fmtDay(today)}`, what: 'Your guard switches on. All five protections start working. ₹0 charged.', dot: '#00d4aa', glow: '0 0 0 4px rgba(0,212,170,.2)', line: true },
    {
      when: fmtDay(chargeOn),
      /* The discounted figure, when one has been checked — the timeline is
         where someone looks to find out what they will actually be charged,
         and a full price here beside a "15% off" above it is the screen
         contradicting itself. */
      what: `First charge of ${inr(payable)}${
        discount && discount.cycles === 1 ? `, then ${inr(cur.price)} ${cur.next}` : `, then ${cur.next}`
      } until you cancel.`,
      dot: '#5b687d',
      glow: 'none',
      line: false,
    },
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
    if (setupCta) { navigate(setupCta.to); return; }
    if (busy) return;
    setBusy(true);
    setError('');
    trackBilling('billing_trial_start_clicked', { plan: cur.id, coupon: effectiveCoupon ?? null });
    try {
      const res = await createCheckoutSession({
        accessToken: session?.access_token,
        planSlug: 'pro',
        interval: cur.id,
        couponCode: effectiveCoupon,
      });
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
    <div style={{ color: 'var(--ink)', fontSize: 14 }}>
      {/* ONE status band, and no button on it: the panel's button is the only
          action on this page. */}
      {guardOff && (
        <div className="bs-band" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--amber-tint)', borderBottom: '1px solid var(--amber-line)', flexWrap: 'wrap' }}>
          <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, background: 'var(--amber-tint)', display: 'grid', placeItems: 'center', color: 'var(--amber)' }}>
            <Glyph d={GLYPH.warn} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 240, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            <b style={{ color: 'var(--amber)' }}>Your guard is off.</b>{' '}
            {stepsDone >= 3
              ? 'Your key is connected and your rules are saved, but nothing is enforced until you finish this step.'
              : stepsDone === 0
                ? 'Add an account and connect its key first, then set up billing to switch it on.'
                : 'Connect your key first, then set up billing to switch it on.'}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '26px 0 80px' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>
          {STEP_NAMES.map((name, i) => {
            const done = i < Math.min(stepsDone, LAST);
            const current = i === Math.min(stepsDone, LAST);
            return (
              <li key={name} className="bs-step" data-done={done ? '1' : '0'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  aria-current={current ? 'step' : undefined}
                  style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: done ? 'var(--mint-solid)' : current ? 'var(--ink)' : 'transparent', color: done ? '#04140f' : current ? 'var(--bg)' : 'var(--ink-3)', font: "700 12px/1 'Space Grotesk',sans-serif", boxShadow: done ? 'none' : current ? '0 0 0 4px var(--line-strong)' : 'inset 0 0 0 1px var(--line-strong)' }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="bs-step__label" style={{ fontSize: 13, fontWeight: 600, color: current ? 'var(--ink)' : done ? 'var(--ink-2)' : 'var(--ink-3)' }}>{name}</span>
                {i < LAST && <span aria-hidden className="bs-step__bar" style={{ width: 26, height: 1, background: 'var(--line-strong)' }} />}
              </li>
            );
          })}
        </ol>


        {/* The hero lives in the left column so the panel starts at the top
            of the row, level with the headline, instead of below it. The
            space to the right of a 720px headline was empty and the panel was
            230px further down the page than it needed to be. */}
        <div style={{ marginTop: 22, display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 460px', minWidth: 0 }}>
          {/*
            * Tightened from the reference's 40px and four lines of sub.
            * At real viewport widths the headline wrapped to two full lines and
            * the sub to three, so the first protection card started below the
            * fold — on the one screen whose whole job is to show what the money
            * buys. The sentence about running on our servers is not lost: card
            * one makes the same point where it is being demonstrated.
            */}
          <div style={{ marginTop: 0, marginBottom: 22, maxWidth: 720 }}>
            {onBack && (revenge ? <ScoreReminder report={revenge} onBack={onBack} /> : (
              <button type="button" onClick={onBack} className="bs-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 0 16px', padding: '7px 12px 7px 10px', border: '1px solid var(--line-strong)', borderRadius: 999, background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                <span aria-hidden>←</span> Back to your revenge score
              </button>
            ))}
            <div style={{ font: "600 10.5px/1 'JetBrains Mono',monospace", letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--mint)' }}>
              {stepsDone >= LAST ? `Step ${LAST + 1} of ${LAST + 1} · Last step` : `Step ${LAST + 1} of ${LAST + 1}`}
            </div>
            <h1 style={{ margin: '10px 0 0', font: "600 clamp(24px,2.4vw,28px)/1.14 'Space Grotesk',sans-serif", letterSpacing: '-.03em', textWrap: 'pretty' }}>
              {charged
                ? 'Subscribe to switch your guard on'
                : (
                  /* Lead with what they get, not the chore: a trial, not "billing". */
                  <>
                    Start your{' '}
                    <span style={{ color: 'var(--mint)' }}>
                      {freeDays == null ? 'free trial' : `${freeDays}-day free trial`}
                    </span>
                  </>
                )}
            </h1>
            {/* The price of today is the first thing people look for here, so
                it is said as a number. Sat outside the charged check, this line
                once told lapsed trialists "nothing is charged today" directly
                under a headline that was about to charge them. The date only
                appears once the server has said how many days are free. */}
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', textWrap: 'pretty' }}>
              {charged ? (
                <>Your free trial is already used, so <b style={{ color: 'var(--ink)' }}>{inr(payable)} is charged today</b>. Cancel any time.</>
              ) : (
                <>
                  <b style={{ color: 'var(--mint)' }}>Pay ₹0 today</b>
                  {freeDays == null
                    ? ' · cancel any time.'
                    : ` · ${inr(payable)} on ${fmtDay(chargeOn)} · cancel any time before.`}
                </>
              )}
            </p>

          </div>
            {/* Hidden on a phone. On a laptop the list sits beside the plans
                and costs nothing; stacked, it is five accordions and a
                paragraph between the headline and the price, and the price is
                what someone opened this screen to see. The headline still
                makes the argument, and the protections are one tap away in
                the product they are about to have. */}
            <div className="bs-protections">
              {/*
                * Summary always, detail on demand. Someone who already knows
                * why they are here never opens a row; someone weighing it can
                * read the case for the one protection that worries them without
                * the other four arguing at the same time.
                *
                * Rows open independently rather than one-at-a-time: closing
                * something the user did not ask to close is the more annoying
                * of the two behaviours.
                */}
              {/*
                * NO CARD AROUND THE LIST.
                *
                * The plan panel is the taller column by some 400px. With a
                * bordered card here, the left side was a box that stopped dead
                * two-thirds of the way down beside a panel that carried on —
                * which reads as something failing to render rather than as a
                * column of content that is simply shorter.
                *
                * Stretching it instead would spread five rows across a
                * thousand pixels. Taking the box away removes the edge that was
                * drawing attention to the difference: text ending where it ends
                * needs no explanation.
                */}
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 0 }}>
                {PROTECTIONS.map((p, i) => {
                  const open = openRows.includes(p.id);
                  return (
                    <li key={p.id} style={{ borderTop: i === 0 ? 0 : '1px solid var(--line)' }}>
                      <button
                        type="button"
                        onClick={() => toggleRow(p.id)}
                        aria-expanded={open}
                        aria-controls={`prot-${p.id}`}
                        style={{ width: '100%', display: 'flex', gap: 12, padding: '13px 6px', alignItems: 'flex-start', background: 'transparent', border: 0, color: 'var(--ink)', textAlign: 'left' }}
                      >
                        <span aria-hidden style={{ flex: 'none', width: 28, height: 28, borderRadius: 9, background: p.gradient, color: p.color, display: 'grid', placeItems: 'center', marginTop: 1 }}>
                          <Glyph d={GLYPH[p.glyph]} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, letterSpacing: '-.005em' }}>{p.title}</span>
                          <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{p.body}</span>
                        </span>
                        <span
                          aria-hidden
                          style={{ flex: 'none', marginTop: 6, color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}
                        >
                          <Glyph d={['M6 9l6 6 6-6']} size={14} />
                        </span>
                      </button>

                      {open && (
                        <div id={`prot-${p.id}`} style={{ padding: '0 6px 14px 50px', display: 'grid', gap: 7 }}>
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                            <b style={{ color: 'var(--red)', fontWeight: 700 }}>Pain:</b> {p.pain}
                          </p>
                          {/* No "Fix:" label — the summary above already is
                              the fix. This line is what the summary cannot
                              carry: the caveat, or the specific. */}
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)' }}>{p.detail}</p>
                          {p.note && (
                            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-3)' }}>{p.note}</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p style={{ margin: '12px 2px 0', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)' }}>
                All five come with every plan. Plans only change how often you pay.
              </p>
            </div>
          </div>

          {/* Sticky belongs to the two-column arrangement only. Once the
              panel wraps below the list it is the last thing on the page, and
              pinning it there left a screen of empty space above it. The
              class drops `position: sticky` at the same width the columns
              stack — see index.css. */}
          <aside className="bs-panel" style={{ flex: '1 1 340px', maxWidth: 440, minWidth: 0 }}>
            <div style={{ position: 'relative', overflow: 'hidden', padding: 22, borderRadius: 24, color: '#f6f9fc', background: '#0d1422', boxShadow: 'inset 0 0 0 1px rgba(0,212,170,.28),0 30px 70px -40px rgba(0,212,170,.5)' }}>
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
                            {savingOf(o) > 0 && (
                              <span style={{ font: "700 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '.06em', padding: '4px 6px', borderRadius: 5, background: 'rgba(0,212,170,.16)', color: '#2fe3bd' }}>{`SAVE ${savingOf(o)}%`}</span>
                            )}
                          </span>
                          <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: '#7f8ca0' }}>
                            {o.id === 'monthly' ? o.sub : `${inr(Math.round(perMonthOf(o)))}/mo · ${SUB[o.id]}`}
                          </span>
                        </span>
                        <span style={{ flex: 'none', textAlign: 'right' }}>
                          {/* Each row prices itself from its own verdict, so a
                              code that is real for monthly and not for yearly
                              shows exactly that. */}
                          {verified?.[o.id]?.valid ? (
                            <span style={{ display: 'block', font: "700 18px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
                              <span style={{ marginRight: 7, fontSize: 13, fontWeight: 600, color: '#7f8ca0', textDecoration: 'line-through' }}>{inr(o.price)}</span>
                              <span style={{ color: '#2fe3bd' }}>{inr(priceOf(o))}</span>
                            </span>
                          ) : (
                            <span style={{ display: 'block', font: "700 18px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{inr(o.price)}</span>
                          )}
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

                {/*
                  * A coupon field, hidden until asked for.
                  *
                  * An empty box labelled "promo code" on a checkout is a
                  * standing hint that someone else is paying less, and people
                  * leave to go looking for one. Behind a link it is there for
                  * whoever has a code and invisible to everyone else.
                  *
                  * It does not claim the code is valid. Dodo accepts an
                  * unknown code silently, so the only honest moment to say it
                  * worked is the checkout page, where they will see the
                  * amount.
                  */}
                <div style={{ marginTop: 14 }}>
                  {couponOpen || coupon ? (
                    <div>
                      <label htmlFor="bs-coupon" style={{ display: 'block', fontSize: 11.5, color: '#7f8ca0', marginBottom: 6 }}>Coupon code</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          id="bs-coupon"
                          value={coupon}
                          onChange={(e) => { setCoupon(e.target.value); setApplied(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
                          placeholder="Enter code"
                          autoCapitalize="characters"
                          spellCheck={false}
                          style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '11px 13px', border: 0, borderRadius: 12, background: 'rgba(255,255,255,.04)', boxShadow: `inset 0 0 0 1px ${discount ? 'rgba(0,212,170,.45)' : 'rgba(255,255,255,.1)'}`, color: '#f6f9fc', font: "600 13px/1 'JetBrains Mono',monospace", letterSpacing: '.06em', textTransform: 'uppercase' }}
                        />
                        <button
                          type="button"
                          onClick={apply}
                          disabled={!coupon.trim() || couponBusy}
                          style={{ flex: 'none', minHeight: 44, padding: '0 14px', border: 0, borderRadius: 12, background: 'rgba(255,255,255,.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)', color: '#f6f9fc', fontSize: 13, fontWeight: 700, opacity: !coupon.trim() || couponBusy ? 0.5 : 1 }}
                        >
                          {couponBusy ? 'Checking…' : 'Apply'}
                        </button>
                      </div>

                      {discount ? (
                        <p style={{ margin: '7px 0 0', fontSize: 11.5, lineHeight: 1.45, color: '#2fe3bd' }}>
                          {discount.percentOff}% off applied.{' '}
                          {discount.cycles
                            ? `Covers your first ${discount.cycles === 1 ? 'payment' : `${discount.cycles} payments`}, then the full price.`
                            : 'Applies to every renewal.'}
                        </p>
                      ) : refusal ? (
                        <p role="alert" style={{ margin: '7px 0 0', fontSize: 11.5, lineHeight: 1.45, color: refusal === 'UNSUPPORTED' || refusal === 'LOOKUP' ? '#7f8ca0' : '#ff8178' }}>
                          {COUPON_REFUSAL[refusal] ?? COUPON_REFUSAL.UNKNOWN}
                        </p>
                      ) : (
                        <p style={{ margin: '7px 0 0', fontSize: 11.5, lineHeight: 1.45, color: '#7f8ca0' }}>
                          Press Apply to see the new price. It is applied at checkout either way.
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCouponOpen(true)}
                      style={{ padding: 0, border: 0, background: 'none', color: '#7f8ca0', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Have a coupon?
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#a3b0c2' }}>Due today</span>
                  {/* Not a constant: someone whose free week is used is charged
                      in full today, and this line said ₹0 to them too. */}
                  <span style={{ font: "700 30px/1 'Space Grotesk',sans-serif", letterSpacing: '-.03em', color: charged ? '#f6f9fc' : '#2fe3bd' }}>{charged ? inr(payable) : '₹0'}</span>
                </div>

                <button
                  type="button"
                  onClick={start}
                  disabled={busy}
                  className="bs-cta"
                  style={{ marginTop: 14, width: '100%', minHeight: 54, padding: 15, border: 0, borderRadius: 14, background: '#00d4aa', color: '#02241d', fontSize: 15, fontWeight: 800, boxShadow: '0 14px 34px -14px rgba(0,212,170,.8)', opacity: busy ? 0.75 : 1 }}
                >
                  {setupCta
                    ? setupCta.label
                    : busy
                    ? (charged ? 'Starting…' : 'Starting your trial…')
                    : charged
                      ? `Subscribe · ${cur.name}`
                      : `Start ${freeDays == null ? 'free trial' : `${freeDays} day${freeDays === 1 ? '' : 's'} free`} · ${cur.name}`}
                </button>

                {error && (
                  <p role="alert" style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.5, color: '#ff8178', textAlign: 'center' }}>{error}</p>
                )}

                {/* No promise of a reminder email: none is sent for a
                    payment-sourced trial. See the TODO above. */}
                {setupCta ? (
                  <p style={{ margin: '11px 0 0', fontSize: 12, lineHeight: 1.5, color: '#7f8ca0', textAlign: 'center' }}>
                    Cancel any time in Plan &amp; billing.
                  </p>
                ) : (
                  /*
                   * WHAT THE BANK SCREEN WILL SAY, BEFORE IT SAYS IT.
                   *
                   * We say ₹0 today; the UPI app then shows a ₹1 check and
                   * "up to ₹15,000". Read cold, that is a bait-and-switch at
                   * the moment of trust. Card AutoPay is set to the plan's
                   * own price (payments: mandateFloor); UPI keeps its own
                   * ceiling, which we cannot change, so we name it. No
                   * promise the ₹1 is refunded until Dodo confirms it, and
                   * no "a day before": the bank decides the notice.
                   */
                  <p data-autopay-note="1" style={{ margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.55, color: '#a3b0c2', textAlign: 'left' }}>
                    Your bank or UPI app will ask you to approve AutoPay for {inr(payable)} {cur.per}. UPI may also show a ₹1 check and a limit of
                    {' '}&ldquo;up to ₹15,000&rdquo; &mdash; that&rsquo;s UPI&rsquo;s standard ceiling, not what we charge.
                    {!charged && freeDays != null ? ` First charge ${fmtDay(chargeOn)}.` : ''} Your bank tells you before every debit.
                    {' '}Cancel any time in Plan &amp; billing or your UPI app.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}

/* Setup's free-trial step: the score they just saw, small, as the way back.
   The whole card is the button — a 52px ring is an easy target on a phone. */
function ScoreReminder({ report, onBack }) {
  const grade = report.grade ? GRADE[report.grade] : null;
  const period = PERIODS.find((p) => p.months === report.months)?.label;
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={`Back to your revenge score: ${report.score} out of 100`}
      className="bs-back"
      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 620, margin: '0 0 22px', padding: '12px 16px 12px 12px', border: '1px solid var(--line)', borderRadius: 16, background: 'var(--surface)', boxShadow: 'var(--shadow-card)', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)' }}
    >
      <ScoreRing score={report.score} tone={grade?.tone ?? 'neutral'} size={52} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: "600 10.5px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Your revenge score{period ? ` · ${period}` : ''}
          </span>
          {grade && <Chip tone={grade.tone}>{grade.label}</Chip>}
        </span>
        {report.verdict && (
          <span style={{ display: 'block', marginTop: 6, fontSize: 13.5, lineHeight: 1.4, fontWeight: 600, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {report.verdict}
          </span>
        )}
      </span>
      <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 700, color: 'var(--mint)' }}>
        <span aria-hidden>←</span><span className="bs-back__cta"> See my report</span>
      </span>
    </button>
  );
}
