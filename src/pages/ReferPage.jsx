import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReferralMe, setReferralCurrency } from '../api/referralApi';
import { useIsMobile } from '../hooks/useIsMobile';
import { sx } from '../components/dashboard/shell/sx';

/**
 * /dashboard/refer — Refer a friend.
 *
 * Everything on it comes from GET /payments/referral/me (REFERRAL_CONTRACT.md):
 * the link, the reward sizes, the hold, the yearly cap and the rewards. The
 * copy reads those numbers rather than restating them, so a change on the
 * server cannot leave the page promising something else.
 *
 * NO VERDICT BEFORE DATA. Until the response lands the page shows the shape
 * of itself and nothing else — never "0 friends", which on a slow connection
 * would tell a referrer their friends had not joined. A failed load says it
 * failed and offers a retry; it does not fall back to zeros either.
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)';
const MONO_LABEL = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)";
const BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap';
const BTN_PRIMARY = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 15px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap';

const PLAN_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
/** ₹ for Amazon India vouchers, $ for referrers abroad (voucherCurrency from the server). */
const formatMoney = (n, cur) => (cur === 'USD' ? `$${Math.round(Number(n) || 0).toLocaleString('en-US')}` : inr(n));
const MONO = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase";
const STRIPES = 'repeating-linear-gradient(-45deg,var(--mint-solid) 0 4px,transparent 4px 8px)';
const STRIPES_AMBER = 'repeating-linear-gradient(-45deg,var(--amber-solid) 0 4px,transparent 4px 8px)';

function shortDate(iso, withDay = false) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('en-IN', withDay ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand?.('copy');
    document.body.removeChild(el);
    return Boolean(ok);
  } catch {
    return false;
  }
}

function CopyButton({ text, label = 'Copy', primary = false, ariaLabel }) {
  const [state, setState] = useState('idle');
  useEffect(() => {
    if (state === 'idle') return undefined;
    const t = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
      style={sx(primary ? BTN_PRIMARY : BTN)}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}
    </button>
  );
}

function shareMessage(pct) {
  return `I use TradeGuardX to hold myself to my own loss limits. Sign up with my link and get ${pct}% off your first Pro payment:`;
}

/** WhatsApp, Telegram, X — plain links, so they work with nothing loaded. */
function shareLinks(link, pct) {
  const msg = shareMessage(pct);
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(link)}` },
  ];
}

function Skel({ h, w = '100%', r = 8, style }) {
  return (
    <div className="tgx-skel" aria-hidden="true" style={sx('position:relative;overflow:hidden;background:var(--surface-2)', { height: h, width: w, borderRadius: r, ...style })}>
      <span className="tgx-skel__sweep" />
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Loading your referrals…</span>
      <section style={sx(`padding:19px;margin-bottom:16px;${CARD}`)}>
        <Skel h={12} w="min(160px,50%)" />
        <Skel h={42} r={10} style={{ marginTop: 14 }} />
        <Skel h={34} w="min(320px,90%)" r={9} style={{ marginTop: 12 }} />
      </section>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:16px')}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={sx(`padding:16px;${CARD}`)}>
            <Skel h={9} w="55%" />
            <Skel h={24} w="45%" style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>
      <section style={sx(`padding:19px;${CARD}`)}>
        <Skel h={12} w="min(200px,60%)" />
        <Skel h={10} w="min(420px,95%)" style={{ marginTop: 14 }} />
        <Skel h={10} w="min(360px,80%)" style={{ marginTop: 8 }} />
      </section>
    </div>
  );
}

/** One figure in the progress strip; dividers come from the grid gap. */
function Stat({ label, value, note, full }) {
  return (
    <div style={sx('padding:16px 18px;background:var(--surface);min-width:0', full ? { gridColumn: '1 / -1' } : null)}>
      <div style={sx(MONO_LABEL)}>{label}</div>
      <div style={sx("margin-top:9px;font:600 22px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:var(--ink)")}>{value}</div>
      {note ? <div style={sx('margin-top:6px;font-size:11.5px;color:var(--ink-3)')}>{note}</div> : null}
    </div>
  );
}

/** Brand glyphs for the share buttons — simple shapes, coloured like the app. */
const SHARE_ICON = {
  whatsapp: { bg: '#25D366', d: 'M5 19l1.1-3.3A7 7 0 1 1 8.6 18zM9.3 8.6c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c.5.9 1.2 1.6 2.1 2.1l.5-.5c.1-.1.3-.2.4-.1l1.4.6c.2.1.3.2.3.4v.4c0 .3-.1.6-.4.8-.5.4-1.2.5-1.9.3-2-.6-3.6-2.2-4.2-4.2-.2-.7-.1-1.4.3-1.9z' },
  telegram: { bg: '#229ED9', d: 'M19.5 5.5L4.6 11.3c-.6.2-.6 1.1 0 1.3l3.7 1.2 1.4 4.3c.2.5.8.6 1.1.2l2-2.1 3.8 2.8c.4.3 1 .1 1.1-.4l2.7-12.3c.1-.6-.5-1.1-1-.8zM9.4 13.6l7.2-5.3' },
  x: { bg: '#111111', d: 'M5 5l14 14M19 5L5 19' },
};

function ShareButton({ id, label, href }) {
  const ic = SHARE_ICON[id];
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="tgx-refer-share" style={sx(BTN, 'padding:8px 13px 8px 8px')}>
      <span aria-hidden="true" style={sx('width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex:none', { background: ic.bg })}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={id === 'x' ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={ic.d} /></svg>
      </span>
      {label}
    </a>
  );
}

/** The voucher, drawn as a ticket: what the referrer is working towards. */
function VoucherTicket({ amount, label = 'Amazon voucher' }) {
  return (
    <div aria-hidden="true" style={sx('position:relative;width:200px;flex:none;transform:rotate(-4deg)')}>
      <div style={sx('position:absolute;inset:10px -8px -8px 10px;border-radius:16px;background:var(--mint-tint);border:1px solid var(--mint-line)')} />
      <div style={sx('position:relative;border-radius:16px;overflow:hidden;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 18px 40px -18px rgba(0,0,0,.35)')}>
        <div style={sx('padding:14px 16px 12px;background:linear-gradient(135deg,var(--mint-solid),color-mix(in srgb,var(--mint-solid) 55%,#000))')}>
          <div style={sx("font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--on-mint);opacity:.8")}>{label}</div>
          <div style={sx("margin-top:8px;font:700 30px/1 'Space Grotesk',sans-serif;letter-spacing:-.04em;color:var(--on-mint)")}>{amount}</div>
        </div>
        <div style={sx('position:relative;height:0;border-top:2px dashed var(--line-strong)')}>
          <span style={sx('position:absolute;left:-9px;top:-9px;width:16px;height:16px;border-radius:50%;background:var(--bg, var(--surface-2))')} />
          <span style={sx('position:absolute;right:-9px;top:-9px;width:16px;height:16px;border-radius:50%;background:var(--bg, var(--surface-2))')} />
        </div>
        <div style={sx('padding:11px 16px 13px;font-size:11px;line-height:1.45;color:var(--ink-3)')}>Per friend on yearly Pro. Your code shows up here once sent.</div>
      </div>
    </div>
  );
}

function Step({ n, title, body }) {
  return (
    <div style={sx('display:flex;gap:12px;min-width:0')}>
      <span style={sx("flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--mint-tint);border:1px solid var(--mint-line);color:var(--mint);font:700 12.5px/1 'Space Grotesk',sans-serif")}>{n}</span>
      <div style={sx('min-width:0')}>
        <div style={sx('font-size:13.5px;font-weight:700;color:var(--ink)')}>{title}</div>
        <div style={sx('margin-top:3px;font-size:12.5px;line-height:1.55;color:var(--ink-3)')}>{body}</div>
      </div>
    </div>
  );
}

function TierTile({ plan, amount, best, compact }) {
  return (
    <div style={sx(`position:relative;padding:${compact ? '12px 11px' : '15px 16px'};border-radius:14px;min-width:0;border:1px solid ${best ? 'var(--mint-line)' : 'var(--line)'};background:${best ? 'var(--mint-tint)' : 'var(--surface-2)'}`)}>
      {best && !compact ? <span style={sx("position:absolute;top:12px;right:12px;padding:3px 7px;border-radius:999px;background:var(--mint-solid);color:var(--on-mint);font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase")}>Most</span> : null}
      <div style={sx('font-size:12px;font-weight:600;color:var(--ink-3)')}>{compact ? plan.charAt(0).toUpperCase() + plan.slice(1) : `Friend picks ${plan}`}</div>
      <div style={sx("margin-top:7px;font:700 24px/1 'Space Grotesk',sans-serif;letter-spacing:-.035em;color:var(--ink)", compact ? { fontSize: 20 } : null)}>{amount}</div>
      {compact ? null : <div style={sx('margin-top:5px;font-size:11.5px;color:var(--ink-3)')}>Amazon voucher</div>}
    </div>
  );
}

function money(bucket) {
  return { count: Number(bucket?.count) || 0, inr: Number(bucket?.inr) || 0 };
}

/* ─────────────── Journey tracker ─────────────── */

const STEPS = ['Signed up', 'Paid', '3-day wait', 'Voucher'];

/** For each status: how many steps are done, and how the current one looks. */
function journey(status) {
  switch (status) {
    case 'joined': return { done: 1, current: 'mint' };
    case 'waiting': return { done: 2, current: 'mint' };
    case 'due': return { done: 3, current: 'mint' };
    case 'held': return { done: 3, current: 'amber' };
    case 'sent': return { done: 4, current: null };
    default: return { done: 0, current: null };
  }
}

function Tracker({ status }) {
  const { done, current } = journey(status);
  return (
    <div role="img" aria-label={`Progress: ${STEPS.slice(0, done).join(', ') || 'none'} done`} style={sx('display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;min-width:0')}>
      {STEPS.map((label, i) => {
        const isDone = i < done;
        const isCur = i === done && current;
        const bg = isDone ? 'var(--mint-solid)' : isCur ? (current === 'amber' ? STRIPES_AMBER : STRIPES) : 'var(--surface-2)';
        const fg = isCur ? (current === 'amber' ? 'var(--amber)' : 'var(--ink)') : isDone ? 'var(--ink-2)' : 'var(--ink-faint)';
        return (
          <div key={label} style={sx('min-width:0')}>
            <div style={sx('height:5px;border-radius:999px', { background: bg })} />
            <div style={sx(MONO, 'margin-top:8px;letter-spacing:.1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', { color: fg })}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function statusLine(f, hold) {
  switch (f.status) {
    case 'joined': return { top: 'Waiting for their first payment', sub: f.signedUpAt ? `Signed up ${shortDate(f.signedUpAt)}` : '', fg: 'var(--ink)' };
    case 'waiting': return { top: `In the ${hold}-day wait`, sub: f.dueAt ? `Qualifies ${shortDate(f.dueAt, true)}` : '', fg: 'var(--ink)' };
    case 'due': return { top: 'Qualified. Voucher on its way', sub: 'We email it to you soon', fg: 'var(--mint)' };
    case 'held': return { top: 'Held: you’ve hit this year’s limit', sub: 'Still tracked. See the note above', fg: 'var(--amber)' };
    case 'sent': return { top: 'Voucher sent', sub: f.sentAt ? `Emailed ${shortDate(f.sentAt)}` : '', fg: 'var(--mint)' };
    case 'void': return { top: 'Not eligible', sub: 'This payment didn’t qualify', fg: 'var(--ink-faint)' };
    default: return { top: '', sub: '', fg: 'var(--ink)' };
  }
}

function FriendRow({ f, hold, isMobile, fm }) {
  const s = statusLine(f, hold);
  const planLine = f.plan ? `${PLAN_LABEL[f.plan] ?? f.plan} plan · you get ${fm(f.amountInr)}` : 'No plan chosen yet';
  const avatarTone = f.status === 'sent' || f.status === 'due' ? 'var(--mint)' : f.status === 'held' ? 'var(--amber)' : 'var(--ink-2)';
  const avatar = (
    <span aria-hidden="true" style={sx("flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--line);font:700 13px/1 'Space Grotesk',sans-serif", { color: avatarTone })}>{f.initials}</span>
  );
  const who = (
    <div style={sx('min-width:0')}>
      <div style={sx('font-size:15px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{f.name}</div>
      <div style={sx('margin-top:3px;font-size:12.5px;color:var(--ink-3)')}>{planLine}</div>
    </div>
  );
  const status = (
    <div style={sx(isMobile ? 'min-width:0' : 'text-align:right;min-width:0')}>
      <div style={sx('font-size:13.5px;font-weight:600', { color: s.fg })}>{s.top}</div>
      {s.sub ? <div style={sx('margin-top:3px;font-size:12px;color:var(--ink-3)')}>{s.sub}</div> : null}
      {f.status === 'sent' && f.voucherCode ? (
        <div style={sx(`margin-top:8px;display:flex;align-items:center;gap:8px;${isMobile ? '' : 'justify-content:flex-end'}`)}>
          <code style={sx("font:600 12.5px/1.3 'JetBrains Mono',monospace;color:var(--ink);word-break:break-all")}>{f.voucherCode}</code>
          <CopyButton text={f.voucherCode} ariaLabel={`Copy voucher code for ${f.name}`} />
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <div data-testid="friend-row" style={sx('padding:16px 18px;border-top:1px solid var(--line)')}>
        <div style={sx('display:flex;align-items:center;gap:12px')}>{avatar}{who}</div>
        <div style={sx('margin:14px 0 12px')}><Tracker status={f.status} /></div>
        {status}
      </div>
    );
  }
  return (
    <div data-testid="friend-row" style={sx('display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1.6fr) minmax(0,1.25fr);align-items:center;gap:28px;padding:18px 26px;border-top:1px solid var(--line)')}>
      <div style={sx('display:flex;align-items:center;gap:14px;min-width:0')}>{avatar}{who}</div>
      <Tracker status={f.status} />
      {status}
    </div>
  );
}

export default function ReferPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const isMobile = useIsMobile(640);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canShare] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  const [tab, setTab] = useState('progress');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    getReferralMe({ accessToken: token })
      .then((res) => { if (!cancelled) { if (res?.link) setData(res); else setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [token, attempt]);

  const retry = useCallback(() => { setFailed(false); setData(null); setAttempt((n) => n + 1); }, []);
  const friends = useMemo(() => (Array.isArray(data?.friends) ? data.friends : []), [data]);

  /* Referrers abroad get Amazon in their own store ($); India gets Amazon India (₹).
     Switchable until the first reward exists. */
  const switchCurrency = async (currency) => {
    if (!token || switching) return;
    setSwitching(true);
    try {
      await setReferralCurrency({ accessToken: token, currency });
      const fresh = await getReferralMe({ accessToken: token });
      if (fresh?.link) setData(fresh);
    } catch { /* keep what is shown */ } finally { setSwitching(false); }
  };

  const header = (
    <div style={sx('margin-bottom:16px')}>
      <div style={sx(MONO_LABEL, 'color:var(--mint);margin-bottom:9px')}>Refer a friend</div>
      <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Bring a friend. You both win.</h1>
    </div>
  );

  if (!data) {
    return (
      <div style={sx('max-width:960px')}>
        {header}
        {failed ? (
          <section role="alert" style={sx(`padding:18px 19px;${CARD};display:flex;align-items:center;gap:12px;flex-wrap:wrap`)}>
            <span style={sx('flex:1;min-width:min(220px,100%);font-size:13px;color:var(--ink-2)')}>We couldn&rsquo;t load your referral link just now.</span>
            <button type="button" onClick={retry} style={sx(BTN)}>Try again</button>
          </section>
        ) : <LoadingState />}
      </div>
    );
  }

  const pct = Number(data.friendDiscountPct) || 0;
  const cur = data.voucherCurrency === 'USD' ? 'USD' : 'INR';
  const fm = (n) => formatMoney(n, cur);
  const store = cur === 'USD' ? 'Amazon gift card' : 'Amazon voucher';
  const inProgress = friends.filter((f) => f.status !== 'sent' && f.status !== 'void');
  const paidOut = friends.filter((f) => f.status === 'sent');
  const list = tab === 'paid' ? paidOut : inProgress;
  const tiers = data.rewardsInr ?? {};
  const hold = Number(data.holdDays) || 0;
  const cap = Number(data.annualCapInr) || 0;
  const earned = Number(data.earnedThisFyInr) || 0;
  const stats = data.stats ?? {};
  const pending = money(stats.pending);
  const due = money(stats.due);
  const sent = money(stats.sent);
  const rewards = Array.isArray(data.rewards) ? data.rewards : [];
  const joined = Number(stats.joined) || 0;
  const paid = Number(stats.paid) || 0;
  const capPct = cap > 0 ? Math.min(100, Math.round((earned / cap) * 100)) : 0;
  const capLeft = Math.max(0, cap - earned);
  const started = joined > 0 || rewards.length > 0 || friends.length > 0;

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'TradeGuardX', text: shareMessage(pct), url: data.link });
    } catch { /* dismissed */ }
  };

  return (
    <div style={sx('max-width:960px;min-width:0')}>
      {header}

      {/* Hero: the promise, the ticket, and the link */}
      <section style={sx(`position:relative;overflow:hidden;margin-bottom:16px;${CARD};background:linear-gradient(135deg,var(--mint-tint),transparent 62%),var(--surface)`)}>
        <div style={sx(`display:flex;align-items:center;gap:28px;padding:${isMobile ? '20px 18px 18px' : '26px 28px 22px'}`)}>
          <div style={sx('flex:1;min-width:0')}>
            <div style={sx("font:600 clamp(21px,3.2vw,27px)/1.15 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:var(--ink)")}>
              Give {pct}%. Get up to {fm(tiers.yearly)}.
            </div>
            <p style={sx('margin:8px 0 0;font-size:13.5px;line-height:1.6;color:var(--ink-2);max-width:52ch')}>
              Your friend gets <strong style={sx('color:var(--ink)')}>{pct}% off their first Pro payment</strong> — or the current offer if it&rsquo;s bigger. You get an {store} {hold} days after they pay.
            </p>

            <div style={sx('margin-top:18px;display:flex;align-items:stretch;gap:8px;flex-wrap:wrap')}>
              <div data-testid="referral-link" style={sx("flex:1;min-width:min(240px,100%);display:flex;align-items:center;padding:11px 14px;border:1px solid var(--line-strong);border-radius:11px;background:var(--surface);color:var(--ink);font:500 13px/1.3 'JetBrains Mono',monospace;overflow-wrap:anywhere")}>{data.link}</div>
              <CopyButton text={data.link} label="Copy link" primary ariaLabel="Copy link" />
            </div>
            <div style={sx('margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
              {shareLinks(data.link, pct).map((l) => <ShareButton key={l.id} {...l} />)}
              {canShare ? <button type="button" onClick={nativeShare} style={sx(BTN)}>More…</button> : null}
              {data.code ? (
                <span style={sx('margin-left:auto;font-size:12px;color:var(--ink-3)')}>
                  Code <strong style={sx("padding:3px 7px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink);font-family:'JetBrains Mono',monospace;letter-spacing:.04em")}>{data.code}</strong>
                </span>
              ) : null}
            </div>
          </div>
          {!isMobile ? <VoucherTicket amount={fm(tiers.yearly)} label={store} /> : null}
        </div>
      </section>

      {/* How it works + what each plan earns */}
      <section style={sx(`padding:${isMobile ? '18px' : '20px 22px'};margin-bottom:16px;${CARD}`)}>
        <h3 style={sx(H3)}>How it works</h3>
        <div style={sx('margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px')}>
          <Step n="1" title="Share your link" body="Send it on WhatsApp, Telegram or anywhere. It works on any page of the site." />
          <Step n="2" title="Your friend joins Pro" body={`They get ${pct}% off their first payment, or the live offer if that saves more.`} />
          <Step n="3" title="You get a voucher" body={`${hold} days after they pay, we send your ${store}. It shows up below too.`} />
        </div>
        {isMobile ? <div style={sx(MONO_LABEL, 'margin-top:18px')}>Your voucher, by your friend’s plan</div> : null}
        <div style={sx(`margin-top:${isMobile ? 9 : 18}px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:${isMobile ? 8 : 10}px`)}>
          <TierTile plan="monthly" amount={fm(tiers.monthly)} compact={isMobile} />
          <TierTile plan="quarterly" amount={fm(tiers.quarterly)} compact={isMobile} />
          <TierTile plan="yearly" amount={fm(tiers.yearly)} best compact={isMobile} />
        </div>
        <p style={sx('margin:12px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3)')}>
          One voucher per friend, up to {fm(cap)} a financial year. The 3-day pass and renewals don&rsquo;t count. <Link to="/terms" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Full rules</Link>
        </p>
        <div data-testid="voucher-currency" style={sx('margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2)')}>
          <span style={sx('flex:1;min-width:min(240px,100%)')}>
            Your vouchers: <strong style={sx('color:var(--ink)')}>{cur === 'USD' ? 'Amazon gift card in US dollars, for your country’s Amazon store' : 'Amazon India gift card (₹)'}</strong>
          </span>
          {data.canChangeCurrency ? (
            <button type="button" disabled={switching} onClick={() => switchCurrency(cur === 'USD' ? 'INR' : 'USD')} style={sx('border:0;background:none;padding:0;color:var(--mint);font-size:12.5px;font-weight:700;cursor:pointer', switching ? { opacity: 0.6 } : null)}>
              {switching ? 'Switching…' : cur === 'USD' ? 'I’m in India → use ₹ Amazon India' : 'Outside India? Get $ Amazon instead'}
            </button>
          ) : null}
        </div>
      </section>

      {/* Progress */}
      {started ? (
        <section style={sx(`margin-bottom:16px;${CARD};overflow:hidden`)}>
          <div style={sx('padding:16px 19px 0')}><h3 style={sx(H3)}>Your referrals</h3></div>
          <div data-testid="referral-stats" style={sx('margin-top:12px;display:grid;gap:1px;background:var(--line)', { gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,minmax(0,1fr))' }, ';border-top:1px solid var(--line);border-bottom:1px solid var(--line)')}>
            <Stat label="Friends joined" value={String(joined)} />
            <Stat label="Paid" value={String(paid)} />
            <Stat label="Pending" value={fm(pending.inr)} note={`${pending.count} waiting ${hold} days`} />
            <Stat label="Due" value={fm(due.inr)} note={`${due.count} to send`} />
            {/* Five figures in a two-column phone grid: the last one spans, so no empty cell. */}
            <Stat label="Sent" value={fm(sent.inr)} note={`${sent.count} voucher${sent.count === 1 ? '' : 's'}`} full={isMobile} />
          </div>
          {cap > 0 ? (
            <div style={sx('padding:14px 19px 16px')}>
              <div style={sx('display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2)')}>
                <span style={sx('flex:1;min-width:min(200px,100%)')}>This financial year{data.fy ? ` (${data.fy})` : ''}</span>
                <span><strong style={sx('color:var(--ink)')}>{fm(earned)}</strong> of {fm(cap)}</span>
              </div>
              <div role="progressbar" aria-label="Vouchers this financial year" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={earned} style={sx('margin-top:9px;height:7px;border-radius:999px;background:var(--surface-2);overflow:hidden')}>
                <div style={sx('height:100%;border-radius:999px;background:var(--mint-solid)', { width: `${capPct}%` })} />
              </div>
              <p style={sx('margin:8px 0 0;font-size:11.5px;color:var(--ink-3)')}>
                {capLeft > 0 ? `${fm(capLeft)} left before the yearly limit. The year runs April to March.` : 'You’ve reached the yearly limit. It resets on 1 April.'}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Your friends, step by step */}
      <section style={sx(`${CARD};overflow:hidden`)}>
        {friends.length === 0 ? (
          <div data-testid="referral-empty" style={sx('padding:26px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
            <span aria-hidden="true" style={sx('flex:none;width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:var(--mint-tint);border:1px solid var(--mint-line);color:var(--mint)')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11h16v9H4z" /><path d="M3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-.5S12 7 12 7zM12 7c1.5-3 5-3 5-.5S12 7 12 7z" /></svg>
            </span>
            <div style={sx('flex:1;min-width:min(240px,100%)')}>
              <div style={sx('font-size:14px;font-weight:700;color:var(--ink)')}>Your friends will show up here</div>
              <div style={sx('margin-top:3px;font-size:12.5px;line-height:1.55;color:var(--ink-3)')}>No rewards yet. Share your link — each friend who signs up with it shows here, step by step, until their voucher is sent.</div>
            </div>
            <CopyButton text={data.link} label="Copy your link" ariaLabel="Copy your link" />
          </div>
        ) : (
          <>
            <div style={sx('padding:14px 19px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
              <h3 style={sx(H3, 'flex:1')}>Your friends</h3>
              <div role="tablist" aria-label="Referrals" style={sx('display:inline-flex;padding:3px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line)')}>
                {[['progress', `In progress · ${inProgress.length}`], ['paid', `Paid out · ${paidOut.length}`]].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={sx('border:0;border-radius:999px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer', tab === id ? { background: 'var(--ink)', color: 'var(--surface)' } : { background: 'transparent', color: 'var(--ink-2)' })}>{label}</button>
                ))}
              </div>
            </div>
            {list.length === 0 ? (
              <div style={sx('padding:22px 19px;font-size:13px;color:var(--ink-3)')}>{tab === 'paid' ? 'No vouchers sent yet. They appear here once emailed.' : 'Nothing in progress right now.'}</div>
            ) : (
              <div style={sx('margin-top:-1px')}>{list.map((f) => <FriendRow key={f.id} f={f} hold={hold} isMobile={isMobile} fm={fm} />)}</div>
            )}
          </>
        )}
      </section>

      <RulesFaq pct={pct} tiers={tiers} hold={hold} cap={cap} isMobile={isMobile} fm={fm} cur={cur} />
    </div>
  );
}

/* ─────────────── Rules FAQ ─────────────── */

/** Every rule of the programme as a question, numbers read from the server. */
function referralFaqs({ pct, tiers, hold, cap, fm, cur }) {
  const store = cur === 'USD' ? 'an Amazon gift card in US dollars, for your country’s Amazon store' : 'an Amazon India gift card (₹)';
  return [
    {
      q: 'How much does my friend save?',
      a: `${pct}% off their first Pro payment. If a public offer is running that saves them more (for example a flat ₹299 off on monthly), they get the offer instead. Either way the referral still counts for you, and your link never makes them pay more than they would without it.`,
    },
    {
      q: 'How much do I get?',
      a: `A voucher sized by the plan your friend buys: ${fm(tiers.monthly)} for monthly, ${fm(tiers.quarterly)} for quarterly, ${fm(tiers.yearly)} for yearly. It is ${store}. Referrers in India get ₹200 / ₹400 / ₹1,000 on Amazon India; referrers elsewhere get $3 / $5 / $12 on Amazon.`,
    },
    {
      q: 'When do I get my voucher, and how?',
      a: `${hold} days after your friend’s payment goes through. We email you the gift card code, and it also shows on this page under “Paid out” with a copy button.`,
    },
    {
      q: 'What doesn’t count?',
      a: 'The 3-day pass, renewals, your own link, and friends who already had a Pro plan before. Each friend earns you one voucher, ever — even if they cancel and come back later.',
    },
    {
      q: 'My friend clicked my link but signed up later, or paid on another phone. Does it still count?',
      a: 'Yes. Once they create their account after opening your link, they are tied to you. When they pay later — on any device — the referral is yours.',
    },
    {
      q: 'My friend signed up without my link. Can I add them?',
      a: 'No. A friend is tied to a referrer only when they arrive through a link before signing up, and the first link they used wins. Send your link before they create their account.',
    },
    {
      q: 'Do I need a paid plan to refer someone?',
      a: 'No. Anyone with a TradeGuardX account can share their link and earn vouchers.',
    },
    {
      q: 'Is there a limit?',
      a: `Yes: ${fm(cap)} of vouchers per financial year (April to March). Referrals after that still show here, but vouchers stop until 1 April. If you refer at that pace, talk to us about an affiliate agreement.`,
    },
    {
      q: 'I’m outside India. What do I get?',
      a: `Your friend’s ${pct}% off works wherever they pay, in any currency. Your own vouchers come as an Amazon gift card in US dollars ($3 / $5 / $12) for your country’s Amazon store. We pick ₹ or $ from your account’s timezone; you can switch it on this page until your first reward.`,
    },
    {
      q: 'What if a payment is reversed?',
      a: `Payments are final, but if a payment is charged back or reversed before the voucher is sent, there is no voucher for it. That is why we wait ${hold} days.`,
    },
    {
      q: 'What counts as abuse?',
      a: 'Fake or duplicate accounts, paying for yourself through someone else’s link, or spamming your link where it isn’t welcome. We can withhold vouchers for abuse.',
    },
    {
      q: 'Can these rules change?',
      a: 'They can, with notice in our Terms. A voucher you have already earned is not affected.',
    },
  ];
}

function RulesFaq({ pct, tiers, hold, cap, isMobile, fm, cur }) {
  const items = referralFaqs({ pct, tiers, hold, cap, fm, cur });
  return (
    <section data-testid="referral-faq" style={sx(`margin-top:18px;${CARD};overflow:hidden`)}>
      <div style={sx(`padding:${isMobile ? '18px' : '24px 26px 18px'}`)}>
        <h3 style={sx(H3, 'font-size:19px')}>Questions about the rules</h3>
        <p style={sx('margin:6px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-3)')}>Everything about how referrals and vouchers work. Tap a question to open it.</p>
      </div>
      <div>
        {items.map((it) => (
          <details key={it.q} className="tgx-faq" style={sx('border-top:1px solid var(--line)')}>
            <summary style={sx(`list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:${isMobile ? '15px 18px' : '17px 26px'};font-size:14.5px;font-weight:600;color:var(--ink)`)}>
              <span style={sx('flex:1;min-width:0')}>{it.q}</span>
              <span aria-hidden="true" className="tgx-faq__chev" style={sx('flex:none;color:var(--ink-3);transition:transform .15s ease')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </summary>
            <p style={sx(`margin:0;padding:${isMobile ? '0 18px 16px' : '0 26px 18px'};font-size:13.5px;line-height:1.65;color:var(--ink-2);max-width:86ch`)}>{it.a}</p>
          </details>
        ))}
      </div>
      <div style={sx(`padding:${isMobile ? '14px 18px' : '14px 26px'};border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)`)}>
        Still unsure? <Link to="/dashboard/support" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Ask us</Link> · <Link to="/terms" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Full terms</Link>
      </div>
    </section>
  );
}
