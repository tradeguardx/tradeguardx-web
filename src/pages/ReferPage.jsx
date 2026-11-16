import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReferralMe } from '../api/referralApi';
import { useIsMobile } from '../hooks/useIsMobile';
import { sx } from '../components/dashboard/shell/sx';

/**
 * /dashboard/refer — Refer a trader.
 *
 * Everything comes from GET /payments/referral/me: the link, reward sizes,
 * wait, yearly cap and one row per friend from signup to voucher. The copy
 * reads those numbers rather than restating them, so a server change cannot
 * leave the page promising something else.
 *
 * Rules (owner, 16 Nov 2026): the friend gets 10% off their first Pro payment
 * or the live offer if bigger; the referrer gets an Amazon voucher sized by the
 * friend's plan, 3 days after they pay, capped per financial year. Friends are
 * shown as "Rahul M." — never a full name.
 *
 * NO VERDICT BEFORE DATA: until the response lands the page shows its own
 * shape, never zeros; a failed load says so and offers a retry.
 */

const CARD = 'border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-card)';
const MONO = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase";
const H3 = "margin:0;font:600 17px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink)";
const BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);color:var(--ink);font-size:13.5px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap';
const STRIPES = 'repeating-linear-gradient(-45deg,var(--mint-solid) 0 4px,transparent 4px 8px)';
const STRIPES_AMBER = 'repeating-linear-gradient(-45deg,var(--amber-solid) 0 4px,transparent 4px 8px)';

const PLAN_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function shortDate(iso, withDay = false) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('en-IN', withDay ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}

/** 1 Apr after the FY "2026-27" ends. */
function fyResetLabel(fy) {
  const y = Number(String(fy ?? '').slice(0, 4));
  return Number.isFinite(y) && y > 2000 ? `resets 1 Apr ${y + 1}` : 'resets 1 April';
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
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
  } catch { return false; }
}

function useCopied() {
  const [state, setState] = useState('idle');
  useEffect(() => {
    if (state === 'idle') return undefined;
    const t = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(t);
  }, [state]);
  return [state, async (text) => setState((await copyText(text)) ? 'copied' : 'failed')];
}

function CopyButton({ text, label = 'Copy', ariaLabel, style }) {
  const [state, copy] = useCopied();
  return (
    <button type="button" aria-label={ariaLabel} onClick={() => copy(text)} style={sx(BTN, 'padding:8px 13px;font-size:12.5px;border-radius:10px', style)}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}
    </button>
  );
}

/** The pre-filled message, in the way trading groups talk. Editable before sending. */
function defaultMessage(pct, link) {
  return `Bhai ye try kar — daily loss limit set kar, limit tooti to ye khud positions close karke account lock kar deta hai. Browser band ho tab bhi chalta hai, kyunki server pe chalta hai. Mere link se pehle Pro payment pe ${pct}% off milega: ${link}`;
}

const ICON = {
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  wa: 'M5 19l1.1-3.3A7 7 0 1 1 8.6 18zM9.3 8.6c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c.5.9 1.2 1.6 2.1 2.1l.5-.5c.1-.1.3-.2.4-.1l1.4.6c.2.1.3.2.3.4v.4c0 .3-.1.6-.4.8-.5.4-1.2.5-1.9.3-2-.6-3.6-2.2-4.2-4.2-.2-.7-.1-1.4.3-1.9z',
  tg: 'M20 4.5L3.8 10.8c-.6.2-.6 1.1 0 1.3l3.9 1.3 1.5 4.6c.2.5.8.6 1.1.2l2.2-2.2 4 3c.4.3 1 .1 1.1-.4L20.9 5.4c.1-.6-.4-1.1-.9-.9zM9.5 13.5l7-5.5',
  x: 'M5 5l14 14M19 5L5 19',
  brief: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
};

function Glyph({ d, size = 16, stroke = 'currentColor', w = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ─────────────── Hero visual: three vouchers, fanned ─────────────── */

function VoucherCard({ amount, plan, hero, style }) {
  return (
    <div style={sx('position:absolute;width:172px;height:196px;border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden', hero
      ? { background: 'linear-gradient(150deg,color-mix(in srgb,var(--mint-solid) 70%,#fff),var(--mint-solid))', color: 'var(--on-mint)', boxShadow: '0 24px 48px -20px color-mix(in srgb,var(--mint-solid) 70%,transparent)' }
      : { background: 'var(--surface-2)', border: '1px solid var(--line-strong)', color: 'var(--ink)', boxShadow: '0 18px 36px -22px rgba(0,0,0,.45)' }, style)}>
      <span aria-hidden="true" style={sx('position:absolute;right:-34px;top:-34px;width:96px;height:96px;border-radius:50%;border:1.5px solid currentColor;opacity:.16')} />
      <span aria-hidden="true" style={sx('position:absolute;right:-14px;top:-14px;width:56px;height:56px;border-radius:50%;border:1.5px solid currentColor;opacity:.16')} />
      <div style={sx(MONO, 'letter-spacing:.2em;opacity:.75')}>Amazon</div>
      <div>
        <div style={sx("font:700 30px/1 'Space Grotesk',sans-serif;letter-spacing:-.04em")}>{amount}</div>
        <div style={sx('margin-top:7px;font-size:13px;font-weight:700')}>{plan}</div>
        <div style={sx('margin-top:2px;font-size:11px;opacity:.7')}>friend&rsquo;s plan</div>
      </div>
    </div>
  );
}

function VoucherStack({ tiers, pct }) {
  return (
    <div aria-hidden="true" style={sx('position:relative;width:420px;height:330px;flex:none')}>
      <VoucherCard amount={inr(tiers.monthly)} plan="Monthly" style={{ left: 0, top: 26, transform: 'rotate(-7deg)' }} />
      <VoucherCard amount={inr(tiers.quarterly)} plan="Quarterly" style={{ left: 118, top: 46, transform: 'rotate(-2deg)' }} />
      <VoucherCard amount={inr(tiers.yearly)} plan="Yearly" hero style={{ left: 232, top: 70, transform: 'rotate(5deg)' }} />
      <div style={sx('position:absolute;left:30px;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border-radius:999px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:0 12px 28px -16px rgba(0,0,0,.4)')}>
        <span style={sx("width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:var(--surface);font:700 11.5px/1 'Space Grotesk',sans-serif")}>{pct}%</span>
        <span style={sx('font-size:12.5px;line-height:1.3;color:var(--ink-2)')}><strong style={sx('color:var(--ink)')}>Your friend saves</strong><br />on their first payment</span>
      </div>
    </div>
  );
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

function FriendRow({ f, hold, isMobile }) {
  const s = statusLine(f, hold);
  const planLine = f.plan ? `${PLAN_LABEL[f.plan] ?? f.plan} plan · you get ${inr(f.amountInr)}` : 'No plan chosen yet';
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

/* ─────────────── Loading ─────────────── */

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
      <section style={sx(`padding:32px;margin-bottom:18px;${CARD}`)}>
        <Skel h={22} w="min(180px,50%)" r={999} />
        <Skel h={44} w="min(420px,90%)" style={{ marginTop: 20 }} />
        <Skel h={44} w="min(360px,80%)" style={{ marginTop: 10 }} />
        <Skel h={52} r={14} style={{ marginTop: 26, maxWidth: 720 }} />
      </section>
      <section style={sx(`padding:26px;${CARD}`)}>
        <Skel h={12} w="min(200px,60%)" />
        <Skel h={30} w="min(120px,40%)" style={{ marginTop: 14 }} />
      </section>
    </div>
  );
}

/* ─────────────── Page ─────────────── */

export default function ReferPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const isMobile = useIsMobile(760);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState('progress');
  const [message, setMessage] = useState(null);
  const [copiedLink, copyLink] = useCopied();
  const [copiedMsg, copyMsg] = useCopied();
  const [canShare] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function');

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
  const inProgress = friends.filter((f) => f.status !== 'sent' && f.status !== 'void');
  const paidOut = friends.filter((f) => f.status === 'sent');

  if (!data) {
    return (
      <div style={sx('max-width:1180px')}>
        {failed ? (
          <section role="alert" style={sx(`padding:20px 22px;${CARD};display:flex;align-items:center;gap:12px;flex-wrap:wrap`)}>
            <span style={sx('flex:1;min-width:min(220px,100%);font-size:13.5px;color:var(--ink-2)')}>We couldn&rsquo;t load your referral link just now.</span>
            <button type="button" onClick={retry} style={sx(BTN)}>Try again</button>
          </section>
        ) : <LoadingState />}
      </div>
    );
  }

  const pct = Number(data.friendDiscountPct) || 0;
  const tiers = data.rewardsInr ?? {};
  const hold = Number(data.holdDays) || 0;
  const cap = Number(data.annualCapInr) || 0;
  const earned = Number(data.earnedThisFyInr) || 0;
  const onTheWay = Number(data.onTheWayInr) || 0;
  const stats = data.stats ?? {};
  const joined = Number(stats.joined) || 0;
  const qualified = Number(stats.qualified ?? 0) || 0;
  const capReached = Boolean(data.capReached) || (cap > 0 && earned >= cap);
  const earnedPct = cap > 0 ? Math.min(100, (earned / cap) * 100) : 0;
  const wayPct = cap > 0 ? Math.min(100 - earnedPct, (onTheWay / cap) * 100) : 0;
  const msg = message ?? defaultMessage(pct, data.link);
  const shortLink = data.link.replace(/^https?:\/\//, '');
  const list = tab === 'paid' ? paidOut : inProgress;
  const msgNoLink = msg.replace(data.link, '').trim();

  const share = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(msgNoLink)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msgNoLink)}&url=${encodeURIComponent(data.link)}`,
  };
  const nativeShare = async () => { try { await navigator.share({ title: 'TradeGuardX', text: msg }); } catch { /* dismissed */ } };

  return (
    <div style={sx('max-width:1180px;min-width:0')}>
      {/* ── Hero ── */}
      <section style={sx(`position:relative;overflow:hidden;margin-bottom:18px;${CARD}`, {
        backgroundImage: 'radial-gradient(circle at 85% 20%,var(--mint-tint),transparent 45%),linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)',
        backgroundSize: 'auto,36px 36px,36px 36px',
      })}>
        <div style={sx(`display:flex;align-items:center;gap:24px;padding:${isMobile ? '26px 20px 22px' : '40px 40px 34px'}`)}>
          <div style={sx('flex:1;min-width:0')}>
            <span style={sx(MONO, 'display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;border:1px solid var(--mint-line);background:var(--surface);color:var(--mint);letter-spacing:.18em')}>
              <span style={sx('width:6px;height:6px;border-radius:50%;background:var(--mint-solid)')} />Referral programme
            </span>
            <h1 style={sx(`margin:22px 0 0;font:700 ${isMobile ? '34px' : '50px'}/1.04 'Space Grotesk',sans-serif;letter-spacing:-.045em;color:var(--ink)`)}>
              Give {pct}% off.<br />Get up to <span style={sx('color:var(--mint)')}>{inr(tiers.yearly)}</span>.
            </h1>
            <p style={sx('margin:18px 0 0;font-size:15px;line-height:1.6;color:var(--ink-2);max-width:48ch')}>
              Send your link to a trader who keeps breaking their daily limit. When they pay for Pro, we email you an Amazon voucher.
            </p>

            <div style={sx('margin-top:26px;max-width:720px;display:flex;align-items:center;gap:10px;padding:7px 7px 7px 16px;border:1px solid var(--line-strong);border-radius:16px;background:var(--surface)')}>
              <span style={sx('flex:none;color:var(--ink-3)')}><Glyph d={ICON.link} /></span>
              <span data-testid="referral-link" title={data.link} style={sx("flex:1;min-width:0;font:500 14.5px/1.3 'JetBrains Mono',monospace;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {shortLink.replace(data.code, '')}<strong style={sx('color:var(--ink)')}>{data.code}</strong>
              </span>
              <button type="button" aria-label="Copy link" onClick={() => copyLink(data.link)} style={sx('flex:none;display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border:0;border-radius:11px;background:var(--ink);color:var(--surface);font-size:14px;font-weight:700;cursor:pointer')}>
                <Glyph d={ICON.copy} size={15} />{copiedLink === 'copied' ? 'Copied' : copiedLink === 'failed' ? 'Select and copy' : 'Copy link'}
              </button>
            </div>

            <div style={sx('margin-top:12px;max-width:720px;display:grid;gap:10px', { gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 1fr auto auto' })}>
              <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" style={sx(BTN, 'border:0;padding:15px 18px;font-size:15px;background:var(--mint-solid);color:var(--on-mint);box-shadow:var(--glow-mint)', isMobile ? { gridColumn: '1 / -1' } : null)}>
                <Glyph d={ICON.wa} size={18} />Share on WhatsApp
              </a>
              <a href={share.telegram} target="_blank" rel="noopener noreferrer" style={sx(BTN, 'padding:15px 18px;font-size:15px')}><Glyph d={ICON.tg} size={17} />Telegram</a>
              <a href={share.x} target="_blank" rel="noopener noreferrer" aria-label="Share on X" style={sx(BTN, 'padding:15px 16px')}><Glyph d={ICON.x} size={15} w={2.4} />{isMobile ? 'X' : null}</a>
              {canShare && !isMobile ? <button type="button" onClick={nativeShare} style={sx(BTN, 'padding:15px 16px')}>More…</button> : null}
            </div>
          </div>
          {!isMobile ? <VoucherStack tiers={tiers} pct={pct} /> : null}
        </div>

        {/* The message we pre-fill */}
        <div style={sx(`border-top:1px solid var(--line);padding:${isMobile ? '18px 20px 20px' : '24px 40px 28px'};background:color-mix(in srgb,var(--surface) 70%,transparent)`)}>
          <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap;max-width:1000px')}>
            <span style={sx(MONO, 'flex:1;color:var(--ink-faint)')}>The message we pre-fill</span>
            <button type="button" onClick={() => copyMsg(msg)} style={sx('border:0;background:none;padding:0;color:var(--mint);font-size:13px;font-weight:700;cursor:pointer')}>{copiedMsg === 'copied' ? 'Copied' : 'Copy message'}</button>
          </div>
          <div style={sx('margin-top:12px;display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap;max-width:1000px')}>
            <textarea
              aria-label="Message to send with your link"
              value={msg}
              onChange={(e) => setMessage(e.target.value)}
              rows={isMobile ? 6 : 4}
              style={sx('flex:1.6;min-width:min(320px,100%);resize:vertical;padding:16px 18px;border:1px solid var(--line-strong);border-radius:14px;background:var(--surface);color:var(--ink);font-size:14.5px;line-height:1.6;font-family:inherit')}
            />
            <p style={sx('flex:1;min-width:min(220px,100%);margin:4px 0 0;font-size:13px;line-height:1.6;color:var(--ink-3)')}>
              Written the way trading groups talk. Edit it before you send — WhatsApp and Telegram use what&rsquo;s here. Your link keeps your credit either way.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats + yearly limit ── */}
      <section style={sx(`margin-bottom:18px;${CARD};overflow:hidden`, capReached ? { borderColor: 'var(--amber-line)' } : null)}>
        <div data-testid="referral-stats" style={sx('display:grid;gap:1px;background:var(--line)', { gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,minmax(0,1fr))' })}>
          {[
            { label: 'Invited', value: String(joined), note: 'Signed up through your link' },
            { label: 'Qualified', value: String(qualified), note: qualified ? `Paid and past the ${hold}-day wait` : 'None yet' },
            { label: 'Earned this year', value: inr(earned), note: capReached ? 'The yearly maximum' : onTheWay > 0 ? `${inr(onTheWay)} more on its way` : 'Amazon vouchers, emailed to you', accent: earned > 0, full: isMobile },
          ].map((s) => (
            <div key={s.label} style={sx(`padding:${isMobile ? '18px' : '24px 28px'};background:var(--surface);min-width:0`, s.full ? { gridColumn: '1 / -1' } : null)}>
              <div style={sx(MONO, 'color:var(--ink-faint)')}>{s.label}</div>
              <div style={sx(`margin-top:12px;font:700 ${isMobile ? '28px' : '36px'}/1 'Space Grotesk',sans-serif;letter-spacing:-.04em`, { color: s.accent ? 'var(--mint)' : 'var(--ink)' })}>{s.value}</div>
              <div style={sx('margin-top:8px;font-size:12.5px;color:var(--ink-3)')}>{s.note}</div>
            </div>
          ))}
        </div>
        {cap > 0 ? (
          <div style={sx(`padding:${isMobile ? '16px 18px 18px' : '20px 28px 22px'};border-top:1px solid var(--line)`, capReached ? { background: 'var(--amber-tint)' } : null)}>
            <div style={sx('display:flex;align-items:baseline;gap:12px;flex-wrap:wrap')}>
              <span style={sx('flex:1;min-width:min(220px,100%);font-size:14px;color:var(--ink-2)')}><strong style={sx("color:var(--ink);font:700 16px/1 'Space Grotesk',sans-serif")}>{inr(earned)}</strong> of {inr(cap)} yearly limit</span>
              <span style={sx(MONO, 'color:var(--ink-faint);letter-spacing:.1em')}>FY {data.fy} · {fyResetLabel(data.fy)}</span>
            </div>
            <div role="progressbar" aria-label="Vouchers this financial year" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={earned} style={sx('margin-top:12px;height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden;display:flex')}>
              <div style={sx('height:100%', { width: `${earnedPct}%`, background: capReached ? 'var(--amber-solid)' : 'var(--mint-solid)' })} />
              {wayPct > 0 && !capReached ? <div style={sx('height:100%', { width: `${wayPct}%`, background: STRIPES })} /> : null}
            </div>
            <p style={sx('margin:10px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-3)')}>
              {capReached
                ? 'You’ve reached this year’s limit. New referrals still track and show below, but vouchers stop until the year resets.'
                : `${inr(Math.max(0, cap - earned))} left before the yearly limit.${wayPct > 0 ? ' Striped = on its way.' : ''} The year runs April to March.`}
            </p>
          </div>
        ) : null}
      </section>

      {/* ── Cap reached: the proper arrangement ── */}
      {capReached ? (
        <section style={sx(`margin-bottom:18px;padding:${isMobile ? '18px' : '22px 26px'};${CARD};display:flex;align-items:center;gap:18px;flex-wrap:wrap`)}>
          <span style={sx('flex:none;width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:var(--ink);color:var(--surface)')}><Glyph d={ICON.brief} size={19} /></span>
          <div style={sx('flex:1;min-width:min(260px,100%)')}>
            <div style={sx('font-size:16px;font-weight:700;color:var(--ink)')}>You&rsquo;re sending us a lot of traders. Let&rsquo;s do this properly.</div>
            <div style={sx('margin-top:4px;font-size:13.5px;line-height:1.55;color:var(--ink-3);max-width:72ch')}>Vouchers stop at {inr(cap)} a year. Beyond that we offer a written affiliate agreement with negotiated rates, paid properly. It suits group admins and anyone referring at this pace.</div>
          </div>
          <Link to="/dashboard/support" style={sx(BTN, 'background:var(--ink);color:var(--surface);border-color:var(--ink)')}>Talk to us</Link>
        </section>
      ) : null}

      {/* ── Your referrals ── */}
      <section style={sx(`margin-bottom:18px;${CARD};overflow:hidden`)}>
        <div style={sx(`display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:${isMobile ? '18px' : '22px 26px'}`)}>
          <h3 style={sx(H3, 'flex:1;font-size:19px')}>Your referrals</h3>
          {friends.length ? (
            <div role="tablist" aria-label="Referrals" style={sx('display:inline-flex;padding:4px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line)')}>
              {[['progress', `In progress · ${inProgress.length}`], ['paid', `Paid out · ${paidOut.length}`]].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={sx('border:0;border-radius:999px;padding:8px 15px;font-size:13px;font-weight:600;cursor:pointer', tab === id ? { background: 'var(--ink)', color: 'var(--surface)' } : { background: 'transparent', color: 'var(--ink-2)' })}>{label}</button>
              ))}
            </div>
          ) : null}
        </div>
        {friends.length === 0 ? (
          <div data-testid="referral-empty" style={sx(`border-top:1px solid var(--line);padding:${isMobile ? '22px 18px' : '30px 26px'};display:flex;align-items:center;gap:16px;flex-wrap:wrap`)}>
            <div style={sx('flex:1;min-width:min(260px,100%)')}>
              <div style={sx('font-size:15px;font-weight:700;color:var(--ink)')}>No referrals yet</div>
              <div style={sx('margin-top:4px;font-size:13px;line-height:1.55;color:var(--ink-3)')}>Share your link. Each friend who signs up shows here, step by step, until their voucher is sent.</div>
            </div>
            <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" style={sx(BTN, 'border:0;background:var(--mint-solid);color:var(--on-mint)')}><Glyph d={ICON.wa} />Share on WhatsApp</a>
          </div>
        ) : list.length === 0 ? (
          <div style={sx('border-top:1px solid var(--line);padding:26px;font-size:13px;color:var(--ink-3)')}>{tab === 'paid' ? 'No vouchers sent yet. They appear here once emailed.' : 'Nothing in progress right now.'}</div>
        ) : (
          <div>{list.map((f) => <FriendRow key={f.id} f={f} hold={hold} isMobile={isMobile} />)}</div>
        )}
      </section>

      {/* ── When does a referral count? ── */}
      <section style={sx(`${CARD};overflow:hidden`)}>
        <div style={sx(`padding:${isMobile ? '18px' : '24px 26px 20px'}`)}>
          <h3 style={sx(H3, 'font-size:19px')}>When does a referral count?</h3>
          <p style={sx('margin:6px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-3);max-width:80ch')}>Signing up isn&rsquo;t enough on its own. These three have to happen, which is why each row above shows what it&rsquo;s still waiting on.</p>
        </div>
        <div style={sx('display:grid;gap:1px;background:var(--line);border-top:1px solid var(--line)', { gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))' })}>
          {[
            ['They sign up with your link', 'Your link works on any page of the site. A friend is tied to the first link they sign up with.'],
            ['They pay for Pro', `Monthly earns ${inr(tiers.monthly)}, quarterly ${inr(tiers.quarterly)}, yearly ${inr(tiers.yearly)}. The ₹199 3-day pass and renewals don’t count, and nor do friends who already had Pro.`],
            [`${hold} days pass`, `Then we email you an Amazon voucher. One per friend, up to ${inr(cap)} a financial year.`],
          ].map(([title, body], i) => (
            <div key={title} style={sx(`padding:${isMobile ? '16px 18px' : '22px 24px'};background:var(--surface)`)}>
              <div style={sx('display:flex;align-items:center;gap:10px')}>
                <span style={sx("flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2);font:700 12px/1 'Space Grotesk',sans-serif")}>{i + 1}</span>
                <span style={sx('font-size:15px;font-weight:600;color:var(--ink)')}>{title}</span>
              </div>
              <p style={sx('margin:9px 0 0;font-size:13px;line-height:1.6;color:var(--ink-3)')}>{body}</p>
            </div>
          ))}
        </div>
        <div style={sx(`padding:${isMobile ? '14px 18px' : '14px 26px'};border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)`)}>
          Your friend gets {pct}% off their first Pro payment, or the current offer if it&rsquo;s bigger — never more than without your link. <Link to="/terms" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Full rules</Link>
        </div>
      </section>
    </div>
  );
}
