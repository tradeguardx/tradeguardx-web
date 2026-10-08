import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createCheckoutSession, validateCoupon } from '../../../api/paymentsApi';
import { getPricingPlans } from '../../../api/pricingApi';
import { trackBilling } from '../../../lib/analytics';
import { checkoutCouponCode } from '../../../lib/checkoutCoupon';
import { PROTECTIONS, GLYPH } from './billingContent';

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
const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export default function BillingStep({ onStarted }) {
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
  const chargeOn = new Date(today.getTime() + TRIAL_DAYS * 86400000);
  const timeline = [
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
    <div style={{ color: '#f6f9fc', fontSize: 14 }}>
      {/* ONE status band, and no button on it: the panel's button is the only
          action on this page. */}
      {guardOff && (
        <div className="bs-band" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(240,180,41,.09)', borderBottom: '1px solid rgba(240,180,41,.28)', flexWrap: 'wrap' }}>
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
              <li key={name} className="bs-step" data-done={done ? '1' : '0'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  aria-current={done ? undefined : 'step'}
                  style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: done ? '#00d4aa' : '#f6f9fc', color: done ? '#04140f' : '#070a12', font: "700 12px/1 'Space Grotesk',sans-serif", boxShadow: done ? 'none' : '0 0 0 4px rgba(255,255,255,.12)' }}
                >
                  {done ? '✓' : '4'}
                </span>
                <span className="bs-step__label" style={{ fontSize: 13, fontWeight: 600, color: done ? '#a3b0c2' : '#f6f9fc' }}>{name}</span>
                {i < 3 && <span aria-hidden className="bs-step__bar" style={{ width: 26, height: 1, background: 'rgba(255,255,255,.14)' }} />}
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
            <div style={{ font: "600 10.5px/1 'JetBrains Mono',monospace", letterSpacing: '.18em', textTransform: 'uppercase', color: '#2fe3bd' }}>
              Step 4 of 4 · Last step
            </div>
            <h1 style={{ margin: '10px 0 0', font: "600 clamp(24px,2.4vw,28px)/1.14 'Space Grotesk',sans-serif", letterSpacing: '-.03em', textWrap: 'pretty' }}>
              Set up billing and get <span style={{ color: '#2fe3bd' }}>7 days free</span>
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: '#a3b0c2', textWrap: 'pretty' }}>
              Cancel any time. Nothing is charged today.
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
                    <li key={p.id} style={{ borderTop: i === 0 ? 0 : '1px solid rgba(255,255,255,.07)' }}>
                      <button
                        type="button"
                        onClick={() => toggleRow(p.id)}
                        aria-expanded={open}
                        aria-controls={`prot-${p.id}`}
                        style={{ width: '100%', display: 'flex', gap: 12, padding: '13px 6px', alignItems: 'flex-start', background: 'transparent', border: 0, color: '#f6f9fc', textAlign: 'left' }}
                      >
                        <span aria-hidden style={{ flex: 'none', width: 28, height: 28, borderRadius: 9, background: p.gradient, color: p.color, display: 'grid', placeItems: 'center', marginTop: 1 }}>
                          <Glyph d={GLYPH[p.glyph]} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, letterSpacing: '-.005em' }}>{p.title}</span>
                          <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, lineHeight: 1.5, color: '#a3b0c2' }}>{p.body}</span>
                        </span>
                        <span
                          aria-hidden
                          style={{ flex: 'none', marginTop: 6, color: '#7f8ca0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}
                        >
                          <Glyph d={['M6 9l6 6 6-6']} size={14} />
                        </span>
                      </button>

                      {open && (
                        <div id={`prot-${p.id}`} style={{ padding: '0 6px 14px 50px', display: 'grid', gap: 7 }}>
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#a3b0c2' }}>
                            <b style={{ color: '#ff8178', fontWeight: 700 }}>Pain:</b> {p.pain}
                          </p>
                          {/* No "Fix:" label — the summary above already is
                              the fix. This line is what the summary cannot
                              carry: the caveat, or the specific. */}
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#f6f9fc' }}>{p.detail}</p>
                          {p.note && (
                            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: '#7f8ca0' }}>{p.note}</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p style={{ margin: '12px 2px 0', fontSize: 12, lineHeight: 1.55, color: '#7f8ca0' }}>
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

      </div>
    </div>
  );
}
